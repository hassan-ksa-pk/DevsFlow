import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, Settings, MessageSquare, User, Menu, X, Home, Info, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChatBot, ChatBotMessage } from '@/types/chatbot';
import { ChatBotStorage } from '@/lib/chatbot-storage';
import { ChatBotExporter } from '@/lib/chatbot-export';

export default function PublicBotView() {
  const { slug } = useParams();
  const [chatbot, setChatbot] = useState<ChatBot | null>(null);
  const [messages, setMessages] = useState<ChatBotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userSettings, setUserSettings] = useState({
    displayName: '',
    about: '',
    customInstructions: '',
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    selectedModel: '',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      loadChatBotBySlug(slug);
    }
  }, [slug]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatBotBySlug = async (botSlug: string) => {
    try {
      // In a real implementation, this would query by slug
      // For now, we'll search through all chatbots
      const allChatbots = await ChatBotStorage.getChatBots(''); // Get all for demo
      const bot = allChatbots.find(cb => cb.slug === botSlug);
      
      if (bot && bot.is_public) {
        setChatbot(bot);
        setUserSettings(prev => ({
          ...prev,
          displayName: bot.user_display_name || '',
          about: bot.user_about || '',
          customInstructions: bot.custom_instructions || '',
          selectedModel: bot.model_id || '',
        }));
      } else {
        setChatbot(null);
      }
    } catch (error) {
      console.error('Error loading chatbot:', error);
      setChatbot(null);
    }
  };

  const downloadStandaloneHTML = () => {
    if (chatbot) {
      ChatBotExporter.downloadHTML(chatbot);
    }
  };

  const loadMessages = async (chatbotId: string) => {
    try {
      const sessionId = `public-${Date.now()}`;
      const botMessages = await ChatBotStorage.getChatBotMessages(chatbotId, sessionId);
      setMessages(botMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateMockResponse = (userMessage: string): string => {
    const responses = [
      "Hello! I'm here to help you. What would you like to know?",
      "That's a great question! Let me assist you with that.",
      "I understand your query. Here's what I can tell you...",
      "Thanks for reaching out! I'm happy to help you today.",
      "I'd be glad to assist you with that. Let me provide some guidance...",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatbot) return;

    const sessionId = `public-${Date.now()}`;
    
    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage: ChatBotMessage = {
        id: '',
        chatbot_id: chatbot.id,
        session_id: sessionId,
        role: 'user',
        content: inputMessage,
        metadata: {},
        created_at: '',
      };
      
      const savedUserMessage = await ChatBotStorage.addChatBotMessage(userMessage);
      setMessages(prev => [...prev, savedUserMessage]);
      
      // Simulate AI response (replace with actual AI integration)
      setTimeout(async () => {
        const aiResponse = generateMockResponse(inputMessage);
        const assistantMessage: ChatBotMessage = {
          id: '',
          chatbot_id: chatbot.id,
          session_id: sessionId,
          role: 'assistant',
          content: aiResponse,
          metadata: {},
          created_at: '',
        };
        
        const savedAssistantMessage = await ChatBotStorage.addChatBotMessage(assistantMessage);
        setMessages(prev => [...prev, savedAssistantMessage]);
        setIsLoading(false);
      }, 1000);
      
      setInputMessage('');
      
      // Track analytics
      await ChatBotStorage.addAnalyticsEvent({
        chatbot_id: chatbot.id,
        event_type: 'message_sent',
        session_id: sessionId,
        user_agent: navigator.userAgent,
        metadata: { source: 'public', message_length: inputMessage.length },
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const getThemeStyles = () => {
    if (!chatbot) return {};
    
    const theme = chatbot.design_config;
    return {
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
    };
  };

  const getFontSizeClass = () => {
    switch (userSettings.fontSize) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  };

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto p-8 text-center">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">ChatBot Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The chatbot you're looking for doesn't exist or isn't publicly available.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (showLanding && chatbot.landing_page_enabled) {
    return (
      <div className="min-h-screen bg-background" style={getThemeStyles()}>
        {/* Navigation */}
        <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{chatbot.name}</h1>
                <p className="text-sm text-muted-foreground">AI Assistant</p>
              </div>
            </div>
            
            <Button onClick={() => setShowLanding(false)}>
              Start Chatting
            </Button>
          </div>
        </nav>

        {/* Landing Content */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              {chatbot.avatar_url ? (
                <img src={chatbot.avatar_url} alt={chatbot.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <Bot className="h-12 w-12 text-primary" />
              )}
            </div>
            <h1 className="text-4xl font-bold mb-4">{chatbot.name}</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {chatbot.description}
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {chatbot.theme} theme
              </div>
              <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                Powered by {chatbot.api_provider}
              </div>
              <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {chatbot.mode} mode
              </div>
            </div>
            <Button 
              size="lg" 
              onClick={() => setShowLanding(false)}
              className="gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              Start Conversation
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered</h3>
              <p className="text-sm text-muted-foreground">
                Advanced AI technology for intelligent conversations
              </p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Customizable</h3>
              <p className="text-sm text-muted-foreground">
                Personalize your experience with custom settings
              </p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Interactive</h3>
              <p className="text-sm text-muted-foreground">
                Real-time chat with instant responses
              </p>
            </Card>
          </div>

          {/* About Section */}
          {userSettings.about && (
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">About This Assistant</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {userSettings.about}
              </p>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex" style={getThemeStyles()}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-muted/30 border-r overflow-hidden flex flex-col`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Chat History</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className="p-2 rounded bg-background/50 text-sm cursor-pointer hover:bg-background/70"
                onClick={() => {
                  // Scroll to message (implementation needed)
                }}
              >
                <div className="font-medium truncate">
                  {message.role === 'user' ? 'You' : chatbot.name}
                </div>
                <div className="text-muted-foreground truncate">
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {chatbot.avatar_url ? (
                    <img src={chatbot.avatar_url} alt={chatbot.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Bot className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h1 className="font-bold">{chatbot.name}</h1>
                  <p className="text-sm text-muted-foreground">AI Assistant</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {chatbot.landing_page_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLanding(true)}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={downloadStandaloneHTML}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Chat Settings</DialogTitle>
                    <DialogDescription>
                      Customize your chat experience
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="display-name">Display Name</Label>
                      <Input
                        id="display-name"
                        value={userSettings.displayName}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Your name"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="custom-instructions">Custom Instructions</Label>
                      <Textarea
                        id="custom-instructions"
                        value={userSettings.customInstructions}
                        onChange={(e) => setUserSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
                        placeholder="Additional instructions for the chatbot..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="font-size">Font Size</Label>
                      <Select
                        value={userSettings.fontSize}
                        onValueChange={(value: any) => setUserSettings(prev => ({ ...prev, fontSize: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {!chatbot.models_locked && (
                      <div>
                        <Label htmlFor="model">AI Model</Label>
                        <Select
                          value={userSettings.selectedModel}
                          onValueChange={(value) => setUserSettings(prev => ({ ...prev, selectedModel: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {chatbot.available_models.map(model => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">Welcome to {chatbot.name}!</h3>
                <p className="text-muted-foreground">
                  {chatbot.description || 'Start a conversation by sending a message below.'}
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {chatbot.avatar_url ? (
                        <img src={chatbot.avatar_url} alt={chatbot.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <p className={`whitespace-pre-wrap ${getFontSizeClass()}`}>
                      {message.content}
                    </p>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t bg-background/80 backdrop-blur-sm p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}