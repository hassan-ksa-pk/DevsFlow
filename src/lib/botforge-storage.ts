import { ChatBotModel, CustomAction, KnowledgeEntry, BotforgeProject, EnhancedChatBot } from '@/types/botforge';
import { ChatBotStorage } from './chatbot-storage';

export class BotforgeStorage {
  // Models Management
  static async getModels(projectId: string): Promise<ChatBotModel[]> {
    const models = this.getItem<ChatBotModel[]>('botforge_models') || [];
    return models.filter(model => model.project_id === projectId);
  }

  static async addModel(model: Omit<ChatBotModel, 'id' | 'created_at'>): Promise<ChatBotModel> {
    const models = this.getItem<ChatBotModel[]>('botforge_models') || [];
    const newModel: ChatBotModel = {
      ...model,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };
    models.push(newModel);
    this.setItem('botforge_models', models);
    return newModel;
  }

  static async updateModel(modelId: string, updates: Partial<ChatBotModel>): Promise<ChatBotModel> {
    const models = this.getItem<ChatBotModel[]>('botforge_models') || [];
    const index = models.findIndex(model => model.id === modelId);
    if (index === -1) throw new Error('Model not found');
    
    models[index] = { ...models[index], ...updates };
    this.setItem('botforge_models', models);
    return models[index];
  }

  static async deleteModel(modelId: string): Promise<void> {
    const models = this.getItem<ChatBotModel[]>('botforge_models') || [];
    const filtered = models.filter(model => model.id !== modelId);
    this.setItem('botforge_models', filtered);
  }

  static async setActiveModel(projectId: string, modelId: string): Promise<void> {
    const models = this.getItem<ChatBotModel[]>('botforge_models') || [];
    models.forEach(model => {
      if (model.project_id === projectId) {
        model.is_active = model.id === modelId;
      }
    });
    this.setItem('botforge_models', models);
  }

  // Actions Management
  static async getActions(projectId: string): Promise<CustomAction[]> {
    const actions = this.getItem<CustomAction[]>('botforge_actions') || [];
    return actions.filter(action => action.project_id === projectId);
  }

  static async addAction(action: Omit<CustomAction, 'id' | 'created_at'>): Promise<CustomAction> {
    const actions = this.getItem<CustomAction[]>('botforge_actions') || [];
    const newAction: CustomAction = {
      ...action,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };
    actions.push(newAction);
    this.setItem('botforge_actions', actions);
    return newAction;
  }

  static async updateAction(actionId: string, updates: Partial<CustomAction>): Promise<CustomAction> {
    const actions = this.getItem<CustomAction[]>('botforge_actions') || [];
    const index = actions.findIndex(action => action.id === actionId);
    if (index === -1) throw new Error('Action not found');
    
    actions[index] = { ...actions[index], ...updates };
    this.setItem('botforge_actions', actions);
    return actions[index];
  }

  static async deleteAction(actionId: string): Promise<void> {
    const actions = this.getItem<CustomAction[]>('botforge_actions') || [];
    const filtered = actions.filter(action => action.id !== actionId);
    this.setItem('botforge_actions', filtered);
  }

  // Knowledge Base Management
  static async getKnowledge(projectId: string): Promise<KnowledgeEntry[]> {
    const knowledge = this.getItem<KnowledgeEntry[]>('botforge_knowledge') || [];
    return knowledge.filter(entry => entry.project_id === projectId);
  }

  static async addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'created_at' | 'last_updated'>): Promise<KnowledgeEntry> {
    const knowledge = this.getItem<KnowledgeEntry[]>('botforge_knowledge') || [];
    const newEntry: KnowledgeEntry = {
      ...entry,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      status: 'pending',
    };
    knowledge.push(newEntry);
    this.setItem('botforge_knowledge', knowledge);
    return newEntry;
  }

  static async updateKnowledge(entryId: string, updates: Partial<KnowledgeEntry>): Promise<KnowledgeEntry> {
    const knowledge = this.getItem<KnowledgeEntry[]>('botforge_knowledge') || [];
    const index = knowledge.findIndex(entry => entry.id === entryId);
    if (index === -1) throw new Error('Knowledge entry not found');
    
    knowledge[index] = { ...knowledge[index], ...updates, last_updated: new Date().toISOString() };
    this.setItem('botforge_knowledge', knowledge);
    return knowledge[index];
  }

  static async deleteKnowledge(entryId: string): Promise<void> {
    const knowledge = this.getItem<KnowledgeEntry[]>('botforge_knowledge') || [];
    const filtered = knowledge.filter(entry => entry.id !== entryId);
    this.setItem('botforge_knowledge', filtered);
  }

  // Enhanced ChatBot Management
  static async getEnhancedChatBot(id: string): Promise<EnhancedChatBot | null> {
    const chatbot = await ChatBotStorage.getChatBot(id);
    if (!chatbot) return null;

    const [models, actions, knowledge] = await Promise.all([
      this.getModels(id),
      this.getActions(id),
      this.getKnowledge(id),
    ]);

    return {
      ...chatbot,
      models,
      actions,
      knowledge,
      webhook_url: chatbot.webhook_url || '',
      web_search_enabled: chatbot.web_search_enabled || false,
      custom_css: chatbot.custom_css || '',
      custom_html: chatbot.custom_html || '',
      custom_js: chatbot.custom_js || '',
      ui_shape: chatbot.ui_shape || 'rounded',
    } as EnhancedChatBot;
  }

  static async updateEnhancedChatBot(id: string, updates: Partial<EnhancedChatBot>): Promise<EnhancedChatBot> {
    // Update basic chatbot info
    const basicUpdates = {
      name: updates.name,
      description: updates.description,
      avatar_url: updates.avatar_url,
      system_prompt: updates.system_prompt,
      theme: updates.theme,
      mode: updates.mode,
      landing_page_enabled: updates.landing_page_enabled,
    };

    // Update botforge-specific fields separately
    const botforgeUpdates = {
      webhook_url: updates.webhook_url,
      web_search_enabled: updates.web_search_enabled,
      custom_css: updates.custom_css,
      custom_html: updates.custom_html,
      custom_js: updates.custom_js,
      ui_shape: updates.ui_shape,
    };

    // Update basic chatbot
    const updatedChatbot = await ChatBotStorage.updateChatBot(id, basicUpdates);

    // Store botforge-specific data
    const enhancedData = this.getItem<Record<string, any>>('botforge_enhanced') || {};
    enhancedData[id] = botforgeUpdates;
    this.setItem('botforge_enhanced', enhancedData);

    // Return enhanced chatbot
    return await this.getEnhancedChatBot(id) as EnhancedChatBot;
  }

  // Utility Methods
  private static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Export/Import for testing
  static exportBotforgeData(): any {
    return {
      models: this.getItem('botforge_models'),
      actions: this.getItem('botforge_actions'),
      knowledge: this.getItem('botforge_knowledge'),
      enhanced: this.getItem('botforge_enhanced'),
    };
  }

  static importBotforgeData(data: any): void {
    if (data.models) this.setItem('botforge_models', data.models);
    if (data.actions) this.setItem('botforge_actions', data.actions);
    if (data.knowledge) this.setItem('botforge_knowledge', data.knowledge);
    if (data.enhanced) this.setItem('botforge_enhanced', data.enhanced);
  }
}