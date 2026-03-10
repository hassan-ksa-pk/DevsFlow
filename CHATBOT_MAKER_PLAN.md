# DevsFlow ChatBot Maker - Complete Implementation Plan

## 🎯 Overview
The ChatBot Maker is a comprehensive feature that allows DevsFlow users to create, customize, and export standalone AI chatbots with multiple integration options and design themes.

**Important Notes:**
- Google Sign up/in doesn't work on `https://devsflow.netlify.app/` (Lovable team will fix this)
- All projects, flows, and chatbots will be tied to their user owner with proper permissions
- Only the owner can view their private projects and chatbots

---

## 📊 Database Schema Changes

### New Tables

#### `chatbots`
```sql
CREATE TABLE public.chatbots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful AI assistant.',
  theme TEXT NOT NULL DEFAULT 'modern',
  landing_page_enabled BOOLEAN DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'n8n')),
  api_provider TEXT DEFAULT 'lovable' CHECK (api_provider IN ('lovable', 'groq', 'openrouter')),
  api_key_encrypted TEXT,
  model_id TEXT,
  custom_actions JSONB DEFAULT '[]',
  knowledge_urls TEXT[] DEFAULT '{}',
  design_config JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  slug TEXT UNIQUE,
  -- Enhanced fields for user customization
  user_display_name TEXT,
  user_about TEXT,
  custom_instructions TEXT,
  font_size TEXT DEFAULT 'medium',
  models_locked BOOLEAN DEFAULT false,
  available_models TEXT[] DEFAULT '{}',
  variable_references JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chatbots" ON public.chatbots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chatbots" ON public.chatbots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chatbots" ON public.chatbots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chatbots" ON public.chatbots FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public chatbots are viewable by all" ON public.chatbots FOR SELECT USING (is_public = true);
```

#### `chatbot_messages`
```sql
CREATE TABLE public.chatbot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chatbot messages" ON public.chatbot_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chatbot messages" ON public.chatbot_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### `chatbot_analytics`
```sql
CREATE TABLE public.chatbot_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('message_sent', 'page_view', 'export_download')),
  session_id TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chatbot_analytics ENABLE ROW LEVEL SECURITY;
