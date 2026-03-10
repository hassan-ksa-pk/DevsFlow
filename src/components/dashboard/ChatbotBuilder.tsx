import { useState, useEffect } from 'react';
import { ChatbotProject, ChatbotModel, CustomAction } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, Plus, Trash2, Upload, Palette, Brain, Zap, Globe, Code2,
  Check, Loader2, MessageSquare, ArrowLeft, Eye, Code, Wrench,
  BookOpen, Lock, Unlock, Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import KnowledgeBase from './KnowledgeBase';
import ToolsManager from './ToolsManager';
import { generateExportHtml } from './DashboardOverview';

interface ChatbotBuilderProps {
  project: ChatbotProject | null;
  onCreateProject: () => void;
  onUpdateProject: (updates: Partial<ChatbotProject>) => void;
  onBack?: () => void;
}

const themes = [
  { id: 'minimal', name: 'Minimal', description: 'Clean and simple', preview: 'bg-background border' },
  { id: 'glass', name: 'Glass', description: 'Frosted glass effect', preview: 'bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur' },
  { id: 'dark', name: 'Dark', description: 'Dark mode style', preview: 'bg-gray-900' },
  { id: 'modern_ai', name: 'Modern AI', description: 'Gradient accents', preview: 'gradient-primary' },
] as const;

const modes = [
  { id: 'standard', name: 'Standard AI', description: 'Normal AI conversation', icon: MessageSquare },
  { id: 'n8n', name: 'n8n Workflow', description: 'Connect to n8n webhooks', icon: Zap },
] as const;

