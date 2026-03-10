export interface ChatBot {
  id: string;
  user_id: string;
  name: string;
  description: string;
  avatar_url: string;
  system_prompt: string;
  theme: 'minimal' | 'glass' | 'dark' | 'modern-ai';
  landing_page_enabled: boolean;
  mode: 'standard' | 'n8n';
  api_provider: 'lovable' | 'groq' | 'openrouter';
  api_key_encrypted?: string;
  model_id: string;
  custom_actions: CustomAction[];
  knowledge_urls: string[];
  design_config: ThemeConfig;
  is_public: boolean;
  slug: string;
  user_display_name: string;
  user_about: string;
  custom_instructions: string;
  font_size: 'small' | 'medium' | 'large';
  models_locked: boolean;
  available_models: string[];
  variable_references: VariableReference[];
  created_at: string;
  updated_at: string;
}

export interface CustomAction {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  bodyTemplate?: string;
  responseMapping?: Record<string, string>;
  trigger: 'keyword' | 'intent' | 'manual';
  triggerValue?: string;
  variables?: Record<string, any>;
}

export interface VariableReference {
  name: string;
  type: 'system' | 'custom' | 'user_input' | 'api_response';
  defaultValue?: string;
  description: string;
  required: boolean;
  creatorDefined: boolean;
  replaceable: boolean;
}

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    headingFont: string;
  };
  animations: {
    enabled: boolean;
    duration: string;
    easing: string;
  };
  layout: {
    borderRadius: string;
    spacing: string;
    sidebarWidth: string;
  };
}

export interface ChatBotMessage {
  id: string;
  chatbot_id: string;
  user_id?: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ChatBotAnalytics {
  id: string;
  chatbot_id: string;
  event_type: 'message_sent' | 'page_view' | 'export_download';
  session_id?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CreditConfig {
  defaultCredits: 30;
  creditsPerMessage: 1;
  creditResetInterval: 'daily';
}

export interface UserCredits {
  userId: string;
  credits: number;
  lastReset: string;
  dailyLimit: number;
}