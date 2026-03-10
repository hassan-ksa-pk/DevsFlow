import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Check, FileCode, Sparkles, FilePlus, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileEdit {
  filename: string;
  content: string;
  applied?: boolean;
  isNew?: boolean;
  editOps?: EditOperation[];
}

interface EditOperation {
  type: "INSERT_AFTER" | "REPLACE" | "DELETE";
  startLine: number;
  endLine?: number;
  content?: string;
}

interface DiffChatMessage {
  role: "user" | "assistant";
  content: string;
  fileEdits?: FileEdit[];
}

interface DiffChatPanelProps {
  projectId: string;
  activeFile: string;
  files: Record<string, string>;
  onApplyFileEdit: (filename: string, content: string) => void;
}

// Groq models (free tier)
const GROQ_MODELS = [
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B", tier: "free" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", tier: "free" },
  { value: "gemma2-9b-it", label: "Gemma 2 9B", tier: "free" },
  { value: "openai/gpt-oss-20b", label: "GPT-OSS 20B", tier: "free" },
  { value: "openai/gpt-oss-120b", label: "GPT-OSS 120B", tier: "free" },
];

// Lovable AI models (advanced - limited credits)
const ADVANCED_MODELS = [
  { value: "google/gemini-2.5-flash-lite", label: "Gemini Flash Lite", tier: "advanced" },
  { value: "google/gemini-2.5-flash", label: "Gemini Flash", tier: "advanced_pro" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", tier: "advanced_pro" },
  { value: "google/gemini-2.5-pro", label: "Gemini Pro", tier: "advanced_pro" },
];

function isAdvancedModel(model: string): boolean {
  return ADVANCED_MODELS.some((m) => m.value === model);
}

function isProOnlyModel(model: string): boolean {
  return ADVANCED_MODELS.some((m) => m.value === model && m.tier === "advanced_pro");
}

function parseEditOperations(block: string): EditOperation[] {
  const ops: EditOperation[] = [];
  const lines = block.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // INSERT_AFTER:line_number
    const insertMatch = line.match(/^INSERT_AFTER:(\d+)$/);
    if (insertMatch) {
      const afterLine = parseInt(insertMatch[1]);
      const contentLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "END_INSERT") {
        contentLines.push(lines[i]);
        i++;
      }
      ops.push({ type: "INSERT_AFTER", startLine: afterLine, content: contentLines.join("\n") });
      i++; // skip END_INSERT
      continue;
    }
    
    // REPLACE:start:end
    const replaceMatch = line.match(/^REPLACE:(\d+):(\d+)$/);
    if (replaceMatch) {
      const start = parseInt(replaceMatch[1]);
      const end = parseInt(replaceMatch[2]);
      const contentLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "END_REPLACE") {
        contentLines.push(lines[i]);
        i++;
      }
      ops.push({ type: "REPLACE", startLine: start, endLine: end, content: contentLines.join("\n") });
      i++; // skip END_REPLACE
      continue;
    }
    
    // DELETE:start:end
    const deleteMatch = line.match(/^DELETE:(\d+):(\d+)$/);
    if (deleteMatch) {
      const start = parseInt(deleteMatch[1]);
      const end = parseInt(deleteMatch[2]);
      i++;
      while (i < lines.length && lines[i].trim() !== "END_DELETE") i++;
      ops.push({ type: "DELETE", startLine: start, endLine: end });
      i++; // skip END_DELETE
      continue;
    }
    
    i++;
  }
  return ops;
}

function applyEditOperations(originalContent: string, ops: EditOperation[]): string {
  const lines = originalContent.split("\n");
  
  // Sort operations by line number descending so we don't shift indices
  const sorted = [...ops].sort((a, b) => b.startLine - a.startLine);
  
  for (const op of sorted) {
    if (op.type === "DELETE" && op.endLine !== undefined) {
      lines.splice(op.startLine - 1, op.endLine - op.startLine + 1);
    } else if (op.type === "REPLACE" && op.endLine !== undefined && op.content !== undefined) {
      const newLines = op.content.split("\n");
      lines.splice(op.startLine - 1, op.endLine - op.startLine + 1, ...newLines);
    } else if (op.type === "INSERT_AFTER" && op.content !== undefined) {
      const newLines = op.content.split("\n");
      lines.splice(op.startLine, 0, ...newLines);
    }
  }
  
  return lines.join("\n");
}