const providers = [
  { value: 'lovable_ai', label: 'Advanced AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'groq', label: 'Groq' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'custom', label: 'Custom Endpoint' },
];

const modelsByProvider: Record<string, { value: string; label: string }[]> = {
  lovable_ai: [
    { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (Preview)' },
    { value: 'openai/gpt-5', label: 'GPT-5' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano' },
    { value: 'openai/gpt-5.2', label: 'GPT-5.2' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    { value: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (OpenAI)' },
    { value: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (OpenAI)' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  google: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  mistral: [
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'mistral-small-latest', label: 'Mistral Small' },
  ],
  custom: [],
};

export default function ChatbotBuilder({ project, onCreateProject, onUpdateProject, onBack }: ChatbotBuilderProps) {
  const { toast } = useToast();
  const [models, setModels] = useState<ChatbotModel[]>([]);
  const [actions, setActions] = useState<CustomAction[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingModel, setSavingModel] = useState(false);

  const [botName, setBotName] = useState(project?.bot_name || '');
  const [botDescription, setBotDescription] = useState(project?.bot_description || '');
  const [systemPrompt, setSystemPrompt] = useState(project?.system_prompt || '');
  const [webhookUrl, setWebhookUrl] = useState(project?.webhook_url || '');

  const [newModelProvider, setNewModelProvider] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [useCustomModelName, setUseCustomModelName] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');
  const [newModelVisibility, setNewModelVisibility] = useState<'selectable' | 'locked'>('selectable');
  // Preview chat state
  const [previewMessages, setPreviewMessages] = useState<{role: string; content: string}[]>([]);
  const [previewInput, setPreviewInput] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Full hosted/export HTML (editable)
  const [fullHtml, setFullHtml] = useState('');
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [htmlSaving, setHtmlSaving] = useState(false);

  // UI shape
  const [uiShape, setUiShape] = useState<'rounded' | 'sharp'>('rounded');

  useEffect(() => {
    if (project) {
      setBotName(project.bot_name);
      setBotDescription(project.bot_description || '');
      setSystemPrompt(project.system_prompt || '');
      setWebhookUrl(project.webhook_url || '');
      setFullHtml((project as any).custom_html || '');
      fetchModels();
      fetchActions();
    }
  }, [project]);

  const getEndpointUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-chat`;

  const buildExportData = async () => {
    if (!project) return null;
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
    return {
      tools: tools.map((t: any) => ({ ...t, parameters: toolParams[t.id] || [] })),
      variables: varsRes.data || [],
      kbFiles: kbFilesRes.data || [],
      kbPages: kbPagesRes.data || [],
      webSearchEnabled: (project as any).web_search_enabled ?? false,
      selectableModels,
      activeModel: activeModel || null,
    };
  };

  const generateCurrentHtml = async () => {
    if (!project) return;
    setHtmlLoading(true);
    try {
      const exportData = await buildExportData();
      if (!exportData) return;
      const html = generateExportHtml(
        project,
        getEndpointUrl(),
        null,
        exportData as any,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      );
      setFullHtml(html);
      toast({ title: 'Generated', description: 'HTML has been generated from your current bot settings.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Could not generate HTML', variant: 'destructive' });
    } finally {
      setHtmlLoading(false);
    }
  };

  const saveHostedHtml = async () => {
    if (!project) return;
    setHtmlSaving(true);
    try {
      onUpdateProject({ custom_html: fullHtml } as any);
      toast({ title: 'Saving...', description: 'Your hosted HTML is being saved.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Could not save HTML', variant: 'destructive' });
    } finally {
      setHtmlSaving(false);
    }
  };

  const fetchModels = async () => {
    if (!project) return;
    const { data } = await supabase.from('chatbot_models').select('*').eq('project_id', project.id);
    setModels((data as ChatbotModel[]) || []);
  };

  const fetchActions = async () => {
    if (!project) return;
    const { data } = await supabase.from('custom_actions').select('*').eq('project_id', project.id);
    setActions((data as CustomAction[]) || []);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${project.user_id}/${project.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      onUpdateProject({ avatar_url: publicUrl });
    } catch {
      toast({ title: 'Upload failed', description: 'Could not upload avatar', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleAddModel = async () => {
    const modelToSave = useCustomModelName && customModelName ? customModelName : newModelName;
    if (!project || !newModelProvider || !modelToSave) return;
    setSavingModel(true);
    try {
      const { data, error } = await supabase
        .from('chatbot_models')
        .insert({ project_id: project.id, provider: newModelProvider, model_name: modelToSave, api_key: newModelApiKey || null, visibility: newModelVisibility })
        .select().single();
      if (error) throw error;
      setModels([...models, data as ChatbotModel]);
      setNewModelProvider('');
      setNewModelName('');
      setUseCustomModelName(false);
      setCustomModelName('');
      setNewModelApiKey('');
      setNewModelVisibility('selectable');
      toast({ title: 'Model added!', description: `${newModelProvider}/${modelToSave} has been added.` });
    } catch {
      toast({ title: 'Error', description: 'Could not add model', variant: 'destructive' });
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    await supabase.from('chatbot_models').delete().eq('id', modelId);
    setModels(models.filter(m => m.id !== modelId));
    toast({ title: 'Model removed' });
  };

  const handleSetActiveModel = async (modelId: string) => {
    await supabase.from('chatbot_models').update({ is_active: false }).eq('project_id', project!.id);
    await supabase.from('chatbot_models').update({ is_active: true }).eq('id', modelId);
    setModels(models.map(m => ({ ...m, is_active: m.id === modelId })));
    toast({ title: 'Model activated' });
  };

  const handleToggleVisibility = async (modelId: string, vis: 'selectable' | 'locked') => {
    await supabase.from('chatbot_models').update({ visibility: vis }).eq('id', modelId);
    setModels(models.map(m => m.id === modelId ? { ...m, visibility: vis } : m));
    toast({ title: vis === 'selectable' ? 'Model visible to users' : 'Model locked to dashboard' });
  };

  // Simulated preview chat
  const sendPreviewMessage = async () => {
    if (!previewInput.trim() || !project) return;
    const userMsg = previewInput.trim();
    setPreviewInput('');
    setPreviewMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setPreviewLoading(true);

    try {
      const endpointUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-chat`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Supabase Edge Functions require auth headers unless verify_jwt is disabled.
      if (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
        headers.apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
      }

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bot_id: project.id,
          api_key: project.api_key,
          message: userMsg,
          history: previewMessages.concat([{ role: 'user', content: userMsg }]),
        }),
      });

      const raw = await res.text();
      let data: any = {};
      try { data = JSON.parse(raw || '{}'); } catch { data = {}; }
      if (!res.ok) throw new Error(data?.error || raw || `Request failed (${res.status})`);
      setPreviewMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'No response' }]);
    } catch (e: any) {
      setPreviewMessages(prev => [...prev, { role: 'assistant', content: e?.message || 'Error connecting to server.' }]);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mx-auto mb-6">
          <Bot className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-4">Select a Bot</h1>
        <p className="text-muted-foreground mb-8">
          Select a bot from the overview or create a new one to start building.
        </p>
        <div className="flex gap-3 justify-center">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Bots
            </Button>
          )}
          <Button size="lg" className="gradient-primary" onClick={onCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Bot
          </Button>
        </div>
      </div>
    );
  }

  const availableModels = modelsByProvider[newModelProvider] || [];
  const borderRadius = uiShape === 'rounded' ? '18px' : '4px';
  const themeColors: Record<string, { bg: string; fg: string; accent: string; userBg: string; botBg: string }> = {
    minimal: { bg: '#fff', fg: '#1a1a1a', accent: '#1a1a1a', userBg: '#1a1a1a', botBg: '#f5f5f5' },
    glass: { bg: 'linear-gradient(135deg,#667eea,#764ba2)', fg: '#fff', accent: '#a78bfa', userBg: 'rgba(255,255,255,0.9)', botBg: 'rgba(255,255,255,0.15)' },
    dark: { bg: '#0a0a0a', fg: '#e5e5e5', accent: '#818cf8', userBg: '#6366f1', botBg: '#1a1a1a' },
    modern_ai: { bg: '#f8f9fa', fg: '#1a1a2e', accent: '#7c3aed', userBg: 'linear-gradient(135deg,#667eea,#764ba2)', botBg: '#f1f3f5' },
  };
  const tc = themeColors[project.theme] || themeColors.minimal;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-display font-bold">{project.bot_name}</h1>
          <p className="text-muted-foreground">Customize your chatbot</p>
        </div>
      </div>

      <Tabs defaultValue="identity" className="space-y-6">
        <div className="space-y-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity" className="gap-1.5"><Bot className="h-3.5 w-3.5" /> Identity</TabsTrigger>
            <TabsTrigger value="behavior" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> Behavior</TabsTrigger>
            <TabsTrigger value="knowledge" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Knowledge</TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5"><Wrench className="h-3.5 w-3.5" /> Tools</TabsTrigger>
            <TabsTrigger value="models" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Models</TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="theme" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Theme</TabsTrigger>
            <TabsTrigger value="mode" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Mode</TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</TabsTrigger>
            <TabsTrigger value="code" className="gap-1.5"><Code className="h-3.5 w-3.5" /> Code</TabsTrigger>
          </TabsList>
        </div>

        {/* Identity Tab */}
        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />Bot Identity</CardTitle>
              <CardDescription>Set your chatbot's name, description, and avatar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {project.avatar_url ? (
                    <img src={project.avatar_url} alt="Bot avatar" className="w-24 h-24 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center">
                      <Bot className="h-12 w-12 text-primary-foreground" />
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Bot Avatar</h3>
                  <p className="text-sm text-muted-foreground">Upload an image. Recommended: 256x256px</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="botName">Bot Name</Label>
                <Input id="botName" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="My Awesome Bot" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="botDescription">Description</Label>
                <Textarea id="botDescription" value={botDescription} onChange={(e) => setBotDescription(e.target.value)} placeholder="A helpful AI assistant that..." rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Generate Landing Page</Label>
                  <p className="text-sm text-muted-foreground">Create a public page for your chatbot</p>
                </div>
                <Switch checked={project.landing_page_enabled} onCheckedChange={(checked) => onUpdateProject({ landing_page_enabled: checked })} />
              </div>
              <Button onClick={() => onUpdateProject({ bot_name: botName, bot_description: botDescription })}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Tab */}
        <TabsContent value="behavior">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />Bot Behavior</CardTitle>
              <CardDescription>Define how your chatbot responds and behaves</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea id="systemPrompt" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="You are a helpful AI assistant..." rows={10} className="font-mono text-sm" />
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Prompt Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Define a clear personality (friendly, professional, casual)</li>
                  <li>• Specify the bot's area of expertise</li>
                  <li>• Set boundaries for what topics to avoid</li>
                  <li>• Include example responses for consistency</li>
                </ul>
              </div>
              <Button onClick={() => onUpdateProject({ system_prompt: systemPrompt })}>Save System Prompt</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge">
          {project.mode === 'n8n' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Knowledge Base</CardTitle>
                <CardDescription>Disabled in n8n mode</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                In <span className="font-medium">n8n</span> mode, messages are handled by your webhook, so DevsFlow won&apos;t inject knowledge files/URLs into responses automatically.
                Switch to <span className="font-medium">Standard</span> mode to use the Knowledge Base here.
              </CardContent>
            </Card>
          ) : (
            <KnowledgeBase
              projectId={project.id}
              userId={project.user_id}
              webSearchEnabled={(project as any).web_search_enabled ?? false}
              onToggleWebSearch={(enabled) => onUpdateProject({ web_search_enabled: enabled } as any)}
            />
          )}
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools">
          {project.mode === 'n8n' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />Tools & Variables</CardTitle>
                <CardDescription>Disabled in n8n mode</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  In <span className="font-medium">n8n</span> mode, tools are disabled because your webhook controls the flow.
                </p>
                <p className="text-xs font-mono rounded-md bg-secondary/50 p-3">
                  POST payload to your webhook includes: bot_id, message, history, webhook_url, and your configured variables.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ToolsManager projectId={project.id} />
          )}
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Bot Theme & Shape</CardTitle>
              <CardDescription>Choose a visual style and shape for your chatbot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map((theme) => (
                  <button key={theme.id} onClick={() => onUpdateProject({ theme: theme.id as ChatbotProject['theme'] })}
                    className={`relative p-4 rounded-xl border-2 transition-all ${project.theme === theme.id ? 'border-primary' : 'border-border hover:border-primary/50'}`}>
                    <div className={`w-full h-20 rounded-lg mb-3 ${theme.preview}`} />
                    <h4 className="font-medium">{theme.name}</h4>
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                    {project.theme === theme.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {/* UI Shape selector */}
              <div>
                <Label className="mb-3 block">UI Shape</Label>
                <div className="flex gap-3">
                  <button onClick={() => setUiShape('rounded')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${uiShape === 'rounded' ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'}`}>
                    <div className="w-full h-8 rounded-full bg-primary/20 mb-2" />
                    <p className="text-sm font-medium">Rounded</p>
                    <p className="text-xs text-muted-foreground">Soft, friendly curves</p>
                  </button>
                  <button onClick={() => setUiShape('sharp')}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${uiShape === 'sharp' ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'}`}>
                    <div className="w-full h-8 rounded-sm bg-primary/20 mb-2" />
                    <p className="text-sm font-medium">Sharp</p>
                    <p className="text-xs text-muted-foreground">Clean, geometric edges</p>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mode Tab */}
        <TabsContent value="mode">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Chatbot Mode</CardTitle>
              <CardDescription>Choose how your chatbot processes messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                {modes.map((mode) => (
                  <button key={mode.id} onClick={() => onUpdateProject({ mode: mode.id as ChatbotProject['mode'] })}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${project.mode === mode.id ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'}`}>
                    <mode.icon className="h-8 w-8 mb-3 text-primary" />
                    <h4 className="font-medium">{mode.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{mode.description}</p>
                    {project.mode === mode.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {project.mode === 'n8n' && (
                <div className="space-y-2 mt-6 p-4 border rounded-lg">
                  <Label htmlFor="webhookUrl">n8n Webhook URL</Label>
                  <Input id="webhookUrl" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-n8n-instance.com/webhook/..." />
                  <Button variant="outline" className="mt-2" onClick={() => onUpdateProject({ webhook_url: webhookUrl })}>Save Webhook URL</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />AI Models</CardTitle>
              <CardDescription>Configure which AI models your chatbot uses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {models.length > 0 && (
                <div className="space-y-3">
                  {models.map((model) => (
                    <div key={model.id} className={`flex items-center justify-between p-4 rounded-lg border ${model.is_active ? 'border-primary bg-accent' : 'border-border'}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {model.provider === 'lovable_ai' && <Sparkles className="h-4 w-4 text-primary" />}
                          <span className="font-medium">{model.provider}/{model.model_name}</span>
                          {model.is_active && <Badge>Active</Badge>}
                          <Badge variant={(model as any).visibility === 'locked' ? 'destructive' : 'secondary'} className="text-[10px] gap-1">
                            {(model as any).visibility === 'locked' ? <><Lock className="h-2.5 w-2.5" /> Locked</> : <><Unlock className="h-2.5 w-2.5" /> Selectable</>}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{model.api_key ? 'Using custom API key' : 'Using platform credits'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleToggleVisibility(model.id, (model as any).visibility === 'locked' ? 'selectable' : 'locked')}
                          title={(model as any).visibility === 'locked' ? 'Make selectable by users' : 'Lock to dashboard only'}
                        >
                          {(model as any).visibility === 'locked' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        </Button>
                        {!model.is_active && (
                          <Button variant="outline" size="sm" onClick={() => handleSetActiveModel(model.id)}>Set Active</Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteModel(model.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Add New Model</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={newModelProvider} onValueChange={(v) => { setNewModelProvider(v); setNewModelName(''); }}>
                      <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                      <SelectContent>
                        {providers.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <Label>Model</Label>
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <Switch checked={useCustomModelName} onCheckedChange={(v) => setUseCustomModelName(v)} />
                         <span>Custom ID</span>
                       </div>
                     </div>
                     {useCustomModelName ? (
                       <Input value={customModelName} onChange={(e) => setCustomModelName(e.target.value)} placeholder="Enter model id (e.g. together/gpt-4.1-mini)" />
                     ) : newModelProvider === 'custom' || availableModels.length === 0 ? (
                       <Input value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Enter model name" />
                     ) : (
                       <Select value={newModelName} onValueChange={setNewModelName}>
                         <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                         <SelectContent>
                           {availableModels.map(m => (
                             <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     )}
                   </div>
                </div>
                {newModelProvider === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom Provider Name</Label>
                    <Input placeholder="e.g. Together AI, Fireworks, etc." onChange={(e) => setNewModelProvider(e.target.value || 'custom')} />
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>API Key (optional)</Label>
                    <Input type="password" value={newModelApiKey} onChange={(e) => setNewModelApiKey(e.target.value)} placeholder={newModelProvider === 'lovable_ai' ? 'Uses Advanced AI automatically' : 'Leave blank to use platform credits'} disabled={newModelProvider === 'lovable_ai'} />
                  </div>
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select value={newModelVisibility} onValueChange={(v) => setNewModelVisibility(v as 'selectable' | 'locked')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="selectable"><span className="flex items-center gap-1.5"><Unlock className="h-3 w-3" /> Selectable — Users can choose this in HTML</span></SelectItem>
                        <SelectItem value="locked"><span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Locked — Dashboard only</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleAddModel}
                  disabled={
                    !newModelProvider ||
                    (!useCustomModelName ? !newModelName : !customModelName) ||
                    savingModel
                  }
                >
                  {savingModel ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : <><Plus className="mr-2 h-4 w-4" />Add Model</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab - Simulated Chat */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Live Preview</CardTitle>
              <CardDescription>Test your chatbot in a simulated environment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl overflow-hidden" style={{ maxWidth: 420, margin: '0 auto' }}>
                {/* Simulated chat header */}
                <div className="p-3 border-b flex items-center gap-3" style={{ background: tc.bg.includes('gradient') ? tc.bg : undefined, backgroundColor: !tc.bg.includes('gradient') ? tc.bg : undefined, color: tc.fg }}>
                  {project.avatar_url ? (
                    <img src={project.avatar_url} alt="" className="w-8 h-8 object-cover" style={{ borderRadius: uiShape === 'rounded' ? '10px' : '2px' }} />
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center text-lg" style={{ borderRadius: uiShape === 'rounded' ? '10px' : '2px', background: tc.accent, color: '#fff' }}>🤖</div>
                  )}
                  <span className="font-semibold text-sm">{project.bot_name}</span>
                </div>
                {/* Messages area */}
                <div className="h-[350px] overflow-y-auto p-4 space-y-3" style={{ background: tc.bg.includes('gradient') ? tc.bg : undefined, backgroundColor: !tc.bg.includes('gradient') ? tc.bg : undefined, color: tc.fg }}>
                  {previewMessages.length === 0 && (
                    <div className="text-center opacity-50 pt-16">
                      <p className="text-2xl mb-2">🤖</p>
                      <p className="text-sm">Send a message to test your bot</p>
                    </div>
                  )}
                  {previewMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[80%] px-3 py-2 text-sm" style={{
                        borderRadius,
                        background: msg.role === 'user' ? tc.userBg : tc.botBg,
                        color: msg.role === 'user' ? (tc.bg.includes('gradient') || project.theme === 'dark' || project.theme === 'modern_ai' ? '#fff' : '#fff') : tc.fg,
                      }}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                        ) : msg.content}
                      </div>
                    </div>
                  ))}
                  {previewLoading && (
                    <div className="flex justify-start">
                      <div className="px-3 py-2 text-sm opacity-50" style={{ borderRadius, background: tc.botBg, color: tc.fg }}>
                        Typing...
                      </div>
                    </div>
                  )}
                </div>
                {/* Input */}
                <div className="p-3 border-t flex gap-2">
                  <Input
                    value={previewInput}
                    onChange={(e) => setPreviewInput(e.target.value)}
                    placeholder="Type a test message..."
                    className="flex-1 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPreviewMessage(); } }}
                  />
                  <Button size="sm" onClick={sendPreviewMessage} disabled={previewLoading}>Send</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Code Editor Tab */}
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Hosted HTML</CardTitle>
              <CardDescription>Edit the complete HTML script used for your bot (hosted page + export).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={generateCurrentHtml} disabled={htmlLoading}>
                  {htmlLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>) : 'Generate From Current Settings'}
                </Button>
                <Button onClick={saveHostedHtml} disabled={htmlSaving || !fullHtml.trim()}>
                  {htmlSaving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : 'Save'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Full HTML</Label>
                <Textarea
                  value={fullHtml}
                  onChange={(e) => setFullHtml(e.target.value)}
                  placeholder="Click 'Generate From Current Settings' to load the full HTML, then edit and Save."
                  rows={18}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Make sure the script calls <span className="font-mono">{getEndpointUrl()}</span>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
