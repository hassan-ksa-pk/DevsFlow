import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, ArrowRight, ArrowLeft, Check, Sparkles, Palette, Brain, Zap, Globe,
  MessageSquare, Code2, Upload, Loader2, Rocket, Cpu,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChatbotProject, ChatbotTheme, ChatbotMode } from '@/types/database';
import { generateExportHtml } from './DashboardOverview';

interface CreateBotWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (project: ChatbotProject) => void;
}

const TOTAL_STEPS = 8;

const themes: { id: ChatbotTheme; name: string; desc: string; preview: string }[] = [
  { id: 'minimal', name: 'Minimal', desc: 'Clean & simple', preview: 'bg-background border-2 border-border' },
  { id: 'glass', name: 'Glass', desc: 'Frosted glass', preview: 'bg-gradient-to-br from-primary/30 to-accent/30' },
  { id: 'dark', name: 'Dark', desc: 'Dark mode', preview: 'bg-[hsl(224,71%,8%)]' },
  { id: 'modern_ai', name: 'Modern AI', desc: 'Gradient accents', preview: 'gradient-primary' },
];

const modes: { id: ChatbotMode; name: string; desc: string; icon: typeof Bot }[] = [
  { id: 'standard', name: 'Standard Chat', desc: 'Normal AI conversation (tools + knowledge enabled)', icon: MessageSquare },
  { id: 'n8n', name: 'n8n Workflow', desc: 'Send/receive messages via your n8n webhook (tools disabled)', icon: Zap },
];

