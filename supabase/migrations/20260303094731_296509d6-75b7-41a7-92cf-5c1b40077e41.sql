
-- Fix the get_or_reset_credits function: FOUND flag was referencing user_plans query instead of user_credits
CREATE OR REPLACE FUNCTION public.get_or_reset_credits(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_credits integer;
  v_groq integer;
  v_advanced integer;
  v_last_reset timestamp with time zone;
  v_plan text;
  v_has_credits boolean;
BEGIN
  -- Check user_credits first and store FOUND separately
  SELECT uc.credits, uc.groq_credits, uc.advanced_credits, uc.last_daily_reset 
  INTO v_credits, v_groq, v_advanced, v_last_reset
  FROM public.user_credits uc WHERE uc.user_id = p_user_id;
  
  v_has_credits := FOUND;
  
  -- Get user plan
  SELECT COALESCE(up.plan, 'free') INTO v_plan
  FROM public.user_plans up WHERE up.user_id = p_user_id;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  
  -- If no credits row, create one
  IF NOT v_has_credits THEN
    IF v_plan = 'pro' THEN
      INSERT INTO public.user_credits (user_id, credits, max_credits, groq_credits, advanced_credits) 
      VALUES (p_user_id, 25, 25, 25, 10);
      RETURN 25;
    ELSE
      INSERT INTO public.user_credits (user_id, credits, max_credits, groq_credits, advanced_credits) 
      VALUES (p_user_id, 10, 20, 10, 3);
      RETURN 10;
    END IF;
  END IF;
  
  -- Daily reset check
  IF v_last_reset::date < now()::date THEN
    IF v_plan = 'pro' THEN
      UPDATE public.user_credits 
      SET groq_credits = 25, advanced_credits = 10, credits = 25, last_daily_reset = now()
      WHERE user_id = p_user_id;
    ELSE
      UPDATE public.user_credits 
      SET groq_credits = 10, advanced_credits = 3, credits = 10, last_daily_reset = now()
      WHERE user_id = p_user_id;
    END IF;
  END IF;
  
  RETURN v_credits;
END;
$function$;

-- Also fix use_credit_typed to ensure credits row exists before decrementing
CREATE OR REPLACE FUNCTION public.use_credit_typed(p_user_id uuid, p_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Ensure credits row exists and is reset if needed
  PERFORM public.get_or_reset_credits(p_user_id);
  
  IF p_type = 'advanced' THEN
    UPDATE public.user_credits 
    SET advanced_credits = advanced_credits - 1
    WHERE user_id = p_user_id AND advanced_credits > 0;
  ELSE
    UPDATE public.user_credits 
    SET groq_credits = groq_credits - 1
    WHERE user_id = p_user_id AND groq_credits > 0;
  END IF;
  
  RETURN FOUND;
END;
$function$;

-- Create triggers for auto-creating user_plans and user_credits on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.user_plans (user_id, plan) VALUES (NEW.id, 'free')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, max_credits, groq_credits, advanced_credits)
  VALUES (NEW.id, 10, 20, 10, 3)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Drop triggers if they exist, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created_plan ON auth.users;
CREATE TRIGGER on_auth_user_created_plan AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();
