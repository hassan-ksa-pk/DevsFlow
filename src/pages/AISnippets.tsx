import { useState } from "react";
import { Code2, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useCredits } from "@/hooks/useCredits";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { LANGUAGES, AI_MODELS } from "@/lib/languages";

export default function AISnippets() {
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("TypeScript");
  const [model, setModel] = useState("gpt-oss-20b");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { credits, useCredit } = useCredits();
  const userProfile = useUserProfile();

  const generate = async () => {
    if (!description.trim() || loading) return;
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setResult("");
    setLoading(true);
    let full = "";
    try {
      await streamAITool({
        body: { type: "snippets", description, language, model },
        userProfile,
        onDelta: (chunk) => { full += chunk; setResult(full); },
        onDone: () => setLoading(false),
        onError: (err) => { toast.error(err); setLoading(false); },
      });
    } catch { toast.error("Failed to connect"); setLoading(false); }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6 animate-fade-up">
        <div className="h-10 w-10 rounded-lg bg-cyan/10 flex items-center justify-center">
          <Code2 className="h-5 w-5 text-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Code Snippets</h1>
          <p className="text-sm text-muted-foreground">Describe what you need, get production-ready code</p>
        </div>
      </div>

      <div className="space-y-4 mb-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 sm:gap-3">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32 sm:w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-32 sm:w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{AI_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-1">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. debounce function with cancel support" className="bg-secondary border-border" onKeyDown={(e) => e.key === "Enter" && generate()} />
            <Button onClick={generate} disabled={loading || !description.trim()} className="shrink-0 gap-2 bg-cyan hover:bg-cyan/80 text-background">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </Button>
          </div>
        </div>
      </div>

      {result && (
        <div className="relative rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
            <span className="text-xs font-mono text-muted-foreground">Generated Snippet</span>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={copyResult}>
              {copied ? <Check className="h-3 w-3 text-cyan" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="p-4 prose prose-invert prose-sm max-w-none [&_pre]:bg-[hsl(var(--terminal-bg))] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_code]:text-cyan/90 [&_code]:font-mono">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan" />
        </div>
      )}
    </div>
  );
}
