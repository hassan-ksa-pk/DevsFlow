// Enhanced types for botforge integration
export interface ChatBotModel {
  id: string;
  project_id: string;
  provider: string;
  model_name: string;
  api_key?: string;
  visibility: 'selectable' | 'locked';
  is_active: boolean;
  created_at: string;
}

export interface CustomAction {
  id: string;
  project_id: string;
  action_name: string;
  description: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  request_url: string;
  headers?: Record<string, string>;
  body_template?: string;
  parameters?: ActionParameter[];
  trigger_condition?: string;
  created_at: string;
}

export interface ActionParameter {
  param_name: string;
  param_type: 'string' | 'number' | 'boolean';
  description: string;
  location: 'body' | 'query' | 'header';
  required: boolean;
  default_value?: string;
}

export interface KnowledgeEntry {
  id: string;
  project_id: string;
  url: string;
  title: string;
  content: string;
  summary: string;
  last_updated: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export interface BotforgeProject {
  id: string;
  user_id: string;
  bot_name: string;
  bot_description?: string;
  avatar_url?: string;
  system_prompt?: string;
  theme: 'minimal' | 'glass' | 'dark' | 'modern_ai';
  mode: 'standard' | 'n8n' | 'advanced_http';
  webhook_url?: string;
  landing_page_enabled: boolean;
  web_search_enabled?: boolean;
  custom_css?: string;
  custom_html?: string;
  custom_js?: string;
  api_key: string;
  created_at: string;
  updated_at: string;
}

// Merge with existing ChatBot type
export interface EnhancedChatBot extends ChatBot {
  // Botforge specific fields
  models: ChatBotModel[];
  actions: CustomAction[];
  knowledge: KnowledgeEntry[];
  webhook_url?: string;
  web_search_enabled?: boolean;
  custom_css?: string;
  custom_html?: string;
  custom_js?: string;
  ui_shape?: 'rounded' | 'sharp';
}