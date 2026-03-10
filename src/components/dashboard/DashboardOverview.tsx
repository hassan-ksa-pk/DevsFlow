import { useState, useEffect } from 'react';
import { Profile, ChatbotProject, ChatLog } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Bot, Copy, Download, Plus, Trash2, Zap, ExternalLink, MessageSquare, Search, User, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DashboardOverviewProps {
  profile: Profile | null;
  projects: ChatbotProject[];
  onCreateProject: () => void;
  onSelectProject: (project: ChatbotProject) => void;
  onDeleteProject: (projectId: string) => void;
}

export default function DashboardOverview({ profile, projects, onCreateProject, onSelectProject, onDeleteProject }: DashboardOverviewProps) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<ChatbotProject | null>(null);
  const [logsProject, setLogsProject] = useState<ChatbotProject | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const openLogs = async (project: ChatbotProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogsProject(project);
    setSelectedSession(null);
    setLogsSearch('');
    setLogsLoading(true);
    const { data } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(500);
    setLogs((data as ChatLog[]) || []);
    setLogsLoading(false);
  };

  const sessions = logs.reduce((acc, log) => {
    if (!acc[log.session_id]) acc[log.session_id] = [];
    acc[log.session_id].push(log);
    return acc;
  }, {} as Record<string, ChatLog[]>);

  const sessionList = Object.entries(sessions).map(([sessionId, messages]) => ({
    sessionId,
    messages: messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    lastMessage: messages[0],
    messageCount: messages.length,
  }));

  const filteredSessions = logsSearch
    ? sessionList.filter(s => s.messages.some(m => m.content.toLowerCase().includes(logsSearch.toLowerCase())))
    : sessionList;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${label} copied to clipboard.` });
  };

  const getEndpointUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-chat`;

  const downloadHtml = async (project: ChatbotProject, e: React.MouseEvent) => {
    e.stopPropagation();
    // Fetch tools, params, variables, KB data for export
    const [toolsRes, varsRes, kbFilesRes, kbPagesRes, modelsRes] = await Promise.all([
      supabase.from('bot_tools').select('*').eq('project_id', project.id).eq('is_active', true),
      supabase.from('bot_variables').select('*').eq('project_id', project.id),
      supabase.from('knowledge_files').select('*').eq('project_id', project.id),
      supabase.from('knowledge_web_pages').select('*').eq('project_id', project.id),
      supabase.from('chatbot_models').select('*').eq('project_id', project.id),
    ]);
    const tools = toolsRes.data || [];
    let toolParams: Record<string, any[]> = {};
    if (tools.length > 0) {
      const { data: pData } = await supabase.from('bot_tool_parameters').select('*').in('tool_id', tools.map((t: any) => t.id));
      (pData || []).forEach((p: any) => {
        if (!toolParams[p.tool_id]) toolParams[p.tool_id] = [];
        toolParams[p.tool_id].push(p);
      });
    }
    const allModels = modelsRes.data || [];
    const selectableModels = allModels.filter((m: any) => m.visibility === 'selectable');
    const activeModel = allModels.find((m: any) => m.is_active);
    const exportData = {
      tools: tools.map((t: any) => ({ ...t, parameters: toolParams[t.id] || [] })),
      variables: varsRes.data || [],
      kbFiles: kbFilesRes.data || [],
      kbPages: kbPagesRes.data || [],
      webSearchEnabled: (project as any).web_search_enabled ?? false,
      selectableModels,
      activeModel: activeModel || null,
    };
    const html = generateExportHtml(
      project,
      getEndpointUrl(),
      profile,
      exportData,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.bot_name.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded!', description: 'Your chatbot HTML file has been downloaded.' });
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDeleteProject(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const themeColors: Record<string, string> = {
    minimal: 'bg-muted',
    glass: 'bg-gradient-to-br from-primary/20 to-accent/20',
    dark: 'bg-foreground',
    modern_ai: 'gradient-primary',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Your Bots</h1>
          <p className="text-muted-foreground">{projects.length} chatbot{projects.length !== 1 ? 's' : ''} created</p>
        </div>
        <Button className="gradient-primary gap-2" onClick={onCreateProject}>
          <Plus className="h-4 w-4" /> New Bot
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bots</CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{projects.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Credits</CardTitle>
            <Zap className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.daily_credits ?? 50}</div>
            <p className="text-xs text-muted-foreground">Resets daily</p>
          </CardContent>
        </Card>
      </div>

      {projects.length === 0 ? (
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mx-auto mb-6">
            <Bot className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-display font-bold mb-3">Welcome to DevsFlow!</h2>
          <p className="text-muted-foreground mb-6">Create your first AI chatbot to get started.</p>
          <Button size="lg" className="gradient-primary" onClick={onCreateProject}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Bot
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200" onClick={() => onSelectProject(project)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {project.avatar_url ? (
                      <img src={project.avatar_url} alt={project.bot_name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${themeColors[project.theme] || 'gradient-primary'}`}>
                        <Bot className="h-6 w-6 text-primary-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg font-display">{project.bot_name}</CardTitle>
                      <CardDescription className="line-clamp-1">{project.bot_description || 'No description'}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize text-xs">{project.theme.replace('_', ' ')}</Badge>
                  <Badge variant="outline" className="capitalize text-xs">{project.mode}</Badge>
                  {project.landing_page_enabled && (
                    <Badge variant="secondary" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />Landing</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); copyToClipboard(project.api_key, 'API Key'); }}>
                    <Copy className="h-3 w-3 mr-1" /> Key
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={(e) => openLogs(project, e)} title="Chat Logs">
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={(e) => downloadHtml(project, e)}>
                    <Download className="h-3 w-3" />
                  </Button>
                  {project.slug && (project as any).is_public !== false && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); window.open(`/bot/${project.slug}`, '_blank'); }}
                      title="Visit online"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="cursor-pointer border-dashed hover:border-primary/50 hover:bg-accent/30 transition-all duration-200 flex items-center justify-center min-h-[200px]" onClick={onCreateProject}>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mx-auto mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">Create New Bot</p>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.bot_name}?</DialogTitle>
            <DialogDescription>This will permanently delete this chatbot, all its models, actions, and chat logs. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete Bot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Logs Popup */}
      <Dialog open={!!logsProject} onOpenChange={() => setLogsProject(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Chat Logs — {logsProject?.bot_name}
            </DialogTitle>
            <DialogDescription>{filteredSessions.length} sessions, {logs.length} messages total</DialogDescription>
          </DialogHeader>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." value={logsSearch} onChange={e => setLogsSearch(e.target.value)} className="pl-10" />
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading logs...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No conversations found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-5 gap-3 flex-1 min-h-0">
              {/* Session list */}
              <ScrollArea className="md:col-span-2 border rounded-lg">
                <div className="divide-y">
                  {filteredSessions.map(s => (
                    <button
                      key={s.sessionId}
                      onClick={() => setSelectedSession(s.sessionId)}
                      className={`w-full p-3 text-left hover:bg-accent/50 transition-colors ${selectedSession === s.sessionId ? 'bg-accent' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs truncate">{s.sessionId.slice(0, 12)}…</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5">{s.messageCount}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{s.messages[s.messages.length - 1]?.content.slice(0, 50)}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-2.5 w-2.5" />
                        {format(new Date(s.lastMessage.created_at), 'MMM d, HH:mm')}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Conversation view */}
              <ScrollArea className="md:col-span-3 border rounded-lg p-3">
                {selectedSession && sessions[selectedSession] ? (
                  <div className="space-y-3">
                    {sessions[selectedSession]
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map(log => (
                        <div key={log.id} className={`flex gap-2 ${log.role === 'user' ? 'justify-end' : ''}`}>
                          {log.role !== 'user' && (
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Bot className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                          <div className={`max-w-[80%]`}>
                            <div className={`rounded-lg px-3 py-2 text-sm ${log.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                              <p className="whitespace-pre-wrap break-words">{log.content}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5 block">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                          </div>
                          {log.role === 'user' && (
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Select a session to view</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Enhanced HTML Export Generator ─── */

export function generateExportHtml(
  project: ChatbotProject,
  endpointUrl: string,
  profile: Profile | null,
  exportData?: { tools: any[]; variables: any[]; kbFiles: any[]; kbPages: any[]; webSearchEnabled: boolean; selectableModels: any[]; activeModel: any },
  supabasePublishableKey?: string
): string {
  const t = getTemplateTokens(project.theme);
  const hasLanding = project.landing_page_enabled;
  const faviconTag = project.avatar_url
    ? `<link rel="icon" href="${project.avatar_url}" type="image/png">`
    : `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>">`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.bot_name}</title>
  ${faviconTag}
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    ${getBaseStyles()}
    ${getThemeCSS(t)}
    ${hasLanding ? getLandingStyles(t) : ''}
  </style>
</head>
<body>
  ${hasLanding ? `
  <!-- Landing Page -->
  <div class="landing-page" id="landingPage">
    <nav class="landing-nav">
      <div class="landing-nav-inner">
        <div class="landing-logo">
          ${project.avatar_url ? `<img src="${project.avatar_url}" alt="${project.bot_name}" class="landing-logo-img">` : '<span class="landing-logo-emoji">🤖</span>'}
          <span class="landing-logo-text">${project.bot_name}</span>
        </div>
        <button class="landing-cta-btn" onclick="showApp()">Open Chat →</button>
      </div>
    </nav>
    <section class="landing-hero">
      <div class="landing-hero-inner">
        <div class="landing-badge">✨ AI-Powered Assistant</div>
        <h1 class="landing-title">${project.bot_name}</h1>
        <p class="landing-subtitle">${project.bot_description || 'Your intelligent AI companion, ready to help 24/7.'}</p>
        <div class="landing-hero-actions">
          <button class="landing-cta-btn landing-cta-big" onclick="showApp()">💬 Start Chatting</button>
          <button class="landing-cta-outline" onclick="document.getElementById('features').scrollIntoView({behavior:'smooth'})">Learn More ↓</button>
        </div>
        <div class="landing-hero-visual">
          <div class="landing-chat-preview">
            <div class="lcp-header">
              ${project.avatar_url ? `<img src="${project.avatar_url}" class="lcp-avatar">` : '<div class="lcp-avatar lcp-avatar-ph">🤖</div>'}
              <span>${project.bot_name}</span>
              <span class="lcp-dot"></span>
            </div>
            <div class="lcp-messages">
              <div class="lcp-msg lcp-user">Hello! What can you do?</div>
              <div class="lcp-msg lcp-bot">I'm ${project.bot_name}! I can answer questions, help with tasks, and have natural conversations. Try me out! 🚀</div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="landing-features" id="features">
      <h2 class="landing-section-title">Why ${project.bot_name}?</h2>
      <div class="landing-features-grid">
        <div class="landing-feature-card">
          <div class="lf-icon">⚡</div>
          <h3>Lightning Fast</h3>
          <p>Get instant responses powered by cutting-edge AI models with minimal latency.</p>
        </div>
        <div class="landing-feature-card">
          <div class="lf-icon">🧠</div>
          <h3>Context Aware</h3>
          <p>Remembers your conversation history for more relevant and helpful replies.</p>
        </div>
        <div class="landing-feature-card">
          <div class="lf-icon">🔒</div>
          <h3>Private & Secure</h3>
          <p>Your conversations stay on your device. No data shared with third parties.</p>
        </div>
        <div class="landing-feature-card">
          <div class="lf-icon">🎨</div>
          <h3>Beautiful UI</h3>
          <p>Thoughtfully designed interface with the "${project.theme.replace('_', ' ')}" theme.</p>
        </div>
      </div>
    </section>
    <section class="landing-cta-section">
      <h2>Ready to get started?</h2>
      <p>Start your first conversation now — no signup required.</p>
      <button class="landing-cta-btn landing-cta-big" onclick="showApp()">💬 Chat Now</button>
    </section>
    <footer class="landing-footer">
      <p>Built with <strong>DevsFlow</strong></p>
    </footer>
  </div>
  ` : ''}

  <div class="app ${hasLanding ? 'app-hidden' : ''}" id="chatApp">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h3>💬 Chats</h3>
        <button class="btn-icon" onclick="newChat()" title="New Chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div class="history-list" id="historyList"></div>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar" id="userAvatarEl"></div>
          <div class="user-details">
            <span class="user-name" id="userNameEl">User</span>
            <span class="user-tier" id="userIdEl"></span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <nav class="top-nav">
        <div class="nav-left">
          <button class="btn-icon sidebar-toggle" onclick="toggleSidebar()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="header-bot-info">
            ${project.avatar_url
              ? `<img src="${project.avatar_url}" alt="${project.bot_name}" class="bot-avatar">`
              : `<div class="bot-avatar bot-avatar-placeholder">🤖</div>`}
            <span class="bot-name">${project.bot_name}</span>
          </div>
        </div>
         <div class="nav-tabs">
          ${hasLanding ? `<button class="nav-tab" onclick="showLanding()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Home
          </button>` : ''}
          <button class="nav-tab active" data-page="chat" onclick="switchPage('chat')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chat
          </button>
          <button class="nav-tab" data-page="about" onclick="switchPage('about')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            About
          </button>
          <button class="nav-tab" data-page="settings" onclick="switchPage('settings')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            Settings
          </button>
        </div>
      </nav>

      <!-- Chat Page -->
      <div class="page active" id="page-chat">
        <div class="chat-messages" id="messages">
          <div class="welcome-message">
            <div class="welcome-icon">${project.avatar_url ? `<img src="${project.avatar_url}" class="welcome-avatar">` : '🤖'}</div>
            <h2>Hello! I'm ${project.bot_name}</h2>
            <p>${project.bot_description || 'How can I help you today?'}</p>
            <div class="quick-actions">
              <button class="quick-btn" onclick="sendQuick('What can you do?')">What can you do?</button>
              <button class="quick-btn" onclick="sendQuick('Help me get started')">Help me get started</button>
              <button class="quick-btn" onclick="sendQuick('Tell me about yourself')">Tell me about yourself</button>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <div class="input-wrapper">
            <textarea class="chat-input" id="input" placeholder="Type a message..." rows="1" onkeydown="handleKeyDown(event)"></textarea>
            <button class="send-btn" id="send" onclick="sendMessage()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <p class="powered-by">Powered by <strong>DevsFlow</strong></p>
        </div>
      </div>

      <!-- About Page -->
      <div class="page" id="page-about">
        <div class="page-content">
          <div class="about-hero">
            ${project.avatar_url
              ? `<img src="${project.avatar_url}" alt="${project.bot_name}" class="about-avatar">`
              : `<div class="about-avatar about-avatar-placeholder">🤖</div>`}
            <h1>${project.bot_name}</h1>
            <p class="about-desc">${project.bot_description || 'An AI-powered assistant built with DevsFlow.'}</p>
          </div>
          <div class="about-cards">
            <div class="about-card"><div class="about-card-icon">⚡</div><h3>Fast Responses</h3><p>Instant AI-powered answers with low latency.</p></div>
            <div class="about-card"><div class="about-card-icon">🧠</div><h3>Smart Context</h3><p>Remembers conversation context for relevant replies.</p></div>
            <div class="about-card"><div class="about-card-icon">🔒</div><h3>Private & Secure</h3><p>Stored locally, never shared with third parties.</p></div>
            <div class="about-card"><div class="about-card-icon">🎨</div><h3>Theme: ${project.theme.replace('_', ' ')}</h3><p>Custom-designed interface for the best experience.</p></div>
          </div>
          <div class="about-stats">
            <div class="stat"><span class="stat-num" id="stat-chats">0</span><span class="stat-label">Chats</span></div>
            <div class="stat"><span class="stat-num" id="stat-messages">0</span><span class="stat-label">Messages</span></div>
            <div class="stat"><span class="stat-num">24/7</span><span class="stat-label">Available</span></div>
          </div>
        </div>
      </div>

      <!-- Settings Page -->
      <div class="page" id="page-settings">
        <div class="page-content">
          <h2 class="settings-title">Settings</h2>
          ${exportData && exportData.selectableModels && exportData.selectableModels.length > 1 ? `
          <div class="settings-section">
            <h3>🤖 AI Model</h3>
            <div class="setting-row">
              <div><strong>Active Model</strong><p>Choose which AI model powers this bot</p></div>
              <select id="modelSelect" onchange="updateSelectedModel(this.value)">
                ${exportData.selectableModels.map((m: any) => `<option value="${m.id}" ${m.is_active ? 'selected' : ''}>${m.provider}/${m.model_name}</option>`).join('')}
              </select>
            </div>
          </div>` : ''}
          <div class="settings-section">
            <h3>🌐 Web Search</h3>
            <div class="setting-row">
              <div><strong>Enable Web Search</strong><p>Allow the bot to search the web for real-time information</p></div>
              <label class="toggle"><input type="checkbox" id="webSearchToggle" ${exportData?.webSearchEnabled ? 'checked' : ''} onchange="updateWebSearch(this.checked)"><span class="toggle-slider"></span></label>
            </div>
          </div>
          <div class="settings-section">
            <h3>📝 Custom Instructions</h3>
            <div class="setting-row" style="flex-direction:column;align-items:stretch;gap:8px">
              <div><strong>Additional Instructions</strong><p>Add extra context or rules for the bot to follow in your conversations</p></div>
              <textarea id="customInstructions" rows="4" placeholder="e.g. Always respond in Spanish. Keep answers under 3 sentences." onchange="updateCustomInstructions(this.value)" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--border);background:var(--hover);color:inherit;font-size:13px;font-family:inherit;resize:vertical;line-height:1.5;"></textarea>
            </div>
          </div>
          <div class="settings-section">
            <h3>Display</h3>
            <div class="setting-row">
              <div><strong>Font Size</strong><p>Adjust the chat message font size</p></div>
              <select id="fontSize" onchange="updateFontSize(this.value)">
                <option value="13">Small</option><option value="14" selected>Medium</option><option value="16">Large</option><option value="18">Extra Large</option>
              </select>
            </div>
            <div class="setting-row">
              <div><strong>Send with Enter</strong><p>Press Enter to send messages</p></div>
              <label class="toggle"><input type="checkbox" id="enterSend" checked onchange="updateEnterSend(this.checked)"><span class="toggle-slider"></span></label>
            </div>
          </div>
          <div class="settings-section">
            <h3>Data</h3>
            <div class="setting-row">
              <div><strong>Export Chats</strong><p>Download all chat history as JSON</p></div>
              <button class="settings-btn" onclick="exportChats()">Export</button>
            </div>
            <div class="setting-row">
              <div><strong>Clear All Chats</strong><p>Delete all conversation history</p></div>
              <button class="settings-btn danger" onclick="clearAllChats()">Clear</button>
            </div>
          </div>
          <div class="settings-section">
            <h3>About</h3>
            <div class="setting-row"><div><strong>Bot ID</strong><p class="mono">${project.id}</p></div></div>
            <div class="setting-row"><div><strong>Mode</strong><p>${project.mode}</p></div></div>
            <div class="setting-row"><div><strong>Your User ID</strong><p class="mono" id="settingsUserId">—</p></div></div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <script>
    const API_URL = '${endpointUrl}';
    const SUPABASE_PUBLISHABLE_KEY = '${(supabasePublishableKey || '').replace(/'/g, "\\'")}';
    const API_KEY = '${project.api_key}';
    const BOT_ID = '${project.id}';
    const BOT_NAME = '${project.bot_name}';
    let enterToSend = true;
    let webSearchEnabled = ${exportData?.webSearchEnabled ? 'true' : 'false'};
    let selectedModelId = ${exportData?.activeModel ? `'${exportData.activeModel.id}'` : 'null'};
    let customInstructions = localStorage.getItem('bf_instructions_' + BOT_ID) || '';
    function updateSelectedModel(modelId) {
      selectedModelId = modelId;
      localStorage.setItem('bf_model_' + BOT_ID, modelId);
    }
    function updateWebSearch(val) {
      webSearchEnabled = val;
      localStorage.setItem('bf_websearch_' + BOT_ID, val ? '1' : '0');
    }
    function updateCustomInstructions(val) {
      customInstructions = val;
      localStorage.setItem('bf_instructions_' + BOT_ID, val);
    }

    // Per-user ID system: each visitor gets a unique persistent ID
    function getOrCreateUserId() {
      let uid = localStorage.getItem('bf_user_id');
      if (!uid) {
        uid = 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
        localStorage.setItem('bf_user_id', uid);
        localStorage.setItem('bf_user_name', 'User ' + uid.slice(-4).toUpperCase());
      }
      return uid;
    }
    const USER_ID = getOrCreateUserId();
    const USER_NAME = localStorage.getItem('bf_user_name') || 'User';
    const STORAGE_KEY = 'bf_chats_' + BOT_ID + '_' + USER_ID;

    // Display user info
    document.getElementById('userAvatarEl').textContent = USER_NAME.charAt(0).toUpperCase();
    document.getElementById('userNameEl').textContent = USER_NAME;
    document.getElementById('userIdEl').textContent = USER_ID.slice(0, 16) + '...';
    const suid = document.getElementById('settingsUserId');
    if (suid) suid.textContent = USER_ID;

    let chats = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let activeChatId = null;

    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

    function newChat() {
      const chat = { id: uid(), title: 'New Chat', messages: [], createdAt: Date.now() };
      chats.unshift(chat);
      activeChatId = chat.id;
      save(); renderHistory(); renderMessages();
      switchPage('chat');
    }

    function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }
    function getActiveChat() { return chats.find(c => c.id === activeChatId); }

    function selectChat(id) { activeChatId = id; renderHistory(); renderMessages(); switchPage('chat'); }

    function deleteChat(id, e) {
      e.stopPropagation();
      chats = chats.filter(c => c.id !== id);
      if (activeChatId === id) activeChatId = chats.length > 0 ? chats[0].id : null;
      save(); renderHistory(); renderMessages();
    }

    function renderHistory() {
      const list = document.getElementById('historyList');
      list.innerHTML = chats.map(c =>
        '<div class="history-item' + (c.id === activeChatId ? ' active' : '') + '" onclick="selectChat(\\'' + c.id + '\\')">' +
          '<span class="history-title">' + escapeHtml(c.title) + '</span>' +
          '<button class="btn-icon-sm" onclick="deleteChat(\\'' + c.id + '\\', event)" title="Delete">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>' +
          '</button>' +
        '</div>'
      ).join('');
    }

    function renderMessages() {
      const container = document.getElementById('messages');
      const chat = getActiveChat();
      if (!chat || chat.messages.length === 0) {
        container.innerHTML = '<div class="welcome-message"><div class="welcome-icon">${project.avatar_url ? `<img src="${project.avatar_url}" class="welcome-avatar">` : '🤖'}</div><h2>Hello! I\\'m ' + BOT_NAME + '</h2><p>${(project.bot_description || 'How can I help you today?').replace(/'/g, "\\'")}</p><div class="quick-actions"><button class="quick-btn" onclick="sendQuick(\\'What can you do?\\')">What can you do?</button><button class="quick-btn" onclick="sendQuick(\\'Help me get started\\')">Help me get started</button></div></div>';
        return;
      }
      container.innerHTML = chat.messages.map(m =>
        '<div class="message ' + m.role + '">' +
          (m.role === 'assistant' ? '<div class="msg-avatar">🤖</div>' : '') +
          '<div class="msg-bubble"><div class="msg-content">' + formatMessage(m.content) + '</div><span class="msg-time">' + new Date(m.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</span></div>' +
        '</div>'
      ).join('');
      container.scrollTop = container.scrollHeight;
      updateStats();
    }

    function formatMessage(text) {
      var html = escapeHtml(text);
      html = html.replace(new RegExp('\`\`\`(\\\\w*)\\\\n([\\\\s\\\\S]*?)\`\`\`', 'g'), '<pre class="code-block"><code>$2</code></pre>');
      html = html.replace(new RegExp('\`(.+?)\`', 'g'), '<code class="inline-code">$1</code>');
      html = html.replace(new RegExp('^### (.+)$', 'gm'), '<h4 class="md-h">$1</h4>');
      html = html.replace(new RegExp('^## (.+)$', 'gm'), '<h3 class="md-h">$1</h3>');
      html = html.replace(new RegExp('^# (.+)$', 'gm'), '<h2 class="md-h">$1</h2>');
      html = html.replace(new RegExp('\\\\*\\\\*(.+?)\\\\*\\\\*', 'g'), '<strong>$1</strong>');
      html = html.replace(new RegExp('\\\\*(.+?)\\\\*', 'g'), '<em>$1</em>');
      html = html.replace(new RegExp('^- (.+)$', 'gm'), '<li class="md-li">$1</li>');
      html = html.replace(new RegExp('^\\\\d+\\\\. (.+)$', 'gm'), '<li class="md-li md-ol">$1</li>');
      html = html.replace(new RegExp('\\\\[(.+?)\\\\]\\\\((.+?)\\\\)', 'g'), '<a href="$2" target="_blank" class="md-link">$1</a>');
      html = html.replace(new RegExp('\\\\n', 'g'), '<br>');
      return html;
    }

    function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function handleKeyDown(e) { if (e.key === 'Enter' && !e.shiftKey && enterToSend) { e.preventDefault(); sendMessage(); } }
    function sendQuick(text) { document.getElementById('input').value = text; sendMessage(); }

    function autoResize() {
      const el = document.getElementById('input');
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
    document.getElementById('input').addEventListener('input', autoResize);

    async function sendMessage() {
      const input = document.getElementById('input');
      const text = input.value.trim();
      if (!text) return;
      if (!activeChatId) newChat();
      const chat = getActiveChat();
      input.value = ''; autoResize();

      chat.messages.push({ role: 'user', content: text, ts: Date.now() });
      if (chat.messages.length === 1) chat.title = text.slice(0, 40) + (text.length > 40 ? '...' : '');
      save(); renderHistory(); renderMessages();

      const container = document.getElementById('messages');
      const typing = document.createElement('div');
      typing.className = 'message assistant typing-msg';
      typing.innerHTML = '<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
      container.appendChild(typing);
      container.scrollTop = container.scrollHeight;

       try {
         const headers = { 'Content-Type': 'application/json' };
         // Supabase Edge Functions require auth headers unless verify_jwt is disabled.
         if (SUPABASE_PUBLISHABLE_KEY) {
           headers['apikey'] = SUPABASE_PUBLISHABLE_KEY;
           headers['Authorization'] = 'Bearer ' + SUPABASE_PUBLISHABLE_KEY;
         }

         const res = await fetch(API_URL, {
           method: 'POST',
           headers,
           body: JSON.stringify({ bot_id: BOT_ID, api_key: API_KEY, message: text, session_id: USER_ID, model_id: selectedModelId, web_search: webSearchEnabled, custom_instructions: customInstructions, history: chat.messages.filter(function(m) { return m.role !== 'system'; }).map(function(m) { return { role: m.role, content: m.content }; }) })
         });

         const raw = await res.text();
         let data = {};
         try { data = JSON.parse(raw || '{}'); } catch { data = {}; }
         if (!res.ok) throw new Error(data.error || raw || ('Request failed (' + res.status + ')'));

         typing.remove();
         chat.messages.push({ role: 'assistant', content: data.reply || 'Sorry, something went wrong.', ts: Date.now() });
       } catch(err) {
         typing.remove();
         chat.messages.push({ role: 'assistant', content: 'Error connecting to the server.', ts: Date.now() });
       }
      save(); renderMessages();
    }

    function switchPage(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-tab[data-page]').forEach(t => t.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      const tab = document.querySelector('.nav-tab[data-page="' + page + '"]');
      if (tab) tab.classList.add('active');
      if (page === 'about') updateStats();
    }

    function toggleSidebar() { document.querySelector('.app').classList.toggle('sidebar-collapsed'); }

    function updateFontSize(size) {
      document.documentElement.style.setProperty('--msg-font-size', size + 'px');
      localStorage.setItem('bf_fontSize_' + BOT_ID, size);
    }
    function updateEnterSend(val) { enterToSend = val; }
    function exportChats() {
      const blob = new Blob([JSON.stringify(chats, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = BOT_NAME.toLowerCase().replace(/\\s+/g,'-') + '-chats.json'; a.click();
      URL.revokeObjectURL(url);
    }
    function clearAllChats() {
      if (confirm('Delete all chats? This cannot be undone.')) {
        chats = []; activeChatId = null; save(); renderHistory(); renderMessages(); newChat();
      }
    }
    function updateStats() {
      const totalMessages = chats.reduce((a, c) => a + c.messages.length, 0);
      const el1 = document.getElementById('stat-chats'); if(el1) el1.textContent = chats.length;
      const el2 = document.getElementById('stat-messages'); if(el2) el2.textContent = totalMessages;
    }

    // Landing page functions
    function showApp() {
      const lp = document.getElementById('landingPage');
      const app = document.getElementById('chatApp');
      if (lp) lp.style.display = 'none';
      if (app) { app.classList.remove('app-hidden'); app.style.display = 'flex'; }
    }
    function showLanding() {
      const lp = document.getElementById('landingPage');
      const app = document.getElementById('chatApp');
      if (lp) lp.style.display = 'block';
      if (app) { app.classList.add('app-hidden'); app.style.display = 'none'; }
    }

    // Init
    const savedFontSize = localStorage.getItem('bf_fontSize_' + BOT_ID);
    if (savedFontSize) { document.documentElement.style.setProperty('--msg-font-size', savedFontSize + 'px'); const sel = document.getElementById('fontSize'); if(sel) sel.value = savedFontSize; }
    const savedModel = localStorage.getItem('bf_model_' + BOT_ID);
    if (savedModel) { selectedModelId = savedModel; const msel = document.getElementById('modelSelect'); if(msel) msel.value = savedModel; }
    const savedWs = localStorage.getItem('bf_websearch_' + BOT_ID);
    if (savedWs !== null) { webSearchEnabled = savedWs === '1'; const wst = document.getElementById('webSearchToggle'); if(wst) wst.checked = webSearchEnabled; }
    const savedInstr = localStorage.getItem('bf_instructions_' + BOT_ID);
    if (savedInstr) { customInstructions = savedInstr; const ci = document.getElementById('customInstructions'); if(ci) ci.value = savedInstr; }
    if (chats.length === 0) newChat(); else activeChatId = chats[0].id;
    renderHistory(); renderMessages();
  </script>
</body>
</html>`;
}

function getBaseStyles(): string {
  return `
    :root { --msg-font-size: 14px; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',system-ui,sans-serif; height:100vh; overflow:hidden; }
    .app { display:flex; height:100vh; transition:all .3s ease; }
    .app-hidden { display:none !important; }

    /* Markdown */
    .code-block { background:rgba(0,0,0,0.15); padding:12px 16px; border-radius:8px; margin:8px 0; overflow-x:auto; font-size:13px; line-height:1.6; white-space:pre-wrap; }
    .inline-code { background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; font-size:0.9em; font-family:'Fira Code',monospace; }
    .md-h { margin:12px 0 6px; font-weight:700; }
    h2.md-h { font-size:1.3em; } h3.md-h { font-size:1.15em; } h4.md-h { font-size:1.05em; }
    .md-li { margin-left:20px; list-style:disc; margin-bottom:2px; }
    .md-li.md-ol { list-style:decimal; }
    .md-link { color:var(--accent); text-decoration:underline; text-underline-offset:2px; }

    /* Sidebar */
    .sidebar { width:280px; display:flex; flex-direction:column; border-right:1px solid var(--border); transition:width .3s cubic-bezier(.4,0,.2,1),opacity .3s; overflow:hidden; flex-shrink:0; }
    .sidebar-collapsed .sidebar { width:0; opacity:0; }
    .sidebar-header { padding:16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
    .sidebar-header h3 { font-size:14px; font-weight:600; }
    .sidebar-footer { padding:12px 16px; border-top:1px solid var(--border); margin-top:auto; }
    .user-info { display:flex; align-items:center; gap:10px; }
    .user-avatar { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; }
    .user-details { display:flex; flex-direction:column; }
    .user-name { font-size:13px; font-weight:500; }
    .user-tier { font-size:10px; opacity:.5; font-family:monospace; }
    .history-list { flex:1; overflow-y:auto; padding:8px; }
    .history-item { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; cursor:pointer; transition:all .15s; margin-bottom:2px; }
    .history-item:hover { background:var(--hover); }
    .history-item.active { background:var(--active); }
    .history-title { font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }

    .main-content { flex:1; display:flex; flex-direction:column; min-width:0; }

    /* Top Nav */
    .top-nav { padding:8px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; }
    .nav-left { display:flex; align-items:center; gap:12px; }
    .header-bot-info { display:flex; align-items:center; gap:8px; }
    .bot-avatar { width:32px; height:32px; border-radius:8px; object-fit:cover; }
    .bot-avatar-placeholder { display:flex; align-items:center; justify-content:center; font-size:18px; }
    .bot-name { font-size:15px; font-weight:600; }
    .nav-tabs { display:flex; gap:4px; }
    .nav-tab { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:500; color:inherit; opacity:.6; transition:all .15s; font-family:inherit; }
    .nav-tab:hover { opacity:.9; background:var(--hover); }
    .nav-tab.active { opacity:1; background:var(--active); }

    /* Pages */
    .page { display:none; flex:1; flex-direction:column; overflow:hidden; }
    .page.active { display:flex; }
    .page-content { flex:1; overflow-y:auto; padding:32px; max-width:720px; margin:0 auto; width:100%; }

    /* Chat */
    .chat-messages { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
    .welcome-message { text-align:center; padding:60px 20px; opacity:.8; }
    .welcome-icon { font-size:48px; margin-bottom:16px; }
    .welcome-avatar { width:64px; height:64px; border-radius:16px; object-fit:cover; }
    .welcome-message h2 { font-size:22px; font-weight:700; margin-bottom:8px; }
    .welcome-message p { font-size:14px; opacity:.7; margin-bottom:20px; }
    .quick-actions { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
    .quick-btn { padding:8px 16px; border-radius:20px; border:1px solid var(--border); background:var(--hover); cursor:pointer; font-size:13px; font-family:inherit; color:inherit; transition:all .2s; }
    .quick-btn:hover { background:var(--active); border-color:var(--accent); transform:translateY(-1px); }

    .message { display:flex; gap:10px; max-width:80%; animation:slideUp .3s cubic-bezier(.4,0,.2,1); }
    .message.user { align-self:flex-end; flex-direction:row-reverse; }
    .msg-avatar { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
    .msg-bubble { padding:12px 16px; border-radius:18px; line-height:1.6; font-size:var(--msg-font-size); position:relative; box-shadow:0 2px 8px rgba(0,0,0,0.06); }
    .msg-time { display:block; font-size:10px; opacity:.4; margin-top:6px; }
    .msg-content { white-space:pre-wrap; word-break:break-word; }
    .message.user .msg-bubble { border-bottom-right-radius:4px; }
    .message.assistant .msg-bubble { border-bottom-left-radius:4px; }

    .typing-dots { display:flex; gap:4px; padding:4px 0; }
    .typing-dots span { width:6px; height:6px; border-radius:50%; background:currentColor; opacity:.4; animation:bounce .6s infinite alternate; }
    .typing-dots span:nth-child(2) { animation-delay:.2s; }
    .typing-dots span:nth-child(3) { animation-delay:.4s; }

    .chat-input-area { padding:12px 16px 8px; flex-shrink:0; }
    .input-wrapper { display:flex; align-items:flex-end; gap:8px; border:1px solid var(--border); border-radius:14px; padding:6px 6px 6px 14px; transition:border-color .2s,box-shadow .2s; }
    .input-wrapper:focus-within { border-color:var(--accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
    .chat-input { flex:1; border:none; outline:none; resize:none; font-size:14px; font-family:inherit; line-height:1.5; background:transparent; color:inherit; min-height:24px; max-height:120px; }
    .send-btn { width:40px; height:40px; border-radius:12px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s cubic-bezier(.4,0,.2,1); flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.15); }
    .send-btn:hover { transform:scale(1.1) translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,0.2); }
    .send-btn:active { transform:scale(0.95); }
    .powered-by { text-align:center; font-size:11px; opacity:.4; padding:6px 0; }

    /* About */
    .about-hero { text-align:center; padding:24px 0 32px; }
    .about-avatar { width:80px; height:80px; border-radius:20px; object-fit:cover; margin-bottom:16px; }
    .about-avatar-placeholder { display:inline-flex; align-items:center; justify-content:center; font-size:40px; width:80px; height:80px; border-radius:20px; }
    .about-hero h1 { font-size:28px; font-weight:700; margin-bottom:8px; }
    .about-desc { font-size:15px; opacity:.7; max-width:400px; margin:0 auto; }
    .about-cards { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin:24px 0; }
    .about-card { padding:20px; border-radius:16px; border:1px solid var(--border); background:var(--hover); transition:all .3s; position:relative; overflow:hidden; }
    .about-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--accent); transform:scaleX(0); transition:transform .3s; }
    .about-card:hover { transform:translateY(-4px); box-shadow:0 12px 24px rgba(0,0,0,0.1); border-color:var(--accent); }
    .about-card:hover::before { transform:scaleX(1); }
    .about-card-icon { font-size:28px; margin-bottom:10px; }
    .about-card h3 { font-size:15px; font-weight:600; margin-bottom:6px; }
    .about-card p { font-size:13px; opacity:.7; line-height:1.5; }
    .about-stats { display:flex; justify-content:center; gap:48px; padding:32px 0; }
    .stat { display:flex; flex-direction:column; align-items:center; transition:transform .2s; }
    .stat:hover { transform:scale(1.1); }
    .stat-num { font-size:32px; font-weight:800; background:linear-gradient(135deg,var(--accent),var(--accent)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .stat-label { font-size:12px; opacity:.6; margin-top:4px; text-transform:uppercase; letter-spacing:.5px; }

    /* Settings */
    .settings-title { font-size:22px; font-weight:700; margin-bottom:24px; }
    .settings-section { margin-bottom:24px; }
    .settings-section h3 { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; opacity:.5; margin-bottom:12px; }
    .setting-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid var(--border); }
    .setting-row strong { font-size:14px; }
    .setting-row p { font-size:12px; opacity:.6; margin-top:2px; }
    .setting-row .mono { font-family:monospace; font-size:11px; }
    .settings-btn { padding:8px 16px; border-radius:8px; border:1px solid var(--border); background:var(--hover); cursor:pointer; font-size:13px; font-family:inherit; color:inherit; transition:all .15s; }
    .settings-btn:hover { background:var(--active); }
    .settings-btn.danger { color:var(--danger); border-color:var(--danger); }
    .settings-btn.danger:hover { background:var(--danger); color:#fff; }
    select { padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:var(--hover); color:inherit; font-size:13px; font-family:inherit; cursor:pointer; }
    .toggle { position:relative; width:44px; height:24px; display:inline-block; }
    .toggle input { opacity:0; width:0; height:0; }
    .toggle-slider { position:absolute; inset:0; background:var(--border); border-radius:12px; transition:.2s; cursor:pointer; }
    .toggle-slider:before { content:''; position:absolute; width:18px; height:18px; border-radius:50%; background:#fff; left:3px; top:3px; transition:.2s; }
    .toggle input:checked + .toggle-slider { background:var(--accent); }
    .toggle input:checked + .toggle-slider:before { transform:translateX(20px); }

    .btn-icon { background:none; border:none; cursor:pointer; padding:6px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:inherit; opacity:.7; transition:all .15s; }
    .btn-icon:hover { opacity:1; background:var(--hover); }
    .btn-icon-sm { background:none; border:none; cursor:pointer; padding:4px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:inherit; opacity:0; transition:all .15s; }
    .history-item:hover .btn-icon-sm { opacity:.5; }
    .btn-icon-sm:hover { opacity:1 !important; color:var(--danger); }

    @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes bounce { to { opacity:1; transform:translateY(-4px); } }
    @keyframes glow { 0%,100% { box-shadow:0 0 5px var(--accent); } 50% { box-shadow:0 0 20px var(--accent); } }
    @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }

    /* Config page */
    .config-tool-card { border:1px solid var(--border); border-radius:12px; padding:4px 0; margin-bottom:12px; overflow:hidden; }
    .config-tool-card .setting-row { border-bottom:none; }
    .config-method { display:inline-block; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:700; font-family:monospace; background:var(--accent); color:#fff; margin-right:6px; vertical-align:middle; }
    .config-badge { display:inline-block; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:500; background:var(--hover); border:1px solid var(--border); }
    .config-badge-sm { display:inline-block; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:500; background:var(--hover); border:1px solid var(--border); }
    .config-req { background:var(--danger); color:#fff; border-color:var(--danger); }
    .config-writable { background:var(--accent); color:#fff; border-color:var(--accent); }
    .config-params { padding:8px 14px 12px; border-top:1px solid var(--border); background:var(--hover); }
    .config-param-row { display:flex; align-items:center; gap:6px; padding:4px 0; flex-wrap:wrap; }
    .config-param-row code { font-size:12px; font-weight:600; }
    .config-link { font-size:12px; color:var(--accent); text-decoration:underline; text-underline-offset:2px; }

    @media(max-width:640px) {
      .sidebar { position:fixed; left:0; top:0; height:100vh; z-index:50; }
      .sidebar-collapsed .sidebar { width:0; }
      .about-cards { grid-template-columns:1fr; }
      .nav-tabs { gap:2px; }
      .nav-tab { padding:6px 10px; font-size:12px; }
    }
  `;
}

function getLandingStyles(t: ThemeTokens): string {
  return `
    .landing-page { min-height:100vh; overflow-y:auto; }
    body:has(.landing-page) { overflow:auto; }
    .landing-nav { position:sticky; top:0; z-index:100; backdrop-filter:blur(20px); border-bottom:1px solid var(--border); }
    .landing-nav-inner { max-width:1100px; margin:0 auto; padding:16px 24px; display:flex; align-items:center; justify-content:space-between; }
    .landing-logo { display:flex; align-items:center; gap:10px; }
    .landing-logo-img { width:36px; height:36px; border-radius:10px; object-fit:cover; }
    .landing-logo-emoji { font-size:28px; }
    .landing-logo-text { font-size:18px; font-weight:700; }
    .landing-cta-btn { padding:10px 24px; border-radius:10px; border:none; background:${t.accent}; color:#fff; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .2s; }
    .landing-cta-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.2); }
    .landing-cta-big { padding:14px 32px; font-size:16px; border-radius:14px; }
    .landing-cta-outline { padding:14px 32px; font-size:16px; border-radius:14px; border:2px solid var(--border); background:transparent; color:inherit; cursor:pointer; font-family:inherit; font-weight:600; transition:all .2s; }
    .landing-cta-outline:hover { border-color:${t.accent}; background:var(--hover); }
    .landing-hero { padding:80px 24px 60px; text-align:center; }
    .landing-hero-inner { max-width:800px; margin:0 auto; }
    .landing-badge { display:inline-block; padding:6px 16px; border-radius:20px; font-size:13px; font-weight:500; border:1px solid var(--border); background:var(--hover); margin-bottom:24px; animation:fadeIn .6s; }
    .landing-title { font-size:clamp(36px,6vw,64px); font-weight:900; line-height:1.1; margin-bottom:20px; background:linear-gradient(135deg,${t.fg},${t.accent}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:fadeIn .8s; }
    .landing-subtitle { font-size:clamp(16px,2vw,20px); opacity:.7; max-width:500px; margin:0 auto 32px; line-height:1.6; animation:fadeIn 1s; }
    .landing-hero-actions { display:flex; gap:16px; justify-content:center; margin-bottom:60px; animation:fadeIn 1.2s; }
    .landing-hero-visual { animation:float 6s ease-in-out infinite; }
    .landing-chat-preview { max-width:380px; margin:0 auto; border:1px solid var(--border); border-radius:16px; overflow:hidden; background:var(--hover); box-shadow:0 20px 60px rgba(0,0,0,0.12); }
    .lcp-header { padding:12px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; }
    .lcp-avatar { width:28px; height:28px; border-radius:8px; object-fit:cover; }
    .lcp-avatar.lcp-avatar-ph { display:flex; align-items:center; justify-content:center; font-size:16px; background:var(--active); }
    .lcp-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; margin-left:auto; }
    .lcp-messages { padding:16px; display:flex; flex-direction:column; gap:10px; }
    .lcp-msg { padding:10px 14px; border-radius:14px; font-size:13px; line-height:1.5; max-width:85%; }
    .lcp-user { align-self:flex-end; background:${t.userBubble}; color:${t.userBubbleFg}; }
    .lcp-bot { align-self:flex-start; background:${t.botBubble}; color:${t.botBubbleFg}; }
    .landing-features { padding:60px 24px; max-width:1000px; margin:0 auto; }
    .landing-section-title { font-size:28px; font-weight:800; text-align:center; margin-bottom:40px; }
    .landing-features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px; }
    .landing-feature-card { padding:28px; border-radius:16px; border:1px solid var(--border); background:var(--hover); transition:all .3s; }
    .landing-feature-card:hover { transform:translateY(-6px); box-shadow:0 16px 40px rgba(0,0,0,0.1); border-color:${t.accent}; }
    .lf-icon { font-size:32px; margin-bottom:12px; }
    .landing-feature-card h3 { font-size:16px; font-weight:600; margin-bottom:8px; }
    .landing-feature-card p { font-size:13px; opacity:.7; line-height:1.6; }
    .landing-cta-section { text-align:center; padding:80px 24px; }
    .landing-cta-section h2 { font-size:32px; font-weight:800; margin-bottom:12px; }
    .landing-cta-section p { font-size:16px; opacity:.7; margin-bottom:28px; }
    .landing-footer { text-align:center; padding:24px; opacity:.5; font-size:13px; border-top:1px solid var(--border); }
  `;
}

interface ThemeTokens {
  bg: string; fg: string; sidebar: string; sidebarFg: string; border: string;
  hover: string; active: string; accent: string; userBubble: string; userBubbleFg: string;
  botBubble: string; botBubbleFg: string; avatarBg: string; sendBg: string; sendFg: string;
  danger: string;
}

function getTemplateTokens(theme: string): ThemeTokens {
  switch (theme) {
    case 'glass':
      return { bg:'linear-gradient(135deg,#667eea,#764ba2)', fg:'#fff', sidebar:'rgba(255,255,255,0.1)', sidebarFg:'#fff', border:'rgba(255,255,255,0.15)', hover:'rgba(255,255,255,0.1)', active:'rgba(255,255,255,0.2)', accent:'#a78bfa', userBubble:'rgba(255,255,255,0.9)', userBubbleFg:'#333', botBubble:'rgba(255,255,255,0.15)', botBubbleFg:'#fff', avatarBg:'rgba(255,255,255,0.2)', sendBg:'rgba(255,255,255,0.9)', sendFg:'#333', danger:'#f87171' };
    case 'dark':
      return { bg:'#0a0a0a', fg:'#e5e5e5', sidebar:'#111', sidebarFg:'#e5e5e5', border:'#222', hover:'#1a1a1a', active:'#252525', accent:'#818cf8', userBubble:'#6366f1', userBubbleFg:'#fff', botBubble:'#1a1a1a', botBubbleFg:'#e5e5e5', avatarBg:'#222', sendBg:'#6366f1', sendFg:'#fff', danger:'#f87171' };
    case 'modern_ai':
      return { bg:'#f8f9fa', fg:'#1a1a2e', sidebar:'#fff', sidebarFg:'#1a1a2e', border:'#e9ecef', hover:'#f1f3f5', active:'#e9ecef', accent:'#7c3aed', userBubble:'linear-gradient(135deg,#667eea,#764ba2)', userBubbleFg:'#fff', botBubble:'#f1f3f5', botBubbleFg:'#1a1a2e', avatarBg:'#ede9fe', sendBg:'linear-gradient(135deg,#667eea,#764ba2)', sendFg:'#fff', danger:'#ef4444' };
    default:
      return { bg:'#fff', fg:'#1a1a1a', sidebar:'#fafafa', sidebarFg:'#1a1a1a', border:'#e5e5e5', hover:'#f5f5f5', active:'#ebebeb', accent:'#1a1a1a', userBubble:'#1a1a1a', userBubbleFg:'#fff', botBubble:'#f5f5f5', botBubbleFg:'#1a1a1a', avatarBg:'#f5f5f5', sendBg:'#1a1a1a', sendFg:'#fff', danger:'#ef4444' };
  }
}

function getThemeCSS(t: ThemeTokens): string {
  return `
    :root {
      --border:${t.border}; --hover:${t.hover}; --active:${t.active};
      --accent:${t.accent}; --danger:${t.danger};
    }
    body { background:${t.bg}; color:${t.fg}; }
    .sidebar { background:${t.sidebar}; color:${t.sidebarFg}; }
    .user-avatar { background:${t.avatarBg}; color:${t.fg}; }
    .msg-avatar { background:${t.avatarBg}; }
    .message.user .msg-bubble { background:${t.userBubble}; color:${t.userBubbleFg}; }
    .message.assistant .msg-bubble { background:${t.botBubble}; color:${t.botBubbleFg}; }
    .send-btn { background:${t.sendBg}; color:${t.sendFg}; }
    .chat-input { color:${t.fg}; }
    .about-avatar-placeholder { background:${t.avatarBg}; }
    .landing-page { background:${t.bg}; color:${t.fg}; }
    .landing-nav { background:${t.bg.includes('gradient') ? 'rgba(0,0,0,0.2)' : t.sidebar}; }
    ${t.bg.includes('gradient') ? '.main-content { background:rgba(255,255,255,0.08); backdrop-filter:blur(20px); }' : ''}
  `;
}
