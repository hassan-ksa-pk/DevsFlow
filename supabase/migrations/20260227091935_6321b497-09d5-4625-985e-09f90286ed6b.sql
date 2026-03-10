
CREATE TABLE public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credits integer NOT NULL DEFAULT 5,
  max_credits integer NOT NULL DEFAULT 10,
  last_daily_reset timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own credits" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credits" ON public.user_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  username text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  verified boolean NOT NULL DEFAULT false
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access verification codes" ON public.verification_codes FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, max_credits)
  VALUES (NEW.id, 5, 10);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

CREATE OR REPLACE FUNCTION public.get_or_reset_credits(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_credits integer;
  v_last_reset timestamp with time zone;
BEGIN
  SELECT uc.credits, uc.last_daily_reset INTO v_credits, v_last_reset
  FROM public.user_credits uc WHERE uc.user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, credits) VALUES (p_user_id, 5);
    RETURN 5;
  END IF;
  
  IF v_last_reset::date < now()::date THEN
    UPDATE public.user_credits 
    SET credits = LEAST(v_credits + 5, 10), last_daily_reset = now()
    WHERE user_id = p_user_id
    RETURNING credits INTO v_credits;
  END IF;
  
  RETURN v_credits;
END;
$$;

CREATE OR REPLACE FUNCTION public.use_credit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM public.get_or_reset_credits(p_user_id);
  
  UPDATE public.user_credits 
  SET credits = credits - 1
  WHERE user_id = p_user_id AND credits > 0;
  
  RETURN FOUND;
END;
$$;
