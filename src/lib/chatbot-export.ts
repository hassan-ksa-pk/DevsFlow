import { ChatBot, ThemeConfig } from '@/types/chatbot';

export class ChatBotExporter {
  static generateHTML(chatbot: ChatBot): string {
    const theme = chatbot.design_config;
    const isDark = chatbot.theme === 'dark';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chatbot.name} - AI Assistant</title>
    <style>
        ${this.generateThemeCSS(theme)}
        ${this.generateBaseCSS()}
    </style>
</head>
<body>
    <div id="app">
        <!-- Landing Page -->
        <section id="landing" class="landing-page" style="display: ${chatbot.landing_page_enabled ? 'block' : 'none'}">
            <nav class="navbar">
                <div class="nav-content">
                    <div class="nav-brand">
                        <div class="bot-avatar">
                            ${chatbot.avatar_url ? `<img src="${chatbot.avatar_url}" alt="${chatbot.name}" />` : '<div class="avatar-placeholder">🤖</div>'}
                        </div>
                        <div>
                            <h1>${chatbot.name}</h1>
                            <p>AI Assistant</p>
                        </div>
                    </div>
                    <button onclick="showChat()" class="start-chat-btn">Start Chatting</button>
                </div>
            </nav>
            
            <div class="landing-content">
                <div class="hero-section">
                    <div class="hero-avatar">
                        ${chatbot.avatar_url ? `<img src="${chatbot.avatar_url}" alt="${chatbot.name}" />` : '<div class="avatar-placeholder">🤖</div>'}
                    </div>
                    <h1 class="hero-title">${chatbot.name}</h1>
                    <p class="hero-description">${chatbot.description}</p>
                    <button onclick="showChat()" class="hero-cta">
                        <span>💬</span> Start Conversation
                    </button>
                </div>
                
                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">🤖</div>
                        <h3>AI-Powered</h3>
                        <p>Advanced AI technology for intelligent conversations</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">⚙️</div>
                        <h3>Customizable</h3>
                        <p>Personalize your experience with custom settings</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">💬</div>
                        <h3>Interactive</h3>
                        <p>Real-time chat with instant responses</p>
                    </div>
                </div>
            </div>
        </section>
        
        <!-- Chat Interface -->
        <section id="chat" class="chat-interface" style="display: ${chatbot.landing_page_enabled ? 'none' : 'flex'}">
            <div class="chat-container">
                <!-- Header -->
                <header class="chat-header">
                    <div class="header-left">
                        ${chatbot.landing_page_enabled ? '<button onclick="showLanding()" class="back-btn">← Home</button>' : ''}
                        <div class="bot-info">
                            <div class="bot-avatar">
                                ${chatbot.avatar_url ? `<img src="${chatbot.avatar_url}" alt="${chatbot.name}" />` : '<div class="avatar-placeholder">🤖</div>'}
                            </div>
                            <div>
                                <h1>${chatbot.name}</h1>
                                <p>AI Assistant</p>
                            </div>
                        </div>
                    </div>
                    <div class="header-right">
                        <button onclick="toggleSidebar()" class="sidebar-toggle">☰</button>
                        <button onclick="toggleSettings()" class="settings-btn">⚙️</button>
                    </div>
                </header>
                
                <div class="chat-body">
                    <!-- Sidebar -->
                    <aside id="sidebar" class="sidebar">
                        <div class="sidebar-header">
                            <h3>Chat History</h3>
                            <button onclick="toggleSidebar()" class="close-btn">×</button>
                        </div>
                        <div id="chat-history" class="chat-history">
                            <!-- Chat history will be populated here -->
                        </div>
                    </aside>
                    