```

---

## 🏗️ Frontend Architecture

### New Pages & Components

#### 1. ChatBot Maker Main Page (`/chatbot-maker`)
- **Location**: `src/pages/ChatBotMaker.tsx`
- **Purpose**: Dashboard for managing chatbots
- **Features**: 
  - Chatbot cards display (limit: 1 per user initially)
  - Create new chatbot button
  - Export/download functionality
  - Usage statistics

#### 2. ChatBot Editor (`/chatbot-maker/new` and `/chatbot-maker/edit/:id`)
- **Location**: `src/pages/ChatBotEditor.tsx`
- **Purpose**: Create/edit chatbot configuration
- **Features**:
  - Multi-step form with tabs
  - Real-time preview
  - Theme selection
  - AI configuration

#### 3. ChatBot Preview (`/chatbot-maker/preview/:id`)
- **Location**: `src/pages/ChatBotPreview.tsx`
- **Purpose**: Test chatbot before export
- **Features**:
  - Interactive chat interface
  - Theme preview
  - Debug panel

#### 4. Public ChatBot View (`/bot/:slug`)
- **Location**: `src/pages/PublicBotView.tsx`
- **Purpose**: Public-facing chatbot interface
- **Features**:
  - Landing page (if enabled)
  - Chat interface
  - Settings panel

### Key Components

#### `ChatBotCard.tsx`
```typescript
interface ChatBotCardProps {
  chatbot: ChatBot;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onPreview: (id: string) => void;
}
```

#### `ChatBotForm.tsx`
```typescript
interface ChatBotFormProps {
  chatbot?: Partial<ChatBot>;
  onSave: (chatbot: ChatBot) => void;
  onCancel: () => void;
}
```

#### `ThemeSelector.tsx`
```typescript
interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
}
```

#### `AIProviderConfig.tsx`
```typescript
interface AIProviderConfigProps {
  provider: 'lovable' | 'groq' | 'openrouter';
  config: AIConfig;
  onConfigChange: (config: AIConfig) => void;
}
```

#### `KnowledgeBaseManager.tsx`
```typescript
interface KnowledgeBaseManagerProps {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
}
```

---

## 🎨 Design System & Themes

### Available Themes

#### 1. **Minimal Theme**
- Clean, simple interface
- Monochrome color scheme
- Focus on typography
- Subtle animations

#### 2. **Glass Theme**
- Glassmorphism effects
- Blur backgrounds
- Gradient accents
- Smooth transitions

#### 3. **Dark Theme**
- Dark background with high contrast
- Neon accent colors
- Bold typography
- Sci-fi aesthetic

#### 4. **Modern AI Theme**
- Gradient backgrounds
- Floating elements
- Animated particles
- Tech-forward design

### Theme Configuration Structure
```typescript
interface ThemeConfig {
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
```

---

## 🤖 AI Integration System

### Provider Architecture

#### Lovable AI (Default)
```typescript
interface LovableConfig {
  apiKey: string; // Provided by platform
  model: string;
  baseUrl: string;
}
```

#### Groq Integration
```typescript
interface GroqConfig {
  apiKey: string; // User-provided
  model: string;
  baseUrl: string;
  models: string[];
}
```

#### OpenRouter Integration
```typescript
interface OpenRouterConfig {
  apiKey: string; // User-provided
  model: string;
  baseUrl: string;
  models: string[];
}
```

### N8N Integration
```typescript
interface N8NConfig {
  webhookUrl: string;
  headers: Record<string, string>;
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
}
```

### Custom Actions System
```typescript
interface CustomAction {
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
  variables?: Record<string, any>; // @variable references
}
```

### @ Variable Reference System
**Variables are predefined by the bot creator, but the bot can also replace them dynamically.**

Users can reference variables using `@variable_name` syntax in:
- System prompts for dynamic behavior
- Custom action URLs and body templates
- Response mappings
- Knowledge base queries

#### Default Variables (Always Available)
- `@username` - Current user's display name
- `@custom_instructions` - User's custom instructions
- `@current_message` - The latest user message
- `@chat_log` - Current session chat messages
- `@chat_history` - Full conversation history
- `@bot_name` - The chatbot's name
- `@bot_description` - The chatbot's description

#### Creator-Defined Variables
Bot creators can define additional custom variables that will be available for replacement.

```typescript
interface VariableReference {
  name: string;
  type: 'system' | 'custom' | 'user_input' | 'api_response';
  defaultValue?: string;
  description: string;
  required: boolean;
  creatorDefined: boolean; // true for custom variables by creator
  replaceable: boolean; // true if bot can replace this variable
}
```

---

## 📚 Knowledge Base System

### URL Crawling Process
1. **URL Validation**: Check if URL is accessible
2. **Content Extraction**: Extract text content using readability algorithm
3. **Text Processing**: Clean and format content
4. **Vectorization**: Convert to embeddings for semantic search
5. **Storage**: Store in Supabase with metadata

### Implementation
```typescript
interface KnowledgeBaseEntry {
  id: string;
  chatbot_id: string;
  url: string;
  title: string;
  content: string;
  summary: string;
  embeddings?: number[];
  last_updated: timestamp;
}
```

### Search & Retrieval
```typescript
interface KnowledgeSearchResult {
  content: string;
  source: string;
  relevance: number;
  snippet: string;
}
```

---

## 💳 Credits System

### Credit Management
```typescript
interface CreditConfig {
  defaultCredits: 30; // Daily credits
  creditsPerMessage: 1;
  creditResetInterval: 'daily';
}
```

### Credit Tracking
- Track messages per chatbot
- Deduct 1 credit per message
- Daily reset at midnight
- Show remaining credits in dashboard
- Allow credit purchase/upgrade

---

## 📦 HTML Export System

### Export Architecture
```typescript
interface ExportConfig {
  chatbot: ChatBot;
  theme: ThemeConfig;
  userSettings: UserSettings;
  includeAnalytics: boolean;
  customBranding: boolean;
}
```

### Generated HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{chatbot.name} - AI Assistant</title>
  <style>{theme CSS}</style>
</head>
<body>
  <div id="app">
    <!-- Landing Page (if enabled) -->
    <section id="landing" class="landing-page">
      <!-- Dynamic landing content -->
    </section>
    
    <!-- Chat Interface -->
    <section id="chat" class="chat-interface">
      <div class="chat-container">
        <div class="chat-header">
          <img src="{avatar}" alt="{name}" class="bot-avatar">
          <h1>{name}</h1>
        </div>
        <div class="chat-messages" id="messages">
          <!-- Messages will be inserted here -->
        </div>
        <div class="chat-input">
          <textarea id="user-input" placeholder="Type your message..."></textarea>
          <button id="send-btn">Send</button>
        </div>
      </div>
      
      <!-- Settings Panel -->
      <div class="settings-panel" id="settings">
        <!-- User-configurable settings -->
      </div>
    </section>
  </div>
  
  <script>{chatbot logic}</script>
</body>
</html>
```

### JavaScript Features
- **AI Integration**: Connect to selected AI provider
- **Message History**: Local storage for conversations
- **Settings Management**: User preferences (font size, theme, custom instructions)
- **Theme Switching**: Dynamic theme changes
- **Analytics**: Usage tracking (if enabled)
- **@ Variable System**: Dynamic variable replacement in responses
- **Model Selection**: Dropdown for available models (if not locked)
- **User Profile**: Editable display name and about section

---

## 🔧 Technical Implementation Details

### File Structure
```
src/
├── pages/
│   ├── ChatBotMaker.tsx
│   ├── ChatBotEditor.tsx
│   ├── ChatBotPreview.tsx
│   └── PublicBotView.tsx
├── components/
│   ├── chatbot/
│   │   ├── ChatBotCard.tsx
│   │   ├── ChatBotForm.tsx
│   │   ├── ThemeSelector.tsx
│   │   ├── AIProviderConfig.tsx
│   │   ├── KnowledgeBaseManager.tsx
│   │   ├── ChatInterface.tsx
│   │   └── ExportDialog.tsx
│   └── themes/
│       ├── MinimalTheme.tsx
│       ├── GlassTheme.tsx
│       ├── DarkTheme.tsx
│       └── ModernAITheme.tsx
├── lib/
│   ├── chatbot-export.ts
│   ├── knowledge-crawler.ts
│   ├── ai-providers.ts
│   └── theme-generator.ts
└── hooks/
    ├── useChatBot.ts
    ├── useKnowledgeBase.ts
    └── useCredits.ts
```

### API Endpoints

#### Supabase Functions
```typescript
// functions/v1/chatbot-export
export async function exportChatbot(req: Request) {
  // Generate HTML file
  // Apply theme
  // Include user settings
  // Return downloadable file
}

// functions/v1/knowledge-crawl
export async function crawlUrl(req: Request) {
  // Extract content from URL
  // Process and clean text
  // Store in database
  // Return summary
}

// functions/v1/chatbot-chat
export async function chatWithBot(req: Request) {
  // Handle chat message
  // Connect to AI provider
  // Apply custom actions
  // Track credits
  // Return response
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Database schema implementation with user ownership
- [ ] Basic chatbot CRUD operations (1 bot per user limit)
- [ ] Simple chat interface with @ variable support
- [ ] Lovable AI integration
- [ ] Basic theme system (Minimal, Glass, Dark, Modern AI)
- [ ] User authentication and permissions setup

### Phase 2: Advanced Features (Week 3-4)
- [ ] Multi-provider AI integration (Groq, OpenRouter)
- [ ] Knowledge base crawling
- [ ] Custom actions system
- [ ] Theme customization
- [ ] Credits system

### Phase 3: Export & Publishing (Week 5-6)
- [ ] HTML export functionality
- [ ] Public bot pages
- [ ] Analytics system
- [ ] Advanced themes
- [ ] N8N integration

### Phase 4: Polish & Optimization (Week 7-8)
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Advanced customization
- [ ] Testing & bug fixes
- [ ] Documentation

---

## 📋 User Flow

### Create ChatBot Flow
1. User navigates to `/chatbot-maker`
2. Clicks "Create New ChatBot"
3. Fills in basic info (name, description)
4. Selects theme and customization
5. Configures AI provider
6. Adds knowledge base URLs
7. Sets up custom actions
8. Previews chatbot
9. Saves and exports

### Export Flow
1. User clicks "Export" on chatbot card
2. Selects export options
3. System generates HTML file
4. File downloads automatically
5. User can deploy anywhere

### Public Bot Flow
1. User enables "Make Public"
2. System generates unique slug
3. Bot available at `/bot/:slug`
4. Visitors can chat with bot
5. Analytics tracked for owner

---

## 🔒 Security Considerations

### API Key Management
- Encrypt API keys in database
- Never expose keys in frontend
- Use Supabase functions for API calls
- Implement key rotation

### Content Security
- Sanitize knowledge base content
- Prevent XSS in chat messages
- Rate limiting for public bots
- Content moderation system

### Data Privacy
- GDPR compliance
- User data deletion
- Analytics opt-out
- Secure file uploads

---

## 📊 Analytics & Metrics

### Tracked Events
- Chatbot creation
- Message exchanges
- Export downloads
- Theme changes
- Provider switches
- Knowledge base updates

### Dashboard Metrics
- Active chatbots
- Messages per day
- Credit usage
- Popular themes
- Export statistics

---

## 🎯 Success Metrics

### Technical KPIs
- Chatbot creation time < 5 minutes
- Export generation < 30 seconds
- 99.9% uptime for public bots
- < 100ms response time for AI calls

### User Engagement
- 80% of users create at least one chatbot
- 60% export their chatbots
- 40% make chatbots public
- Average 10+ messages per chatbot

---

## 🔮 Future Enhancements

### Advanced Features
- Multi-language support
- Voice chat integration
- Custom domain hosting
- Team collaboration
- Advanced analytics
- Bot marketplace

### Monetization
- Premium themes
- Advanced AI models
- Custom branding
- Priority support
- API access

---

## 📝 Conclusion

The ChatBot Maker feature will transform DevsFlow into a comprehensive chatbot creation platform, enabling users to create sophisticated AI assistants with minimal technical knowledge. The modular architecture ensures scalability while the extensive customization options provide flexibility for diverse use cases.

This implementation plan provides a solid foundation for building a world-class chatbot creation tool that integrates seamlessly with the existing DevsFlow ecosystem while opening new revenue streams and user engagement opportunities.