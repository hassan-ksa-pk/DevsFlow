-- Allow anonymous read access for published chatbots (hosted HTML)
ALTER TABLE public.chatbot_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published chatbots" ON public.chatbot_projects;
CREATE POLICY "Public can view published chatbots"
  ON public.chatbot_projects
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND custom_html IS NOT NULL);
