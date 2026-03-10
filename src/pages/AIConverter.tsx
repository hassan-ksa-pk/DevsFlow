import { useState } from "react";
import { ArrowRightLeft, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useCredits } from "@/hooks/useCredits";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { LANGUAGES, AI_MODELS } from "@/lib/languages";

export default function AIConverter() {
  const [code, setCode] = useState("");
  const [sourceLang, setSourceLang] = useState("JavaScript");
  const [targetLang, setTargetLang] = useState("Python");
  const [model, setModel] = useState("gpt-oss-20b");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { credits, useCredit } = useCredits();
  const userProfile = useUserProfile();

  const convert = async () => {
    if (!code.trim() || loading) return;
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setResult("");
    setLoading(true);
    let full = "";
    try {
      await streamAITool({
        body: { type: "converter", code, sourceLang, targetLang, model },
        userProfile,
        onDelta: (chunk) => { full += chunk; setResult(full); },
        onDone: () => setLoading(false),
        onError: (err) => { toast.error(err); setLoading(false); },
      });
    } catch { toast.error("Failed to connect"); setLoading(false); }
  };

  const copyResult = () => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6 animate-fade-up">
        <div className="h-10 w-10 rounded-lg bg-cyan/10 flex items-center justify-center">
          <ArrowRightLeft className="h-5 w-5 text-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Code Converter</h1>
          <p className="text-sm text-muted-foreground">Convert code between 30+ programming languages</p>
        </div>
        <div className="ml-auto">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-7 w-[120px] text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{AI_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <Select value={sourceLang} onValueChange={setSourceLang}>
          <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue placeholder="From" /></SelectTrigger>
          <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <ArrowRightLeft className="h-4 w-4 text-cyan shrink-0" />
        <Select value={targetLang} onValueChange={setTargetLang}>
          <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue placeholder="To" /></SelectTrigger>
          <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6 animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <div>
          <label className="text-xs font-mono text-muted-foreground mb-2 block">Source ({sourceLang})</label>
          <Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste your code here..." className="bg-secondary border-border font-mono text-sm min-h-[250px]" rows={10} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-mono text-muted-foreground">Result ({targetLang})</label>
            {result && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={copyResult}>
                {copied ? <Check className="h-3 w-3 text-cyan" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
          <div className="rounded-md border border-border bg-card min-h-[250px] p-4 prose prose-invert prose-sm max-w-none [&_pre]:bg-[hsl(var(--terminal-bg))] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_pre]:m-0 [&_code]:text-cyan/90 [&_code]:font-mono">
            {result ? <ReactMarkdown>{result}</ReactMarkdown> : (
              <p className="text-muted-foreground/40 text-sm">Converted code will appear here</p>
            )}
          </div>
        </div>
      </div>

      <Button onClick={convert} disabled={loading || !code.trim()} className="gap-2 bg-cyan hover:bg-cyan/80 text-background">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
        Convert
      </Button>
    </div>
  );
}
