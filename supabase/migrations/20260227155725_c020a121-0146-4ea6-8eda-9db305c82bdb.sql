
-- Add profile enhancements
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_instructions text DEFAULT '',
ADD COLUMN IF NOT EXISTS about text DEFAULT '',
ADD COLUMN IF NOT EXISTS vibe_level integer DEFAULT 1;

-- Create courses table
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goal text NOT NULL,
  language text NOT NULL,
  skill_level text NOT NULL DEFAULT 'beginner',
  quiz_results jsonb DEFAULT '[]'::jsonb,
  plan jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = user_id);

-- Create course lessons table
CREATE TABLE public.course_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  lesson_index integer NOT NULL DEFAULT 0,
  content text DEFAULT '',
  is_test boolean DEFAULT false,
  completed boolean DEFAULT false,
  generated boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lessons" ON public.course_lessons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own lessons" ON public.course_lessons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lessons" ON public.course_lessons FOR UPDATE USING (auth.uid() = user_id);

-- Update credits: change default to 10 and max to 20
ALTER TABLE public.user_credits ALTER COLUMN credits SET DEFAULT 10;
ALTER TABLE public.user_credits ALTER COLUMN max_credits SET DEFAULT 20;

-- Update the get_or_reset_credits function to give 10 daily credits with max 20
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
    INSERT INTO public.user_credits (user_id, credits, max_credits) VALUES (p_user_id, 10, 20);
    RETURN 10;
  END IF;
  
  IF v_last_reset::date < now()::date THEN
    UPDATE public.user_credits 
    SET credits = LEAST(v_credits + 10, 20), last_daily_reset = now()
    WHERE user_id = p_user_id
    RETURNING credits INTO v_credits;
  END IF;
  
  RETURN v_credits;
END;
$$;

-- Update handle_new_user_credits to use 10/20
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits, max_credits)
  VALUES (NEW.id, 10, 20);
  RETURN NEW;
END;
$$;
