import { ChatBot, ChatBotMessage, ChatBotAnalytics, UserCredits } from '@/types/chatbot';

const STORAGE_KEYS = {
  CHATBOTS: 'devsflow_chatbots',
  CHATBOT_MESSAGES: 'devsflow_chatbot_messages',
  CHATBOT_ANALYTICS: 'devsflow_chatbot_analytics',
  USER_CREDITS: 'devsflow_user_credits',
};

export class ChatBotStorage {
  // ChatBot CRUD Operations
  static async getChatBots(userId: string): Promise<ChatBot[]> {
    const chatbots = this.getItem<ChatBot[]>(STORAGE_KEYS.CHATBOTS) || [];
    return chatbots.filter(bot => bot.user_id === userId);
  }

  static async getChatBot(id: string): Promise<ChatBot | null> {
    const chatbots = this.getItem<ChatBot[]>(STORAGE_KEYS.CHATBOTS) || [];
    return chatbots.find(bot => bot.id === id) || null;
  }

  static async createChatBot(chatbot: Omit<ChatBot, 'id' | 'created_at' | 'updated_at'>): Promise<ChatBot> {
    const chatbots = this.getItem<ChatBot[]>(STORAGE_KEYS.CHATBOTS) || [];
    
    // Check user limit (1 bot per user initially)
    const userBots = chatbots.filter(bot => bot.user_id === chatbot.user_id);
    if (userBots.length >= 1) {
      throw new Error('You have reached the maximum limit of 1 chatbot. Upgrade to create more.');
    }

    const newChatBot: ChatBot = {
      ...chatbot,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    chatbots.push(newChatBot);
    this.setItem(STORAGE_KEYS.CHATBOTS, chatbots);
    return newChatBot;
  }

  static async updateChatBot(id: string, updates: Partial<ChatBot>): Promise<ChatBot> {
    const chatbots = this.getItem<ChatBot[]>(STORAGE_KEYS.CHATBOTS) || [];
    const index = chatbots.findIndex(bot => bot.id === id);
    
    if (index === -1) {
      throw new Error('ChatBot not found');
    }

    chatbots[index] = {
      ...chatbots[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.setItem(STORAGE_KEYS.CHATBOTS, chatbots);
    return chatbots[index];
  }

  static async deleteChatBot(id: string): Promise<void> {
    const chatbots = this.getItem<ChatBot[]>(STORAGE_KEYS.CHATBOTS) || [];
    const filtered = chatbots.filter(bot => bot.id !== id);
    this.setItem(STORAGE_KEYS.CHATBOTS, filtered);

    // Also delete related messages and analytics
    const messages = this.getItem<ChatBotMessage[]>(STORAGE_KEYS.CHATBOT_MESSAGES) || [];
    const filteredMessages = messages.filter(msg => msg.chatbot_id !== id);
    this.setItem(STORAGE_KEYS.CHATBOT_MESSAGES, filteredMessages);

    const analytics = this.getItem<ChatBotAnalytics[]>(STORAGE_KEYS.CHATBOT_ANALYTICS) || [];
    const filteredAnalytics = analytics.filter(a => a.chatbot_id !== id);
    this.setItem(STORAGE_KEYS.CHATBOT_ANALYTICS, filteredAnalytics);
  }

  // Message Operations
  static async getChatBotMessages(chatbotId: string, sessionId?: string): Promise<ChatBotMessage[]> {
    const messages = this.getItem<ChatBotMessage[]>(STORAGE_KEYS.CHATBOT_MESSAGES) || [];
    return messages.filter(msg => 
      msg.chatbot_id === chatbotId && 
      (!sessionId || msg.session_id === sessionId)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  static async addChatBotMessage(message: Omit<ChatBotMessage, 'id' | 'created_at'>): Promise<ChatBotMessage> {
    const messages = this.getItem<ChatBotMessage[]>(STORAGE_KEYS.CHATBOT_MESSAGES) || [];
    const newMessage: ChatBotMessage = {
      ...message,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    messages.push(newMessage);
    this.setItem(STORAGE_KEYS.CHATBOT_MESSAGES, messages);
    return newMessage;
  }

  // Analytics Operations
  static async addAnalyticsEvent(event: Omit<ChatBotAnalytics, 'id' | 'created_at'>): Promise<ChatBotAnalytics> {
    const analytics = this.getItem<ChatBotAnalytics[]>(STORAGE_KEYS.CHATBOT_ANALYTICS) || [];
    const newEvent: ChatBotAnalytics = {
      ...event,
      id: this.generateId(),
      created_at: new Date().toISOString(),
    };

    analytics.push(newEvent);
    this.setItem(STORAGE_KEYS.CHATBOT_ANALYTICS, analytics);
    return newEvent;
  }

  static async getChatBotAnalytics(chatbotId: string): Promise<ChatBotAnalytics[]> {
    const analytics = this.getItem<ChatBotAnalytics[]>(STORAGE_KEYS.CHATBOT_ANALYTICS) || [];
    return analytics.filter(a => a.chatbot_id === chatbotId);
  }

  // Credits Operations
  static async getUserCredits(userId: string): Promise<UserCredits> {
    const credits = this.getItem<UserCredits[]>(STORAGE_KEYS.USER_CREDITS) || [];
    let userCredits = credits.find(c => c.userId === userId);

    if (!userCredits) {
      userCredits = {
        userId,
        credits: 30,
        lastReset: new Date().toISOString(),
        dailyLimit: 30,
      };
      credits.push(userCredits);
      this.setItem(STORAGE_KEYS.USER_CREDITS, credits);
    } else {
      // Check if credits need to be reset (daily)
      const lastReset = new Date(userCredits.lastReset);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 1) {
        userCredits.credits = userCredits.dailyLimit;
        userCredits.lastReset = now.toISOString();
        this.setItem(STORAGE_KEYS.USER_CREDITS, credits);
      }
    }

    return userCredits;
  }

  static async updateUserCredits(userId: string, credits: number): Promise<UserCredits> {
    const creditsData = this.getItem<UserCredits[]>(STORAGE_KEYS.USER_CREDITS) || [];
    const index = creditsData.findIndex(c => c.userId === userId);
    
    if (index === -1) {
      const newCredits: UserCredits = {
        userId,
        credits,
        lastReset: new Date().toISOString(),
        dailyLimit: 30,
      };
      creditsData.push(newCredits);
      this.setItem(STORAGE_KEYS.USER_CREDITS, creditsData);
      return newCredits;
    }

    creditsData[index].credits = Math.max(0, credits);
    this.setItem(STORAGE_KEYS.USER_CREDITS, creditsData);
    return creditsData[index];
  }

  static async deductCredits(userId: string, amount: number = 1): Promise<UserCredits> {
    const userCredits = await this.getUserCredits(userId);
    if (userCredits.credits < amount) {
      throw new Error('Insufficient credits');
    }
    return this.updateUserCredits(userId, userCredits.credits - amount);
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
  static exportData(): any {
    return {
      chatbots: this.getItem(STORAGE_KEYS.CHATBOTS),
      messages: this.getItem(STORAGE_KEYS.CHATBOT_MESSAGES),
      analytics: this.getItem(STORAGE_KEYS.CHATBOT_ANALYTICS),
      credits: this.getItem(STORAGE_KEYS.USER_CREDITS),
    };
  }

  static importData(data: any): void {
    if (data.chatbots) this.setItem(STORAGE_KEYS.CHATBOTS, data.chatbots);
    if (data.messages) this.setItem(STORAGE_KEYS.CHATBOT_MESSAGES, data.messages);
    if (data.analytics) this.setItem(STORAGE_KEYS.CHATBOT_ANALYTICS, data.analytics);
    if (data.credits) this.setItem(STORAGE_KEYS.USER_CREDITS, data.credits);
  }
}