function parseFileEdits(text: string, existingFiles: Record<string, string>): { explanation: string; edits: FileEdit[] } {
  const edits: FileEdit[] = [];
  
  // Parse [FILE:name] blocks (full file replacement / new file)
  const fileRegex = /\[FILE:(.*?)\]\n([\s\S]*?)\[\/FILE\]/g;
  let match;
  while ((match = fileRegex.exec(text)) !== null) {
    const filename = match[1].trim();
    edits.push({
      filename,
      content: match[2].trim(),
      isNew: !(filename in existingFiles),
    });
  }
  
  // Parse [EDIT:name] blocks (line-based edits)
  const editRegex = /\[EDIT:(.*?)\]\n([\s\S]*?)\[\/EDIT\]/g;
  while ((match = editRegex.exec(text)) !== null) {
    const filename = match[1].trim();
    const opsBlock = match[2].trim();
    const ops = parseEditOperations(opsBlock);
    
    if (ops.length > 0 && filename in existingFiles) {
      const newContent = applyEditOperations(existingFiles[filename], ops);
      edits.push({ filename, content: newContent, editOps: ops });
    }
  }
  
  // Extract explanation (text before first marker)
  const firstMarker = Math.min(
    text.indexOf("[FILE:") === -1 ? Infinity : text.indexOf("[FILE:"),
    text.indexOf("[EDIT:") === -1 ? Infinity : text.indexOf("[EDIT:")
  );
  const explanation = firstMarker < Infinity ? text.slice(0, firstMarker).trim() : text.trim();
  
  return { explanation, edits };
}

