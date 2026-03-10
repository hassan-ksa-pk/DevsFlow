import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, Upload, FileCode, FolderUp, ShieldCheck, ShieldAlert, Bug, Lightbulb, ChevronDown, History, Trash2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useCredits } from "@/hooks/useCredits";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AnalysisSection {
  title: string;
  icon: React.ReactNode;
  content: string;
  color: string;
}

interface HistoryEntry {
  id: string;
  code_snippet: string;
  extra_instructions: string;
  result: string;
  model: string;
  created_at: string;
}

function parseAnalysis(raw: string): AnalysisSection[] {
  const sections: AnalysisSection[] = [];
  const sectionDefs = [
    { key: "strengths", title: "Strengths", icon: <ShieldCheck className="h-4 w-4" />, color: "text-emerald-400" },
    { key: "weaknesses", title: "Weaknesses", icon: <ShieldAlert className="h-4 w-4" />, color: "text-amber-400" },
    { key: "errors", title: "Errors", icon: <Bug className="h-4 w-4" />, color: "text-red-400" },
    { key: "improvements", title: "Improvements", icon: <Lightbulb className="h-4 w-4" />, color: "text-cyan" },
  ];

  for (let i = 0; i < sectionDefs.length; i++) {
    const def = sectionDefs[i];
    const regex = new RegExp(`##\\s*${def.title}`, "i");
    const match = raw.search(regex);
    if (match === -1) continue;

    let end = raw.length;
    for (let j = i + 1; j < sectionDefs.length; j++) {
      const nextRegex = new RegExp(`##\\s*${sectionDefs[j].title}`, "i");
      const nextMatch = raw.search(nextRegex);
      if (nextMatch !== -1) { end = nextMatch; break; }
    }

    const content = raw.slice(match, end).replace(/^##\s*\w+\s*\n?/, "").trim();
    sections.push({ title: def.title, icon: def.icon, content, color: def.color });
  }

  return sections;
}

export default function AIAnalysis() {
  const [code, setCode] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [model, setModel] = useState("gpt-oss-20b");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ Strengths: true, Weaknesses: true, Errors: true, Improvements: true });
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);
  const { credits, useCredit } = useCredits();
  const { user } = useAuth();
  const userProfile = useUserProfile();
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("analysis_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setHistory(data as HistoryEntry[]);
  }, [user]);

  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory, fetchHistory]);

  const saveToHistory = async (codeSnippet: string, fullResult: string) => {
    if (!user) return;
    await supabase.from("analysis_history").insert({
      user_id: user.id,
      code_snippet: codeSnippet.slice(0, 5000),
      extra_instructions: extraInstructions,
      result: fullResult,
      model,
    });
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("analysis_history").delete().eq("id", id);
    setHistory((h) => h.filter((e) => e.id !== id));
    if (viewingEntry?.id === id) setViewingEntry(null);
    toast.success("Deleted");
  };

  const analyze = async (codeToAnalyze?: string) => {
    const input = codeToAnalyze || code;
    if (!input.trim() || loading) return;
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setResult("");
    setViewingEntry(null);
    setLoading(true);
    let full = "";
    const extra = extraInstructions.trim() ? `\n\nAdditional instructions from user: ${extraInstructions.trim()}` : "";
    try {
      await streamAITool({
        body: { type: "analysis", code: input + extra, model },
        userProfile,
        onDelta: (chunk) => { full += chunk; setResult(full); },
        onDone: () => { setLoading(false); saveToHistory(input, full); },
        onError: (err) => { toast.error(err); setLoading(false); },
      });
    } catch { toast.error("Failed to connect"); setLoading(false); }
  };

  const readFiles = useCallback(async (items: DataTransferItemList | FileList) => {
    const fileList: File[] = [];
    const processEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => (entry as FileSystemFileEntry).file(resolve));
        fileList.push(file);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries((entries) => resolve(entries)));
        for (const e of entries) await processEntry(e);
      }
    };
    if ("length" in items && items instanceof DataTransferItemList) {
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) { const entry = items[i].webkitGetAsEntry?.(); if (entry) entries.push(entry); }
      for (const entry of entries) await processEntry(entry);
    } else {
      for (let i = 0; i < items.length; i++) fileList.push((items as FileList)[i]);
    }
    const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".cpp", ".c", ".cs", ".rb", ".php", ".swift", ".kt", ".html", ".css", ".json", ".md", ".yaml", ".yml", ".toml", ".dart", ".lua", ".scala", ".r", ".hs", ".ex", ".zig", ".nim", ".jl", ".sol", ".sh"];
    const codeFiles = fileList.filter((f) => codeExtensions.some((ext) => f.name.endsWith(ext)));
    if (codeFiles.length === 0) { toast.error("No code files found"); return; }
    let combined = "";
    for (const file of codeFiles.slice(0, 20)) { const text = await file.text(); combined += `\n--- ${file.name} ---\n${text}\n`; }
    if (codeFiles.length > 20) combined += `\n... and ${codeFiles.length - 20} more files`;
    setCode(combined.trim());
    analyze(combined.trim());
  }, [loading, extraInstructions, model]);

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); readFiles(e.dataTransfer.items); };
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) readFiles(e.target.files);
    e.target.value = "";
  };
  const toggleSection = (title: string) => setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));

  const displayResult = viewingEntry ? viewingEntry.result : result;
  const sections = displayResult ? parseAnalysis(displayResult) : [];
  const hasStructured = sections.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="h-10 w-10 rounded-lg bg-cyan/10 flex items-center justify-center">
          <Search className="h-5 w-5 text-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Code Analysis</h1>
          <p className="text-sm text-muted-foreground">Drop a folder or paste code for structured analysis</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={showHistory ? "secondary" : "outline"} size="sm" className="gap-1.5 text-xs" onClick={() => { setShowHistory(!showHistory); setViewingEntry(null); }}>
            <History className="h-3.5 w-3.5" /> History
          </Button>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-7 w-[120px] text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-oss-20b">GPT-OSS 20B</SelectItem>
              <SelectItem value="gpt-oss-120b">GPT-OSS 120B</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="mb-6 rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
          <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Analysis History</span>
            <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          {history.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No analyses yet</div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto divide-y divide-border">
              {history.map((entry) => (
                <div key={entry.id} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors", viewingEntry?.id === entry.id && "bg-secondary/50")}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-foreground truncate">{entry.code_snippet.slice(0, 80)}...</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{entry.model}</span>
                      {entry.extra_instructions && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan/10 text-cyan">+ instructions</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setViewingEntry(viewingEntry?.id === entry.id ? null : entry)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={() => deleteEntry(entry.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Viewing entry banner */}
      {viewingEntry && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-cyan/30 bg-cyan/5 px-4 py-2 animate-fade-up">
          <Eye className="h-4 w-4 text-cyan" />
          <span className="text-xs text-cyan">Viewing saved analysis from {new Date(viewingEntry.created_at).toLocaleString()}</span>
          <Button variant="ghost" size="sm" className="ml-auto text-xs h-6" onClick={() => setViewingEntry(null)}>Back to editor</Button>
        </div>
      )}

      {/* Input area — hide when viewing history entry */}
      {!viewingEntry && (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-all duration-300 animate-fade-up ${dragOver ? "border-cyan bg-cyan/5 scale-[1.01]" : "border-border"}`}
            style={{ animationDelay: "0.1s" }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className={`h-6 w-6 mx-auto mb-2 transition-colors ${dragOver ? "text-cyan" : "text-muted-foreground/40"}`} />
            <p className="text-sm text-muted-foreground mb-2">Drop files or folders here</p>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => folderInputRef.current?.click()}>
              <FolderUp className="h-3.5 w-3.5" /> Upload Folder
            </Button>
            <input ref={folderInputRef} type="file" className="hidden" {...({ webkitdirectory: "", directory: "", multiple: true } as any)} onChange={handleFolderSelect} />
          </div>
          <div className="mb-4 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="Or paste your code here..." className="bg-secondary border-border font-mono text-sm min-h-[120px]" rows={5} />
          </div>
          <div className="mb-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Textarea value={extraInstructions} onChange={(e) => setExtraInstructions(e.target.value)} placeholder="Extra instructions (e.g. 'Focus on security' or 'Check for memory leaks')..." className="bg-secondary border-border text-sm min-h-[60px]" rows={2} />
          </div>
          <Button onClick={() => analyze()} disabled={loading || !code.trim()} className="mb-8 gap-2 bg-cyan hover:bg-cyan/80 text-background animate-fade-up" style={{ animationDelay: "0.25s" }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
            Analyze Code
          </Button>
        </>
      )}

      {/* Structured results */}
      {hasStructured && (
        <div className="space-y-3 animate-fade-up">
          {sections.map((section) => (
            <Collapsible key={section.title} open={openSections[section.title]} onOpenChange={() => toggleSection(section.title)}>
              <CollapsibleTrigger className="flex items-center gap-3 w-full rounded-lg border border-border bg-card px-4 py-3 hover:bg-secondary/50 transition-colors">
                <span className={section.color}>{section.icon}</span>
                <span className={cn("font-semibold text-sm", section.color)}>{section.title}</span>
                <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", openSections[section.title] && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="border border-t-0 border-border rounded-b-lg bg-card/50 px-5 py-4">
                <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-[hsl(var(--terminal-bg))] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_code]:text-cyan/90 [&_li]:text-muted-foreground [&_p]:text-muted-foreground">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Fallback raw result */}
      {displayResult && !hasStructured && (
        <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
          <div className="px-4 py-2 border-b border-border bg-secondary/30">
            <span className="text-xs font-mono text-muted-foreground">Analysis Report</span>
          </div>
          <div className="p-6 prose prose-invert prose-sm max-w-none [&_pre]:bg-[hsl(var(--terminal-bg))] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_code]:text-cyan/90">
            <ReactMarkdown>{displayResult}</ReactMarkdown>
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
