CREATE TABLE public.saved_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flows" ON public.saved_flows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flows" ON public.saved_flows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flows" ON public.saved_flows FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flows" ON public.saved_flows FOR DELETE TO authenticated USING (auth.uid() = user_id);