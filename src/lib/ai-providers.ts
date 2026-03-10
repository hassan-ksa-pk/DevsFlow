import { ChatBot } from '@/types/chatbot';

export interface AIProvider {
  name: string;
  sendMessage: (message: string, chatbot: ChatBot, conversationHistory: any[]) => Promise<string>;
}

export class LovableProvider implements AIProvider {
  name = 'lovable';

  async sendMessage(message: string, chatbot: ChatBot, conversationHistory: any[]): Promise<string> {
    // Use existing Lovable integration
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        systemPrompt: chatbot.system_prompt,
        conversationHistory,
        model: chatbot.model_id || 'gpt-3.5-turbo',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Advanced AI');
    }

    const data = await response.json();
    return data.response;
  }
}

export class GroqProvider implements AIProvider {
  name = 'groq';

  async sendMessage(message: string, chatbot: ChatBot, conversationHistory: any[]): Promise<string> {
    if (!chatbot.api_key_encrypted) {
      throw new Error('Groq API key is required');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chatbot.api_key_encrypted}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chatbot.model_id || 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: this.replaceVariables(chatbot.system_prompt, message, conversationHistory),
          },
          ...conversationHistory,
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  }

  private replaceVariables(prompt: string, currentMessage: string, history: any[]): string {
    const variables = {
      '@username': 'User', // This would come from user settings
      '@custom_instructions': '', // This would come from user settings
      '@current_message': currentMessage,
      '@chat_log': history.slice(-5).map(m => m.content).join(' '),
      '@chat_history': history.map(m => m.content).join(' '),
      '@bot_name': 'ChatBot', // This would come from chatbot settings
      '@bot_description': '', // This would come from chatbot settings
    };

    let replacedPrompt = prompt;
    for (const [key, value] of Object.entries(variables)) {
      replacedPrompt = replacedPrompt.replace(new RegExp(key, 'g'), value);
    }

    return replacedPrompt;
  }
}

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter';

  async sendMessage(message: string, chatbot: ChatBot, conversationHistory: any[]): Promise<string> {
    if (!chatbot.api_key_encrypted) {
      throw new Error('OpenRouter API key is required');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chatbot.api_key_encrypted}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'DevsFlow ChatBot',
      },
      body: JSON.stringify({
        model: chatbot.model_id || 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'system',
            content: this.replaceVariables(chatbot.system_prompt, message, conversationHistory),
          },
          ...conversationHistory,
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  }

  private replaceVariables(prompt: string, currentMessage: string, history: any[]): string {
    const variables = {
      '@username': 'User',
      '@custom_instructions': '',
      '@current_message': currentMessage,
      '@chat_log': history.slice(-5).map(m => m.content).join(' '),
      '@chat_history': history.map(m => m.content).join(' '),
      '@bot_name': 'ChatBot',
      '@bot_description': '',
    };

    let replacedPrompt = prompt;
    for (const [key, value] of Object.entries(variables)) {
      replacedPrompt = replacedPrompt.replace(new RegExp(key, 'g'), value);
    }

    return replacedPrompt;
  }
}

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map([
    ['lovable', new LovableProvider()],
    ['groq', new GroqProvider()],
    ['openrouter', new OpenRouterProvider()],
  ]);

  static getProvider(providerName: string): AIProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unknown AI provider: ${providerName}`);
    }
    return provider;
  }

  static getAvailableProviders(): { name: string; displayName: string; models: string[] }[] {
    return [
      {
        name: 'lovable',
        displayName: 'Advanced AI',
        models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
      },
      {
        name: 'groq',
        displayName: 'Groq',
        models: [
          'mixtral-8x7b-32768',
          'llama2-70b-4096',
          'gemma-7b-it',
          'openai/gpt-oss-20b',
          'openai/gpt-oss-120b',
          'llama3-8b-8192',
          'llama3-70b-8192',
        ],
      },
      {
        name: 'openrouter',
        displayName: 'OpenRouter',
        models: [
          'anthropic/claude-3-haiku',
          'anthropic/claude-3-sonnet',
          'openai/gpt-3.5-turbo',
          'openai/gpt-4',
          'meta-llama/llama-3-8b-instruct',
          'openai/gpt-oss-20b',
          'openai/gpt-oss-120b',
        ],
      },
    ];
  }
}
