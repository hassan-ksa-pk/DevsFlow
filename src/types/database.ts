export type SubscriptionTier = 'free' | 'plus' | 'pro';
export type ChatbotMode = 'standard' | 'n8n' | 'advanced_http';
export type ChatbotTheme = 'minimal' | 'glass' | 'dark' | 'modern_ai';

export interface Profile {
  id: string;
  display_name: string | null;
  company: string | null;
  bio: string | null;
  avatar_url: string | null;
  daily_credits: number;
  credits_reset_at: string;
  subscription_tier: SubscriptionTier;
  assistant_provider: string | null;
  assistant_model: string | null;
  assistant_api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotProject {
  id: string;
  user_id: string;
  bot_name: string;
  bot_description: string | null;
  system_prompt: string | null;
  theme: ChatbotTheme;
  mode: ChatbotMode;
  avatar_url: string | null;
  api_key: string;
  webhook_url: string | null;
  landing_page_enabled: boolean;
  web_search_enabled: boolean;
  slug?: string | null;
  is_public?: boolean;
  custom_html?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotModel {
  id: string;
  project_id: string;
  provider: string;
  model_name: string;
  api_key: string | null;
  is_active: boolean;
  visibility: 'selectable' | 'locked';
  created_at: string;
  updated_at: string;
}

export interface CustomAction {
  id: string;
  project_id: string;
  action_name: string;
  trigger_condition: string;
  request_url: string;
  http_method: string;
  headers: Record<string, string>;
  body_template: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatLog {
  id: string;
  project_id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreditUsage {
  id: string;
  user_id: string;
  credits_used: number;
  action_type: string;
  created_at: string;
}