                    <!-- Messages Area -->
                    <main class="messages-container">
                        <div id="messages" class="messages">
                            <div class="welcome-message">
                                <div class="welcome-avatar">
                                    ${chatbot.avatar_url ? `<img src="${chatbot.avatar_url}" alt="${chatbot.name}" />` : '<div class="avatar-placeholder">🤖</div>'}
                                </div>
                                <div class="welcome-content">
                                    <h3>Welcome to ${chatbot.name}!</h3>
                                    <p>${chatbot.description || 'Start a conversation by sending a message below.'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Input Area -->
                        <div class="input-container">
                            <textarea 
                                id="message-input" 
                                placeholder="Type your message..."
                                rows="3"
                                onkeydown="handleKeyPress(event)"
                            ></textarea>
                            <button onclick="sendMessage()" class="send-btn">Send</button>
                        </div>
                    </main>
                    
                    <!-- Settings Panel -->
                    <aside id="settings" class="settings-panel">
                        <div class="settings-header">
                            <h3>Settings</h3>
                            <button onclick="toggleSettings()" class="close-btn">×</button>
                        </div>
                        <div class="settings-content">
                            <div class="setting-group">
                                <label for="user-display-name">Display Name</label>
                                <input type="text" id="user-display-name" placeholder="Your name" />
                            </div>
                            
                            <div class="setting-group">
                                <label for="user-about">About</label>
                                <textarea id="user-about" placeholder="Tell us about yourself..." rows="3"></textarea>
                            </div>
                            
                            <div class="setting-group">
                                <label for="custom-instructions">Custom Instructions</label>
                                <textarea id="custom-instructions" placeholder="Additional instructions for the chatbot..." rows="3"></textarea>
                            </div>
                            
                            <div class="setting-group">
                                <label for="font-size">Font Size</label>
                                <select id="font-size">
                                    <option value="small">Small</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="large">Large</option>
                                </select>
                            </div>
                            ${!chatbot.models_locked ? `
                            <div class="setting-group">
                                <label for="ai-model">AI Model</label>
                                <select id="ai-model">
                                    ${chatbot.available_models.map(model => `<option value="${model}">${model}</option>`).join('')}
                                </select>
                            </div>
                            ` : ''}
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    </div>
    
    <script>
        ${this.generateJavaScript(chatbot)}
    </script>
</body>
</html>`;
  }

  private static generateThemeCSS(theme: ThemeConfig): string {
    return `
        :root {
            --primary-color: ${theme.colors.primary};
            --secondary-color: ${theme.colors.secondary};
            --background-color: ${theme.colors.background};
            --surface-color: ${theme.colors.surface};
            --text-color: ${theme.colors.text};
            --accent-color: ${theme.colors.accent};
            --font-family: ${theme.typography.fontFamily};
            --heading-font: ${theme.typography.headingFont};
            --font-size: ${theme.typography.fontSize};
            --border-radius: ${theme.layout.borderRadius};
            --spacing: ${theme.layout.spacing};
            --sidebar-width: ${theme.layout.sidebarWidth};
            --animation-duration: ${theme.animations.duration};
            --animation-easing: ${theme.animations.easing};
        }
        
        body {
            font-family: var(--font-family);
            font-size: var(--font-size);
            color: var(--text-color);
            background: var(--background-color);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        
        ${theme.animations.enabled ? `
        * {
            transition: all var(--animation-duration) var(--animation-easing);
        }
        ` : ''}
    `;
  }

  private static generateBaseCSS(): string {
    return `
        /* Modern CSS Reset */
        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        /* Modern Typography */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        /* Layout */
        .landing-page, .chat-interface {
            min-height: 100vh;
            background: linear-gradient(135deg, var(--background-color) 0%, var(--surface-color) 100%);
        }
        
        .chat-interface {
            display: flex;
            flex-direction: column;
        }
        
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
            backdrop-filter: blur(10px);
        }
        
        .chat-body {
            flex: 1;
            display: flex;
            position: relative;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.05);
        }
        
