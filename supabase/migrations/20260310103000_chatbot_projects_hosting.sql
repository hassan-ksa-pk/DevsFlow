-- Hosting/public URL support for chatbot projects.

ALTER TABLE public.chatbot_projects
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_html text;

-- Unique slug (ignore nulls so older rows without a slug don't block migration)
CREATE UNIQUE INDEX IF NOT EXISTS chatbot_projects_slug_unique
  ON public.chatbot_projects (slug)
  WHERE slug IS NOT NULL;

