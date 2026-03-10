
-- Update get_or_reset_credits to give 15 daily credits instead of 10
CREATE OR REPLACE FUNCTION public.get_or_reset_credits(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_credits integer;
  v_last_reset timestamp with time zone;
BEGIN
  SELECT uc.credits, uc.last_daily_reset INTO v_credits, v_last_reset
  FROM public.user_credits uc WHERE uc.user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, credits, max_credits) VALUES (p_user_id, 15, 20);
    RETURN 15;
  END IF;
  
  IF v_last_reset::date < now()::date THEN
    UPDATE public.user_credits 
    SET credits = LEAST(v_credits + 15, 20), last_daily_reset = now()
    WHERE user_id = p_user_id
    RETURNING credits INTO v_credits;
  END IF;
  
  RETURN v_credits;
END;
$function$;

-- Update handle_new_user_credits to start with 15
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, max_credits)
  VALUES (NEW.id, 15, 20);
  RETURN NEW;
END;
$function$;