export function DiffChatPanel({ projectId, files, onApplyFileEdit }: DiffChatPanelProps) {
  const [messages, setMessages] = useState<DiffChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(() => {
    return localStorage.getItem("devsflow_ai_model") || "llama-3.1-8b-instant";
  });
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { creditInfo, useCredit } = useCredits();
  const { user } = useAuth();
  const userProfile = useUserProfile();

  const plan = creditInfo?.plan || "free";

  useEffect(() => {
    if (!projectId || !user) return;
    supabase
      .from("chat_messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map((m) => {
            const role = m.role as "user" | "assistant";
            if (role === "assistant") {
              const { edits } = parseFileEdits(m.content, files);
              return { role, content: m.content, fileEdits: edits.length > 0 ? edits : undefined };
            }
            return { role, content: m.content };
          }));
        }
        setLoaded(true);
      });
  }, [projectId, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const persistMessage = async (role: string, content: string) => {
    if (!user || !projectId) return;
    await supabase.from("chat_messages").insert({
      project_id: projectId,
      user_id: user.id,
      role,
      content,
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Check if pro-only model selected by free user
    if (isProOnlyModel(model) && plan !== "pro") {
      toast.error("This model requires a Pro plan. Use Gemini Flash Lite or a Groq model.");
      return;
    }

    const creditType = isAdvancedModel(model) ? "advanced" : "groq";
    const hasCredit = await useCredit(creditType);
    if (!hasCredit) return;

    const userMsg: DiffChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    await persistMessage("user", text);

    let full = "";
    // Strip [FILE:...] and [EDIT:...] blocks from prior assistant messages
    // so the AI doesn't repeat/regenerate old code suggestions
    // Only send last 6 messages to avoid context overflow and repetition
    const recentMessages = messages.slice(-6);
    const diffMessages = [
      ...recentMessages.map((m) => ({
        role: m.role,
        content: m.role === "assistant"
          ? m.content.replace(/\[FILE:.*?\][\s\S]*?\[\/FILE\]/g, "[code applied]").replace(/\[EDIT:.*?\][\s\S]*?\[\/EDIT\]/g, "[edit applied]")
          : m.content,
      })),
      { role: "user" as const, content: text },
    ];

    try {
      await streamAITool({
        body: { type: "diff", messages: diffMessages, model, files },
        userProfile,
        onDelta: (chunk) => {
          full += chunk;
          const { edits } = parseFileEdits(full, files);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: full, fileEdits: edits.length > 0 ? edits : undefined } : m
              );
            }
            return [...prev, { role: "assistant", content: full, fileEdits: edits.length > 0 ? edits : undefined }];
          });
        },
        onDone: async () => {
          setIsLoading(false);
          if (full) await persistMessage("assistant", full);
        },
        onError: (err) => { toast.error(err); setIsLoading(false); },
      });
    } catch {
      toast.error("Failed to connect to AI");
      setIsLoading(false);
    }
  };

  const applyEdit = (msgIndex: number, editIndex: number) => {
    const msg = messages[msgIndex];
    const edit = msg?.fileEdits?.[editIndex];
    if (edit) {
      onApplyFileEdit(edit.filename, edit.content);
      setMessages((prev) =>
        prev.map((m, i) => {
          if (i !== msgIndex) return m;
          const newEdits = m.fileEdits?.map((e, ei) =>
            ei === editIndex ? { ...e, applied: true } : e
          );
          return { ...m, fileEdits: newEdits };
        })
      );
      toast.success(`Applied & saved ${edit.filename}`);
    }
  };

  const applyAll = (msgIndex: number) => {
    const msg = messages[msgIndex];
    msg?.fileEdits?.forEach((edit) => {
      if (!edit.applied) onApplyFileEdit(edit.filename, edit.content);
    });
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== msgIndex) return m;
        const newEdits = m.fileEdits?.map((e) => ({ ...e, applied: true }));
        return { ...m, fileEdits: newEdits };
      })
    );
    toast.success("Applied & saved all changes");
  };

  const getExplanation = (content: string) => {
    const f = content.indexOf("[FILE:");
    const e = content.indexOf("[EDIT:");
    const first = Math.min(f === -1 ? Infinity : f, e === -1 ? Infinity : e);
    return first < Infinity ? content.slice(0, first).trim() : content.trim();
  };

  const handleModelChange = (val: string) => {
    if (isProOnlyModel(val) && plan !== "pro") {
      toast.error("Pro plan required for this model.");
      return;
    }
    setModel(val);
    localStorage.setItem("devsflow_ai_model", val);
  };

  const clearChat = async () => {
    if (!user) return;
    setMessages([]);
    await supabase
      .from("chat_messages")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);
    toast.success("Chat cleared");
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="px-3 py-2 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan" />
          <span className="text-xs font-mono text-sidebar-foreground uppercase tracking-wider">Vibe Coder</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={clearChat}
            title="Clear chat"
            disabled={messages.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {creditInfo && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20">
                {creditInfo.groq_credits} std
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {creditInfo.advanced_credits} adv
              </span>
            </div>
          )}
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="h-6 w-[150px] text-[10px] bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem disabled value="__groq_header" className="text-[9px] font-bold text-muted-foreground">
                — Groq (Standard) —
              </SelectItem>
              {GROQ_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
              <SelectItem disabled value="__adv_header" className="text-[9px] font-bold text-muted-foreground">
                — Advanced AI —
              </SelectItem>
              {ADVANCED_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} disabled={m.tier === "advanced_pro" && plan !== "pro"}>
                  <span className="flex items-center gap-1">
                    {m.label}
                    {m.tier === "advanced_pro" && plan !== "pro" && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {messages.length === 0 && loaded && (
          <div className="text-center py-8 animate-fade-up">
            <Bot className="h-8 w-8 mx-auto mb-3 text-cyan/40" />
            <p className="text-xs text-muted-foreground">Ask AI to modify your codebase</p>
            <p className="text-xs text-muted-foreground/60 mt-1">It can create new files or edit specific lines</p>
            <div className="mt-3 text-[10px] text-muted-foreground/50 space-y-0.5">
              <p>Standard models: {plan === "pro" ? "25" : "10"}/day • Advanced: {plan === "pro" ? "10" : "3"}/day</p>
              <p className="text-purple-400/60">{plan === "pro" ? "⭐ Pro Plan" : "Free Plan"}</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className="flex gap-2 animate-fade-up">
              <div className={`shrink-0 h-6 w-6 rounded-md flex items-center justify-center ${
                m.role === "user" ? "bg-secondary" : "bg-cyan/10"
              }`}>
                {m.role === "user" ? (
                  <User className="h-3.5 w-3.5 text-secondary-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-cyan" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {m.role === "user" ? (
                  <p className="text-sm text-foreground">{m.content}</p>
                ) : (
                  <>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {getExplanation(m.content)}
                    </p>
                    {m.fileEdits && m.fileEdits.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {m.fileEdits.map((edit, ei) => (
                          <div
                            key={ei}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-300 ${
                              edit.applied
                                ? "border-cyan/30 bg-cyan/5"
                                : "border-border bg-secondary/50 hover:border-cyan/20 hover:bg-secondary"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {edit.isNew ? (
                                <FilePlus className={`h-3.5 w-3.5 shrink-0 ${edit.applied ? "text-cyan" : "text-green-400"}`} />
                              ) : (
                                <FileCode className={`h-3.5 w-3.5 shrink-0 ${edit.applied ? "text-cyan" : "text-muted-foreground"}`} />
                              )}
                              <span className="text-xs font-mono truncate">{edit.filename}</span>
                              {edit.isNew && <span className="text-[9px] text-green-400 font-mono">NEW</span>}
                              {edit.editOps && <span className="text-[9px] text-yellow-400 font-mono">EDIT</span>}
                            </div>
                            {edit.applied ? (
                              <span className="text-[10px] text-cyan flex items-center gap-1 shrink-0">
                                <Check className="h-3 w-3" /> Applied
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                className="h-6 text-[10px] gap-1 bg-cyan/10 hover:bg-cyan/20 text-cyan border-0 shrink-0"
                                onClick={() => applyEdit(i, ei)}
                              >
                                <Check className="h-3 w-3" /> Accept
                              </Button>
                            )}
                          </div>
                        ))}
                        {m.fileEdits.some((e) => !e.applied) && m.fileEdits.length > 1 && (
                          <Button
                            size="sm"
                            className="w-full h-7 text-xs gap-1 bg-cyan hover:bg-cyan/80 text-background mt-1"
                            onClick={() => applyAll(i)}
                          >
                            <Check className="h-3 w-3" /> Accept All Changes
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 animate-fade-up">
              <div className="shrink-0 h-6 w-6 rounded-md flex items-center justify-center bg-cyan/10">
                <Bot className="h-3.5 w-3.5 text-cyan" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask AI to modify your codebase..."
            className="resize-none bg-secondary border-border text-sm pr-10 min-h-[60px] max-h-32 font-mono"
            rows={2}
          />
          <Button
            size="sm"
            className="absolute bottom-2 right-2 h-7 w-7 p-0 bg-cyan hover:bg-cyan/80"
            onClick={send}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-3.5 w-3.5 text-background" />
          </Button>
        </div>
      </div>
    </div>
  );
}
