
-- Add publishing columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug for published projects
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_unique ON public.projects (slug) WHERE slug IS NOT NULL;

-- Allow public read access to published projects
CREATE POLICY "Anyone can view published projects"
ON public.projects
FOR SELECT
USING (published = true);
