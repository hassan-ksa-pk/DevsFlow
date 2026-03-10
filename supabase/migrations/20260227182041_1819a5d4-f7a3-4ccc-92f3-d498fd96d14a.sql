
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_snippet TEXT NOT NULL,
  extra_instructions TEXT DEFAULT '',
  result TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-oss-20b',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.analysis_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.analysis_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.analysis_history FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_analysis_history_user ON public.analysis_history(user_id, created_at DESC);
