
-- Create user_plans table for free/pro plan management
CREATE TABLE public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);

-- Add groq_credits and advanced_credits columns to user_credits
ALTER TABLE public.user_credits
  ADD COLUMN groq_credits integer NOT NULL DEFAULT 10,
  ADD COLUMN advanced_credits integer NOT NULL DEFAULT 3;

-- Update get_or_reset_credits to reset both credit types based on plan
CREATE OR REPLACE FUNCTION public.get_or_reset_credits(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_credits integer;
  v_groq integer;
  v_advanced integer;
  v_last_reset timestamp with time zone;
  v_plan text;
BEGIN
  SELECT uc.credits, uc.groq_credits, uc.advanced_credits, uc.last_daily_reset 
  INTO v_credits, v_groq, v_advanced, v_last_reset
  FROM public.user_credits uc WHERE uc.user_id = p_user_id;
  
  -- Get user plan
  SELECT COALESCE(up.plan, 'free') INTO v_plan
  FROM public.user_plans up WHERE up.user_id = p_user_id;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  
  IF NOT FOUND THEN
    IF v_plan = 'pro' THEN
      INSERT INTO public.user_credits (user_id, credits, max_credits, groq_credits, advanced_credits) 
      VALUES (p_user_id, 25, 25, 25, 10);
    ELSE
      INSERT INTO public.user_credits (user_id, credits, max_credits, groq_credits, advanced_credits) 
      VALUES (p_user_id, 10, 20, 10, 3);
    END IF;
    RETURN 10;
  END IF;
  
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
$$;

-- New function to use a specific credit type
CREATE OR REPLACE FUNCTION public.use_credit_typed(p_user_id uuid, p_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
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
$$;

-- Function to get full credit info
CREATE OR REPLACE FUNCTION public.get_credits_info(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_result json;
  v_plan text;
BEGIN
  PERFORM public.get_or_reset_credits(p_user_id);
  
  SELECT COALESCE(up.plan, 'free') INTO v_plan
  FROM public.user_plans up WHERE up.user_id = p_user_id;
  IF v_plan IS NULL THEN v_plan := 'free'; END IF;
  
  SELECT json_build_object(
    'groq_credits', uc.groq_credits,
    'advanced_credits', uc.advanced_credits,
    'plan', v_plan
  ) INTO v_result
  FROM public.user_credits uc WHERE uc.user_id = p_user_id;
  
  IF v_result IS NULL THEN
    v_result := json_build_object('groq_credits', 10, 'advanced_credits', 3, 'plan', 'free');
  END IF;
  
  RETURN v_result;
END;
$$;

-- Auto-create plan row for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();