        /* Navigation */
        .navbar {
            background: var(--surface-color);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        
        .nav-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .nav-brand {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .start-chat-btn {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-weight: 500;
        }
        
        /* Landing Page */
        .landing-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }
        
        .hero-section {
            text-align: center;
            margin-bottom: 4rem;
        }
        
        .hero-avatar {
            width: 120px;
            height: 120px;
            margin: 0 auto 2rem;
            border-radius: 50%;
            overflow: hidden;
            background: var(--surface-color);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .hero-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .avatar-placeholder {
            font-size: 3rem;
        }
        
        .hero-title {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 1rem;
            font-family: var(--heading-font);
        }
        
        .hero-description {
            font-size: 1.25rem;
            opacity: 0.8;
            margin-bottom: 2rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .hero-cta {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 1rem 2rem;
            border-radius: var(--border-radius);
            font-size: 1.1rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 4rem;
        }
        
        .feature-card {
            background: var(--surface-color);
            padding: 2rem;
            border-radius: var(--border-radius);
            text-align: center;
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        
        /* Chat Header */
        .chat-header {
            background: var(--surface-color);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .bot-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .bot-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            background: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .bot-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .header-right {
            display: flex;
            gap: 0.5rem;
        }
        
        .back-btn, .sidebar-toggle, .settings-btn, .close-btn {
            background: transparent;
            border: 1px solid var(--text-color);
            color: var(--text-color);
            padding: 0.5rem;
            border-radius: var(--border-radius);
            cursor: pointer;
        }
        
        /* Sidebar */
        .sidebar {
            width: var(--sidebar-width);
            background: var(--surface-color);
            border-right: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
            transform: translateX(-100%);
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            z-index: 10;
        }
        
        .sidebar.open {
            transform: translateX(0);
        }
        
        .sidebar-header {
            padding: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .chat-history {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
        }
        
        .history-item {
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            background: var(--background-color);
            border-radius: var(--border-radius);
            cursor: pointer;
        }
        
        .history-item:hover {
            background: var(--primary-color);
            color: white;
        }
        
        /* Messages */
        .messages-container {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .messages {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        
        .welcome-message {
            text-align: center;
            padding: 3rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            margin-bottom: 2rem;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .welcome-avatar {
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
            border-radius: 50%;
            overflow: hidden;
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .message {
            display: flex;
            gap: 1rem;
            max-width: 75%;
            animation: slideInUp 0.3s ease-out;
        }
        
        .message.user {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        
        .message.assistant {
            align-self: flex-start;
        }
        
        .message-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        
        .message.user .message-avatar {
            background: linear-gradient(135deg, var(--accent-color), var(--primary-color));
        }
        
        .message-content {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 1.25rem;
            border-radius: 18px;
            position: relative;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .message.user .message-content {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            border: none;
        }
        
        .message-time {
            font-size: 0.75rem;
            opacity: 0.6;
            margin-top: 0.5rem;
        }
        
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Input */
        .input-container {
            padding: 1.5rem 2rem;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            gap: 1rem;
            align-items: flex-end;
        }
        
        #message-input {
            flex: 1;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: var(--text-color);
            padding: 1rem;
            border-radius: 16px;
            resize: none;
            font-family: inherit;
            font-size: inherit;
            transition: all 0.3s ease;
        }
        
        #message-input:focus {
            outline: none;
            border-color: var(--primary-color);
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 0 3px rgba(var(--primary-color), 0.1);
        }
        
        .send-btn {
            background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
            color: white;
            border: none;
            padding: 1rem 1.5rem;
            border-radius: 16px;
            cursor: pointer;
            white-space: nowrap;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .send-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        
        .send-btn:active {
            transform: translateY(0);
        }
        
        /* Settings */
        .settings-panel {
            width: 400px;
            background: var(--surface-color);
            border-left: 1px solid rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            position: absolute;
            top: 0;
            right: 0;
            height: 100%;
            z-index: 10;
        }
        
        .settings-panel.open {
            transform: translateX(0);
        }
        
        .settings-header {
            padding: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .settings-content {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
        }
        
        .setting-group {
            margin-bottom: 1.5rem;
        }
        
        .setting-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        
        .setting-group input,
        .setting-group textarea,
        .setting-group select {
            width: 100%;
            background: var(--background-color);
            border: 1px solid rgba(255,255,255,0.2);
            color: var(--text-color);
            padding: 0.75rem;
            border-radius: var(--border-radius);
            font-family: inherit;
            font-size: inherit;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .nav-content, .chat-header {
                padding: 1rem;
            }
            
            .landing-content {
                padding: 2rem 1rem;
            }
            
            .hero-title {
                font-size: 2rem;
            }
            
            .features-grid {
                grid-template-columns: 1fr;
            }
            
            .sidebar, .settings-panel {
                width: 100%;
            }
            
            .messages {
                padding: 1rem;
            }
            
            .input-container {
                padding: 1rem;
            }
            
            .message {
                max-width: 85%;
            }
        }
        
        /* Utility */
        .loading {
            display: inline-flex;
            gap: 0.25rem;
        }
        
        .loading span {
            width: 8px;
            height: 8px;
            background: currentColor;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .loading span:nth-child(1) { animation-delay: -0.32s; }
        .loading span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    `;
  }

  private static generateJavaScript(chatbot: ChatBot): string {
    return `
        // State
        let messages = [];
        let sessionId = 'session-' + Date.now();
        let settings = {
            displayName: '${chatbot.user_display_name || ''}',
            about: '${chatbot.user_about || ''}',
            customInstructions: '${chatbot.custom_instructions || ''}',
            fontSize: '${chatbot.font_size || 'medium'}',
            selectedModel: '${chatbot.model_id || ''}'
        };
        
        // DOM Elements
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sidebar = document.getElementById('sidebar');
        const settingsPanel = document.getElementById('settings');
        const chatHistory = document.getElementById('chat-history');
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadSettings();
            applySettings();
            trackEvent('page_view');
        });
        
        // Navigation
        function showChat() {
            document.getElementById('landing').style.display = 'none';
            document.getElementById('chat').style.display = 'flex';
            trackEvent('landing_to_chat');
        }
        
        function showLanding() {
            document.getElementById('landing').style.display = 'block';
            document.getElementById('chat').style.display = 'none';
        }
        
        function toggleSidebar() {
            sidebar.classList.toggle('open');
        }
        
        function toggleSettings() {
            settingsPanel.classList.toggle('open');
        }
        
        // Settings Management
        function loadSettings() {
            const saved = localStorage.getItem('chatbot-settings');
            if (saved) {
                settings = { ...settings, ...JSON.parse(saved) };
            }
            
            // Update form fields
            document.getElementById('user-display-name').value = settings.displayName || '';
            document.getElementById('user-about').value = settings.about || '';
            document.getElementById('custom-instructions').value = settings.customInstructions || '';
            document.getElementById('font-size').value = settings.fontSize || 'medium';
            const modelSelect = document.getElementById('ai-model');
            if (modelSelect) {
                modelSelect.value = settings.selectedModel || '${chatbot.model_id}';
            }
        }
        
        function saveSettings() {
            settings.displayName = document.getElementById('user-display-name').value;
            settings.about = document.getElementById('user-about').value;
            settings.customInstructions = document.getElementById('custom-instructions').value;
            settings.fontSize = document.getElementById('font-size').value;
            const modelSelect = document.getElementById('ai-model');
            if (modelSelect) {
                settings.selectedModel = modelSelect.value;
            }
            
            localStorage.setItem('chatbot-settings', JSON.stringify(settings));
            applySettings();
        }
        
        function applySettings() {
            // Apply font size
            const fontSizeMap = {
                small: '14px',
                medium: '16px',
                large: '18px'
            };
            document.documentElement.style.setProperty('--font-size', fontSizeMap[settings.fontSize] || '16px');
        }
        
        // Message Handling
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
        
        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            // Add user message
            addMessage('user', message);
            messageInput.value = '';
            
            // Show loading
            const loadingId = addMessage('assistant', '', true);
            
            try {
                // Simulate AI response (replace with actual API call)
                const response = await generateResponse(message);
                updateMessage(loadingId, response);
                
                trackEvent('message_sent', { message_length: message.length });
            } catch (error) {
                updateMessage(loadingId, 'Sorry, I encountered an error. Please try again.');
            }
        }
        
        function addMessage(role, content, isLoading = false) {
            const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const message = {
                id: messageId,
                role: role,
                content: content,
                timestamp: new Date().toISOString(),
                isLoading: isLoading
            };
            
            messages.push(message);
            renderMessage(message);
            updateChatHistory();
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            return messageId;
        }
        
        function updateMessage(messageId, content) {
            const message = messages.find(m => m.id === messageId);
            if (message) {
                message.content = content;
                message.isLoading = false;
                
                const messageElement = document.getElementById(messageId);
                if (messageElement) {
                    const contentElement = messageElement.querySelector('.message-text');
                    if (contentElement) {
                        contentElement.textContent = content;
                        messageElement.classList.remove('loading');
                    }
                }
            }
        }
        
        function renderMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.id = message.id;
            messageDiv.className = 'message ' + message.role;
            
            if (message.isLoading) {
                messageDiv.classList.add('loading');
            }
            
            const avatarHtml = message.role === 'user' 
                ? '<div class="message-avatar">👤</div>'
                : '<div class="message-avatar">${chatbot.avatar_url ? '<img src="${chatbot.avatar_url}" alt="${chatbot.name}" />' : '🤖'}</div>';
            
            const contentHtml = message.isLoading 
                ? '<div class="loading"><span></span><span></span><span></span></div>'
                : '<div class="message-text">' + message.content + '</div>';
            
            messageDiv.innerHTML = \`
                \${avatarHtml}
                <div class="message-content">
                    \${contentHtml}
                    <div class="message-time">\${formatTime(message.timestamp)}</div>
                </div>
            \`;
            
            // Remove welcome message if it exists
            const welcomeMessage = messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            messagesContainer.appendChild(messageDiv);
        }
        
        function updateChatHistory() {
            chatHistory.innerHTML = '';
            
            messages.slice(-10).forEach(message => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.innerHTML = \`
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">
                        \${message.role === 'user' ? 'You' : '${chatbot.name}'}
                    </div>
                    <div style="font-size: 0.875rem; opacity: 0.8;">
                        \${message.content.substring(0, 50)}\${message.content.length > 50 ? '...' : ''}
                    </div>
                \`;
                
                historyItem.onclick = () => {
                    // Scroll to message (simplified)
                    const messageElement = document.getElementById(message.id);
                    if (messageElement) {
                        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    toggleSidebar();
                };
                
                chatHistory.appendChild(historyItem);
            });
        }
        
        // AI Response Generation (Replace with actual API call)
        async function generateResponse(userMessage) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            
            // Replace variables
            const variables = {
                '@username': settings.displayName || 'User',
                '@custom_instructions': settings.customInstructions,
                '@current_message': userMessage,
                '@chat_log': messages.slice(-5).map(m => m.content).join(' '),
                '@chat_history': messages.map(m => m.content).join(' '),
                '@bot_name': '${chatbot.name}',
                '@bot_description': '${chatbot.description}'
            };
            
            let systemPrompt = '${chatbot.system_prompt}';
            
            // Replace variables in system prompt
            for (const [key, value] of Object.entries(variables)) {
                systemPrompt = systemPrompt.replace(new RegExp(key, 'g'), value);
            }
            
            // Generate mock response (replace with actual AI API call)
            const responses = [
                "I understand your question. Based on what you've told me, I think...",
                "That's an interesting point! Let me help you with that.",
                "Thanks for sharing that with me. Here's what I can suggest...",
                "I appreciate you asking. Let me provide some guidance on this.",
                "Great question! Based on my knowledge, I can tell you that..."
            ];
            
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Utility Functions
        function formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        function trackEvent(eventType, metadata = {}) {
            // In a real implementation, this would send analytics to a server
            console.log('Event:', eventType, metadata);
            
            // Store events locally for demo
            const events = JSON.parse(localStorage.getItem('chatbot-events') || '[]');
            events.push({
                type: eventType,
                timestamp: new Date().toISOString(),
                metadata: metadata
            });
            localStorage.setItem('chatbot-events', JSON.stringify(events));
        }
        
        // Auto-save settings
        document.getElementById('user-display-name')?.addEventListener('change', saveSettings);
        document.getElementById('user-about')?.addEventListener('change', saveSettings);
        document.getElementById('custom-instructions')?.addEventListener('change', saveSettings);
        document.getElementById('font-size')?.addEventListener('change', saveSettings);
        document.getElementById('ai-model')?.addEventListener('change', saveSettings);
    `;
  }

  static downloadHTML(chatbot: ChatBot): void {
    const html = this.generateHTML(chatbot);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chatbot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-chatbot.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}