const providerOptions = [
  { value: 'lovable_ai', label: 'Advanced AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'groq', label: 'Groq' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'custom', label: 'Custom Provider' },
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

export default function CreateBotWizard({ open, onOpenChange, onComplete }: CreateBotWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [creating, setCreating] = useState(false);

  const [botName, setBotName] = useState('My Chatbot');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [botDescription, setBotDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [theme, setTheme] = useState<ChatbotTheme>('minimal');
  const [mode, setMode] = useState<ChatbotMode>('standard');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [landingPage, setLandingPage] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [modelProvider, setModelProvider] = useState('');
  const [modelName, setModelName] = useState('');
  const [customProvider, setCustomProvider] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [modelApiKey, setModelApiKey] = useState('');

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);

  useEffect(() => {
    if (!slugTouched) {
      const next = slugify(botName);
      setSlug(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botName]);

  const goNext = useCallback(() => { if (step < TOTAL_STEPS) { setDirection('forward'); setStep(s => s + 1); } }, [step]);
  const goBack = useCallback(() => { if (step > 1) { setDirection('backward'); setStep(s => s - 1); } }, [step]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      // Limit free plan users to 2 chatbots.
      const [{ count: botCount }, creditsRes] = await Promise.all([
        supabase.from('chatbot_projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.rpc('get_credits_info', { p_user_id: user.id } as any),
      ]);
      const creditsInfo = typeof creditsRes.data === 'string' ? JSON.parse(creditsRes.data) : creditsRes.data;
      const plan = creditsInfo?.plan || 'free';
      if (plan === 'free' && (botCount || 0) >= 2) {
        toast({ title: 'Limit reached', description: 'Free plan users can create up to 2 chatbots.', variant: 'destructive' });
        return;
      }

      const finalSlug = slugify(slug || botName);
      if (!finalSlug) {
        toast({ title: 'Missing URL', description: 'Please set a bot URL (slug).', variant: 'destructive' });
        return;
      }

      let avatar_url: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/bot-avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatar_url = urlData.publicUrl;
        }
      }
      const { data, error } = await supabase.from('chatbot_projects').insert({
        user_id: user.id, bot_name: botName, bot_description: botDescription || null,
        system_prompt: systemPrompt, theme, mode,
        webhook_url: mode === 'n8n' ? webhookUrl : null,
        landing_page_enabled: landingPage, avatar_url,
        slug: finalSlug,
        is_public: isPublic,
      }).select().single();
      if (error) throw error;

      const finalProvider = modelProvider === 'custom' ? (customProvider || 'custom') : modelProvider;
      const finalModel = modelProvider === 'custom' ? customModel : modelName;
      if (finalProvider && finalModel) {
        await supabase.from('chatbot_models').insert({
          project_id: data.id, provider: finalProvider, model_name: finalModel,
          api_key: modelApiKey || null, is_active: true,
        });
      }

      // Pre-generate hosted HTML so /bot/<slug> works immediately.
      try {
        const { data: modelsData } = await supabase.from('chatbot_models').select('*').eq('project_id', data.id);
        const allModels = modelsData || [];
        const selectableModels = allModels.filter((m: any) => (m as any).visibility === 'selectable' || !(m as any).visibility);
        const activeModel = allModels.find((m: any) => (m as any).is_active) || null;
        const html = generateExportHtml(
          data as any,
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bot-chat`,
          null,
          { tools: [], variables: [], kbFiles: [], kbPages: [], webSearchEnabled: false, selectableModels, activeModel } as any,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        );
        await supabase.from('chatbot_projects').update({ custom_html: html } as any).eq('id', data.id);
      } catch {
        // If this fails, the bot still exists; user can generate/save HTML from the Builder Code tab.
      }

      toast({ title: 'Chatbot created!', description: `${botName} is ready to go.` });
      onComplete(data as ChatbotProject);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Failed to create bot', description: err.message, variant: 'destructive' });
    } finally { setCreating(false); }
  };

  const resetForm = () => {
    setStep(1); setBotName('My Chatbot'); setSlug(''); setSlugTouched(false); setIsPublic(true);
    setBotDescription(''); setSystemPrompt('You are a helpful AI assistant.');
    setTheme('minimal'); setMode('standard'); setWebhookUrl(''); setLandingPage(false);
    setAvatarFile(null); setAvatarPreview(null); setModelProvider(''); setModelName('');
    setCustomProvider(''); setCustomModel(''); setModelApiKey('');
  };

  const animClass = direction === 'forward' ? 'animate-[slideInRight_0.3s_ease-out]' : 'animate-[slideInLeft_0.3s_ease-out]';

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="h-1 bg-secondary">
          <div className="h-full gradient-primary transition-all duration-500 ease-out" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <DialogTitle className="text-lg font-display font-bold">Create Your Chatbot</DialogTitle>
            <Badge variant="secondary" className="font-mono text-xs">{step}/{TOTAL_STEPS}</Badge>
          </div>
          <div key={step} className={`min-h-[260px] ${animClass}`}>
            {step === 1 && <StepIdentity botName={botName} setBotName={setBotName} botDescription={botDescription} setBotDescription={setBotDescription} avatarPreview={avatarPreview} onAvatarSelect={handleAvatarSelect} />}
            {step === 2 && <StepUrl slug={slug} setSlug={(v) => { setSlugTouched(true); setSlug(v); }} isPublic={isPublic} setIsPublic={setIsPublic} />}
            {step === 3 && <StepBehavior systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt} />}
            {step === 4 && <StepTheme theme={theme} setTheme={setTheme} />}
            {step === 5 && <StepMode mode={mode} setMode={setMode} webhookUrl={webhookUrl} setWebhookUrl={setWebhookUrl} />}
            {step === 6 && <StepModel modelProvider={modelProvider} setModelProvider={setModelProvider} modelName={modelName} setModelName={setModelName} customProvider={customProvider} setCustomProvider={setCustomProvider} customModel={customModel} setCustomModel={setCustomModel} modelApiKey={modelApiKey} setModelApiKey={setModelApiKey} />}
            {step === 7 && <StepLanding landingPage={landingPage} setLandingPage={setLandingPage} />}
            {step === 8 && <StepReview botName={botName} botDescription={botDescription} theme={theme} mode={mode} landingPage={landingPage} avatarPreview={avatarPreview} modelProvider={modelProvider === 'custom' ? (customProvider || 'custom') : modelProvider} modelName={modelProvider === 'custom' ? customModel : modelName} />}
          </div>
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={goBack} disabled={step === 1} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={goNext} className="gradient-primary gap-2">Next <ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={handleCreate} disabled={creating} className="gradient-primary gap-2">
                {creating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>) : (<><Rocket className="h-4 w-4" /> Create Bot</>)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Step Components ─── */

function StepIdentity({ botName, setBotName, botDescription, setBotDescription, avatarPreview, onAvatarSelect }: {
  botName: string; setBotName: (v: string) => void; botDescription: string; setBotDescription: (v: string) => void; avatarPreview: string | null; onAvatarSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Sparkles className="h-5 w-5" /><h3 className="font-display font-semibold">Bot Identity</h3></div>
      <p className="text-sm text-muted-foreground">Give your chatbot a name, description, and face.</p>
      <div className="flex items-center gap-4">
        <label className="cursor-pointer group">
          {avatarPreview ? (
            <img src={avatarPreview} alt="avatar" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all" />
          ) : (
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center group-hover:opacity-90 transition-opacity"><Upload className="h-6 w-6 text-primary-foreground" /></div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onAvatarSelect} />
        </label>
        <div className="text-sm text-muted-foreground">Click to upload avatar<br /><span className="text-xs">256×256 recommended</span></div>
      </div>
      <div className="space-y-2"><Label>Bot Name</Label><Input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="My Awesome Bot" /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={botDescription} onChange={(e) => setBotDescription(e.target.value)} placeholder="A helpful AI assistant that..." rows={2} /></div>
    </div>
  );
}

function StepUrl({ slug, setSlug, isPublic, setIsPublic }: {
  slug: string;
  setSlug: (v: string) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
}) {
  const previewSlug = slug || 'my-chatbot';
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Globe className="h-5 w-5" /><h3 className="font-display font-semibold">Bot URL</h3></div>
      <p className="text-sm text-muted-foreground">This creates a public page for your bot at:</p>
      <div className="rounded-lg border bg-secondary/30 p-3 font-mono text-sm">
        /bot/{previewSlug}
      </div>
      <div className="space-y-2">
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-chatbot" className="font-mono" />
        <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and dashes only (recommended).</p>
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-secondary/20 p-3">
        <div>
          <p className="text-sm font-medium">Public page</p>
          <p className="text-xs text-muted-foreground">Anyone with the link can use your bot.</p>
        </div>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>
    </div>
  );
}

function StepBehavior({ systemPrompt, setSystemPrompt }: { systemPrompt: string; setSystemPrompt: (v: string) => void; }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Brain className="h-5 w-5" /><h3 className="font-display font-semibold">Bot Behavior</h3></div>
      <p className="text-sm text-muted-foreground">Write a system prompt that defines your bot's personality, tone, and expertise.</p>
      <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="You are a helpful AI assistant..." rows={7} className="font-mono text-sm" />
      <div className="bg-secondary/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">💡 Tip: Be specific about personality, knowledge scope, and response style.</p></div>
    </div>
  );
}

function StepTheme({ theme, setTheme }: { theme: ChatbotTheme; setTheme: (v: ChatbotTheme) => void; }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Palette className="h-5 w-5" /><h3 className="font-display font-semibold">Choose a Theme</h3></div>
      <p className="text-sm text-muted-foreground">Pick a visual style for your chatbot interface.</p>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((t) => (
          <button key={t.id} onClick={() => setTheme(t.id)}
            className={`relative p-3 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${theme === t.id ? 'border-primary shadow-glow' : 'border-border hover:border-primary/40'}`}>
            <div className={`w-full h-14 rounded-lg mb-2 ${t.preview}`} />
            <p className="text-sm font-medium">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.desc}</p>
            {theme === t.id && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-scale-in"><Check className="h-3 w-3 text-primary-foreground" /></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepMode({ mode, setMode, webhookUrl, setWebhookUrl }: {
  mode: ChatbotMode; setMode: (v: ChatbotMode) => void; webhookUrl: string; setWebhookUrl: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Zap className="h-5 w-5" /><h3 className="font-display font-semibold">Select Mode</h3></div>
      <p className="text-sm text-muted-foreground">How should your chatbot process messages?</p>
      <div className="space-y-2">
        {modes.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${mode === m.id ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'}`}>
            <m.icon className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1"><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
            {mode === m.id && <Check className="h-4 w-4 text-primary shrink-0" />}
          </button>
        ))}
      </div>
      {mode === 'n8n' && (
        <div className="space-y-2 animate-fade-in"><Label>Webhook URL</Label><Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-n8n.com/webhook/..." /></div>
      )}
    </div>
  );
}

function StepModel({
  modelProvider, setModelProvider, modelName, setModelName,
  customProvider, setCustomProvider, customModel, setCustomModel,
  modelApiKey, setModelApiKey,
}: {
  modelProvider: string; setModelProvider: (v: string) => void;
  modelName: string; setModelName: (v: string) => void;
  customProvider: string; setCustomProvider: (v: string) => void;
  customModel: string; setCustomModel: (v: string) => void;
  modelApiKey: string; setModelApiKey: (v: string) => void;
}) {
  const availableModels = modelsByProvider[modelProvider] || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Cpu className="h-5 w-5" /><h3 className="font-display font-semibold">AI Model</h3></div>
      <p className="text-sm text-muted-foreground">Choose an AI provider and model, or bring your own custom endpoint.</p>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={modelProvider} onValueChange={(v) => { setModelProvider(v); setModelName(''); }}>
            <SelectTrigger><SelectValue placeholder="Select a provider" /></SelectTrigger>
            <SelectContent>
              {providerOptions.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {modelProvider === 'custom' ? (
          <>
            <div className="space-y-2"><Label>Custom Provider Name</Label><Input value={customProvider} onChange={(e) => setCustomProvider(e.target.value)} placeholder="e.g. Together AI, Fireworks, etc." /></div>
            <div className="space-y-2"><Label>Model Name / ID</Label><Input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="e.g. meta-llama/Llama-3-70b" /></div>
          </>
        ) : modelProvider && availableModels.length > 0 ? (
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={modelName} onValueChange={setModelName}>
              <SelectTrigger><SelectValue placeholder="Select a model" /></SelectTrigger>
              <SelectContent>{availableModels.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        ) : null}

        {modelProvider && (
          <div className="space-y-2 animate-fade-in">
            <Label>API Key <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input type="password" value={modelApiKey} onChange={(e) => setModelApiKey(e.target.value)} placeholder="Leave blank to use platform credits" />
          </div>
        )}
      </div>
      <div className="bg-secondary/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">💡 You can skip this step and configure models later in the builder.</p></div>
    </div>
  );
}

function StepLanding({ landingPage, setLandingPage }: { landingPage: boolean; setLandingPage: (v: boolean) => void; }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Globe className="h-5 w-5" /><h3 className="font-display font-semibold">Landing Page</h3></div>
      <p className="text-sm text-muted-foreground">Optionally generate a public landing page for your chatbot with a live demo.</p>
      <div className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${landingPage ? 'border-primary bg-accent' : 'border-border'}`} onClick={() => setLandingPage(!landingPage)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <div><p className="font-medium text-sm">Generate Landing Page</p><p className="text-xs text-muted-foreground">Hero, features, chat demo & CTA</p></div>
          </div>
          <Switch checked={landingPage} onCheckedChange={setLandingPage} />
        </div>
      </div>
      <div className="bg-secondary/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">🌐 The landing page uses your bot's name, description, avatar, and theme automatically.</p></div>
    </div>
  );
}

function StepReview({ botName, botDescription, theme, mode, landingPage, avatarPreview, modelProvider, modelName }: {
  botName: string; botDescription: string; theme: ChatbotTheme; mode: ChatbotMode; landingPage: boolean; avatarPreview: string | null; modelProvider: string; modelName: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-primary"><Rocket className="h-5 w-5" /><h3 className="font-display font-semibold">Review & Launch</h3></div>
      <p className="text-sm text-muted-foreground">Everything looks good? Hit create to launch your bot!</p>
      <div className="rounded-xl border bg-secondary/30 p-4 space-y-3">
        <div className="flex items-center gap-3">
          {avatarPreview ? (<img src={avatarPreview} alt="avatar" className="w-12 h-12 rounded-xl object-cover" />) : (<div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center"><Bot className="h-6 w-6 text-primary-foreground" /></div>)}
          <div><p className="font-display font-bold">{botName}</p><p className="text-xs text-muted-foreground">{botDescription || 'No description'}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center p-2 rounded-lg bg-background"><p className="text-xs text-muted-foreground mb-1">Theme</p><Badge variant="secondary" className="capitalize text-xs">{theme.replace('_', ' ')}</Badge></div>
          <div className="text-center p-2 rounded-lg bg-background"><p className="text-xs text-muted-foreground mb-1">Mode</p><Badge variant="secondary" className="capitalize text-xs">{mode.replace('_', ' ')}</Badge></div>
          <div className="text-center p-2 rounded-lg bg-background"><p className="text-xs text-muted-foreground mb-1">Model</p><Badge variant="secondary" className="text-xs">{modelProvider && modelName ? `${modelProvider}/${modelName}` : 'Not set'}</Badge></div>
          <div className="text-center p-2 rounded-lg bg-background"><p className="text-xs text-muted-foreground mb-1">Landing</p><Badge variant={landingPage ? 'default' : 'secondary'} className="text-xs">{landingPage ? 'Yes' : 'No'}</Badge></div>
        </div>
      </div>
    </div>
  );
}
