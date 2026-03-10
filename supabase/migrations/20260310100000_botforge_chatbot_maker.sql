-- BotForge-style chatbot maker schema for DevsFlow.
-- This is intentionally additive (no changes to existing DevsFlow tables like public.projects).

-- Enums (guarded to avoid errors if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chatbot_mode') THEN
    CREATE TYPE public.chatbot_mode AS ENUM ('standard', 'n8n', 'advanced_http');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chatbot_theme') THEN
    CREATE TYPE public.chatbot_theme AS ENUM ('minimal', 'glass', 'dark', 'modern_ai');
  END IF;
END $$;

-- updated_at helper (used by multiple tables below)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Core project table (supports multiple bots per user)
CREATE TABLE IF NOT EXISTS public.chatbot_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bot_name TEXT NOT NULL DEFAULT 'My Chatbot',
  bot_description TEXT,
  system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
  theme public.chatbot_theme NOT NULL DEFAULT 'minimal',
  mode public.chatbot_mode NOT NULL DEFAULT 'standard',
  avatar_url TEXT,
  api_key TEXT NOT NULL DEFAULT ('bot_' || replace(gen_random_uuid()::text, '-', '')),
  webhook_url TEXT,
  landing_page_enabled BOOLEAN NOT NULL DEFAULT false,
  web_search_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatbot_projects_user_id_idx ON public.chatbot_projects(user_id);

DROP TRIGGER IF EXISTS update_chatbot_projects_updated_at ON public.chatbot_projects;
CREATE TRIGGER update_chatbot_projects_updated_at
  BEFORE UPDATE ON public.chatbot_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Models available to a bot (and optionally selectable in exported HTML)
CREATE TABLE IF NOT EXISTS public.chatbot_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.chatbot_projects(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  api_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT NOT NULL DEFAULT 'selectable' CHECK (visibility IN ('selectable', 'locked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatbot_models_project_id_idx ON public.chatbot_models(project_id);

DROP TRIGGER IF EXISTS update_chatbot_models_updated_at ON public.chatbot_models;
CREATE TRIGGER update_chatbot_models_updated_at
  BEFORE UPDATE ON public.chatbot_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Advanced HTTP mode actions
CREATE TABLE IF NOT EXISTS public.custom_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.chatbot_projects(id) ON DELETE CASCADE NOT NULL,
  action_name TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,
  request_url TEXT NOT NULL,
  http_method TEXT NOT NULL DEFAULT 'POST',
  headers JSONB DEFAULT '{}'::jsonb,
  body_template JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_actions_project_id_idx ON public.custom_actions(project_id);

DROP TRIGGER IF EXISTS update_custom_actions_updated_at ON public.custom_actions;
CREATE TRIGGER update_custom_actions_updated_at
  BEFORE UPDATE ON public.custom_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat logs for bot conversations
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.chatbot_projects(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_logs_project_id_idx ON public.chat_logs(project_id);

-- Knowledge base
CREATE TABLE IF NOT EXISTS public.knowledge_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.chatbot_projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  content_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_web_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.chatbot_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content_text TEXT,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_files_project_id_idx ON public.knowledge_files(project_id);
CREATE INDEX IF NOT EXISTS knowledge_web_pages_project_id_idx ON public.knowledge_web_pages(project_id);

-- Bot tools & variables
CREATE TABLE IF NOT EXISTS public.bot_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.chatbot_projects(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  http_method TEXT NOT NULL DEFAULT 'POST',
  request_url TEXT NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bot_tool_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID NOT NULL REFERENCES public.bot_tools(id) ON DELETE CASCADE,
  param_name TEXT NOT NULL,
  param_type TEXT NOT NULL DEFAULT 'string',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT 'body',
  required BOOLEAN NOT NULL DEFAULT true,
  default_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bot_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.chatbot_projects(id) ON DELETE CASCADE,
  var_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  default_value TEXT,
  scope TEXT NOT NULL DEFAULT 'session',
  bot_writable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_tools_project_id_idx ON public.bot_tools(project_id);
CREATE INDEX IF NOT EXISTS bot_tool_parameters_tool_id_idx ON public.bot_tool_parameters(tool_id);
CREATE INDEX IF NOT EXISTS bot_variables_project_id_idx ON public.bot_variables(project_id);

DROP TRIGGER IF EXISTS update_bot_tools_updated_at ON public.bot_tools;
CREATE TRIGGER update_bot_tools_updated_at
  BEFORE UPDATE ON public.bot_tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bot_variables_updated_at ON public.bot_variables;
CREATE TRIGGER update_bot_variables_updated_at
  BEFORE UPDATE ON public.bot_variables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ToolsManager also includes a "tasks & goals" area.
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  type TEXT NOT NULL DEFAULT 'task',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_tasks_user_id_idx ON public.user_tasks(user_id);

DROP TRIGGER IF EXISTS update_user_tasks_updated_at ON public.user_tasks;
CREATE TRIGGER update_user_tasks_updated_at
  BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.chatbot_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_web_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_tool_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DROP POLICY IF EXISTS "Users can view own chatbot projects" ON public.chatbot_projects;
CREATE POLICY "Users can view own chatbot projects"
  ON public.chatbot_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chatbot projects" ON public.chatbot_projects;
CREATE POLICY "Users can insert own chatbot projects"
  ON public.chatbot_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chatbot projects" ON public.chatbot_projects;
CREATE POLICY "Users can update own chatbot projects"
  ON public.chatbot_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chatbot projects" ON public.chatbot_projects;
CREATE POLICY "Users can delete own chatbot projects"
  ON public.chatbot_projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Helper for "owned project"
CREATE OR REPLACE FUNCTION public.is_owner_of_chatbot_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chatbot_projects
    WHERE id = p_project_id AND user_id = auth.uid()
  );
$$;

-- chatbot_models
DROP POLICY IF EXISTS "Users can view own chatbot models" ON public.chatbot_models;
CREATE POLICY "Users can view own chatbot models"
  ON public.chatbot_models FOR SELECT TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can insert own chatbot models" ON public.chatbot_models;
CREATE POLICY "Users can insert own chatbot models"
  ON public.chatbot_models FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can update own chatbot models" ON public.chatbot_models;
CREATE POLICY "Users can update own chatbot models"
  ON public.chatbot_models FOR UPDATE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can delete own chatbot models" ON public.chatbot_models;
CREATE POLICY "Users can delete own chatbot models"
  ON public.chatbot_models FOR DELETE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

-- custom_actions
DROP POLICY IF EXISTS "Users can view own custom actions" ON public.custom_actions;
CREATE POLICY "Users can view own custom actions"
  ON public.custom_actions FOR SELECT TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can insert own custom actions" ON public.custom_actions;
CREATE POLICY "Users can insert own custom actions"
  ON public.custom_actions FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can update own custom actions" ON public.custom_actions;
CREATE POLICY "Users can update own custom actions"
  ON public.custom_actions FOR UPDATE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can delete own custom actions" ON public.custom_actions;
CREATE POLICY "Users can delete own custom actions"
  ON public.custom_actions FOR DELETE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

-- chat_logs (read-only for users; inserts happen via edge function/service role)
DROP POLICY IF EXISTS "Users can view own chat logs" ON public.chat_logs;
CREATE POLICY "Users can view own chat logs"
  ON public.chat_logs FOR SELECT TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can insert own chat logs" ON public.chat_logs;
CREATE POLICY "Users can insert own chat logs"
  ON public.chat_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of_chatbot_project(project_id));

-- knowledge_files
DROP POLICY IF EXISTS "Users can view own KB files" ON public.knowledge_files;
CREATE POLICY "Users can view own KB files"
  ON public.knowledge_files FOR SELECT TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can insert own KB files" ON public.knowledge_files;
CREATE POLICY "Users can insert own KB files"
  ON public.knowledge_files FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can delete own KB files" ON public.knowledge_files;
CREATE POLICY "Users can delete own KB files"
  ON public.knowledge_files FOR DELETE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

-- knowledge_web_pages
DROP POLICY IF EXISTS "Users can view own KB pages" ON public.knowledge_web_pages;
CREATE POLICY "Users can view own KB pages"
  ON public.knowledge_web_pages FOR SELECT TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can insert own KB pages" ON public.knowledge_web_pages;
CREATE POLICY "Users can insert own KB pages"
  ON public.knowledge_web_pages FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can delete own KB pages" ON public.knowledge_web_pages;
CREATE POLICY "Users can delete own KB pages"
  ON public.knowledge_web_pages FOR DELETE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can update own KB pages" ON public.knowledge_web_pages;
CREATE POLICY "Users can update own KB pages"
  ON public.knowledge_web_pages FOR UPDATE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

-- bot_tools
DROP POLICY IF EXISTS "Users can view own bot tools" ON public.bot_tools;
CREATE POLICY "Users can view own bot tools"
  ON public.bot_tools FOR SELECT TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can insert own bot tools" ON public.bot_tools;
CREATE POLICY "Users can insert own bot tools"
  ON public.bot_tools FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can update own bot tools" ON public.bot_tools;
CREATE POLICY "Users can update own bot tools"
  ON public.bot_tools FOR UPDATE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can delete own bot tools" ON public.bot_tools;
CREATE POLICY "Users can delete own bot tools"
  ON public.bot_tools FOR DELETE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

-- bot_tool_parameters
DROP POLICY IF EXISTS "Users can view own bot tool parameters" ON public.bot_tool_parameters;
CREATE POLICY "Users can view own bot tool parameters"
  ON public.bot_tool_parameters FOR SELECT TO authenticated
  USING (tool_id IN (SELECT id FROM public.bot_tools WHERE public.is_owner_of_chatbot_project(project_id)));

DROP POLICY IF EXISTS "Users can insert own bot tool parameters" ON public.bot_tool_parameters;
CREATE POLICY "Users can insert own bot tool parameters"
  ON public.bot_tool_parameters FOR INSERT TO authenticated
  WITH CHECK (tool_id IN (SELECT id FROM public.bot_tools WHERE public.is_owner_of_chatbot_project(project_id)));

DROP POLICY IF EXISTS "Users can update own bot tool parameters" ON public.bot_tool_parameters;
CREATE POLICY "Users can update own bot tool parameters"
  ON public.bot_tool_parameters FOR UPDATE TO authenticated
  USING (tool_id IN (SELECT id FROM public.bot_tools WHERE public.is_owner_of_chatbot_project(project_id)));

DROP POLICY IF EXISTS "Users can delete own bot tool parameters" ON public.bot_tool_parameters;
CREATE POLICY "Users can delete own bot tool parameters"
  ON public.bot_tool_parameters FOR DELETE TO authenticated
  USING (tool_id IN (SELECT id FROM public.bot_tools WHERE public.is_owner_of_chatbot_project(project_id)));

-- bot_variables
DROP POLICY IF EXISTS "Users can view own bot variables" ON public.bot_variables;
CREATE POLICY "Users can view own bot variables"
  ON public.bot_variables FOR SELECT TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can insert own bot variables" ON public.bot_variables;
CREATE POLICY "Users can insert own bot variables"
  ON public.bot_variables FOR INSERT TO authenticated
  WITH CHECK (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can update own bot variables" ON public.bot_variables;
CREATE POLICY "Users can update own bot variables"
  ON public.bot_variables FOR UPDATE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

DROP POLICY IF EXISTS "Users can delete own bot variables" ON public.bot_variables;
CREATE POLICY "Users can delete own bot variables"
  ON public.bot_variables FOR DELETE TO authenticated
  USING (public.is_owner_of_chatbot_project(project_id));

-- user_tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON public.user_tasks;
CREATE POLICY "Users can view own tasks"
  ON public.user_tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.user_tasks;
CREATE POLICY "Users can insert own tasks"
  ON public.user_tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.user_tasks;
CREATE POLICY "Users can update own tasks"
  ON public.user_tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.user_tasks;
CREATE POLICY "Users can delete own tasks"
  ON public.user_tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage buckets used by CreateBotWizard/KnowledgeBase
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-files', 'knowledge-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (keep simple: authenticated users can CRUD their objects)
DO $$
BEGIN
  -- Avatars
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'devsflow_avatars_insert') THEN
    EXECUTE 'CREATE POLICY devsflow_avatars_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''avatars'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'devsflow_avatars_select') THEN
    EXECUTE 'CREATE POLICY devsflow_avatars_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''avatars'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'devsflow_avatars_delete') THEN
    EXECUTE 'CREATE POLICY devsflow_avatars_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''avatars'')';
  END IF;

  -- Knowledge files
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'devsflow_kb_insert') THEN
    EXECUTE 'CREATE POLICY devsflow_kb_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''knowledge-files'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'devsflow_kb_select') THEN
    EXECUTE 'CREATE POLICY devsflow_kb_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''knowledge-files'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'devsflow_kb_delete') THEN
    EXECUTE 'CREATE POLICY devsflow_kb_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''knowledge-files'')';
  END IF;
END $$;
