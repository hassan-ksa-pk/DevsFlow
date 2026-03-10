import { useState, useCallback, useRef } from "react";
import { Bug, Loader2, Upload, FolderUp, FileCode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useCredits } from "@/hooks/useCredits";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface FileEntry {
  name: string;
  content: string;
}

function parseFileBlocks(raw: string): { explanation: string; files: { name: string; code: string }[] } {
  const fileRegex = /\[FILE:(.*?)\]\n([\s\S]*?)\[\/FILE\]/g;
  const files: { name: string; code: string }[] = [];
  let match;
  while ((match = fileRegex.exec(raw)) !== null) {
    files.push({ name: match[1].trim(), code: match[2].trim() });
  }
  const explanation = raw.replace(fileRegex, "").trim();
  return { explanation, files };
}

export default function Debug() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [singleCode, setSingleCode] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [model, setModel] = useState("gpt-oss-20b");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const { credits, useCredit } = useCredits();
  const userProfile = useUserProfile();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readUploadedFiles = useCallback(async (items: DataTransferItemList | FileList) => {
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
    const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".cpp", ".c", ".cs", ".rb", ".php", ".swift", ".kt", ".html", ".css", ".json", ".md", ".yaml", ".yml", ".toml", ".dart", ".lua", ".scala", ".r", ".hs", ".ex", ".zig", ".sh"];
    const codeFiles = fileList.filter((f) => codeExtensions.some((ext) => f.name.endsWith(ext)));
    if (codeFiles.length === 0) { toast.error("No code files found"); return; }
    const entries: FileEntry[] = [];
    for (const file of codeFiles.slice(0, 30)) {
      const text = await file.text();
      entries.push({ name: file.name, content: text });
    }
    setFiles(entries);
    setSingleCode("");
    toast.success(`Loaded ${entries.length} file(s)`);
  }, []);

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); readUploadedFiles(e.dataTransfer.items); };
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) readUploadedFiles(e.target.files);
    e.target.value = "";
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) readUploadedFiles(e.target.files);
    e.target.value = "";
  };

  const fileCount = files.length || (singleCode.trim() ? 1 : 0);

  const runDebug = async () => {
    if (fileCount === 0 || loading) return;
    // Use credits equal to file count
    for (let i = 0; i < fileCount; i++) {
      const hasCredit = await useCredit();
      if (!hasCredit) {
        toast.error(`Not enough credits. Need ${fileCount}, ran out after ${i}.`);
        return;
      }
    }
    setResult("");
    setLoading(true);
    let full = "";

    const codePayload = files.length > 0
      ? files.map(f => `--- ${f.name} ---\n${f.content}`).join("\n\n")
      : singleCode;

    const prompt = `Debug and fix the following code. For EACH file:
1. Explain what was wrong and what was good
2. Suggest improvements
3. Return the FIXED version of each file using [FILE:filename][/FILE] markers

Here is the code:

${codePayload}`;

    try {
      await streamAITool({
        body: {
          type: "diff",
          messages: [{ role: "user", content: prompt }],
          files: files.length > 0 ? Object.fromEntries(files.map(f => [f.name, f.content])) : { "code.txt": singleCode },
          model,
        },
        userProfile,
        onDelta: (chunk) => { full += chunk; setResult(full); },
        onDone: () => setLoading(false),
        onError: (err) => { toast.error(err); setLoading(false); },
      });
    } catch { toast.error("Failed to connect"); setLoading(false); }
  };

  const copyCode = (name: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(name);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const parsed = result ? parseFileBlocks(result) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Bug className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Debug</h1>
          <p className="text-sm text-muted-foreground">Fix code, find issues, get improvements — costs 1 credit per file</p>
        </div>
        <div className="ml-auto">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-7 w-[120px] text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-oss-20b">GPT-OSS 20B</SelectItem>
              <SelectItem value="gpt-oss-120b">GPT-OSS 120B</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-all duration-300 animate-fade-up ${dragOver ? "border-red-400 bg-red-400/5 scale-[1.01]" : "border-border"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload className={`h-6 w-6 mx-auto mb-2 transition-colors ${dragOver ? "text-red-400" : "text-muted-foreground/40"}`} />
        <p className="text-sm text-muted-foreground mb-2">Drop files or a folder here</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => folderInputRef.current?.click()}>
            <FolderUp className="h-3.5 w-3.5" /> Upload Folder
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => fileInputRef.current?.click()}>
            <FileCode className="h-3.5 w-3.5" /> Upload File
          </Button>
        </div>
        <input ref={folderInputRef} type="file" className="hidden" {...({ webkitdirectory: "", directory: "", multiple: true } as any)} onChange={handleFolderSelect} />
        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileSelect} />
      </div>

      {/* Show loaded files */}
      {files.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5 animate-fade-up">
          {files.map(f => (
            <span key={f.name} className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">{f.name}</span>
          ))}
        </div>
      )}

      {/* Or paste code */}
      {files.length === 0 && (
        <div className="mb-4 animate-fade-up">
          <Textarea
            value={singleCode}
            onChange={(e) => setSingleCode(e.target.value)}
            placeholder="Or paste your code here (single file)..."
            className="bg-secondary border-border font-mono text-sm min-h-[120px]"
            rows={5}
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <Button
          onClick={runDebug}
          disabled={loading || fileCount === 0}
          className="gap-2 bg-red-500 hover:bg-red-500/80 text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
          Debug ({fileCount} credit{fileCount !== 1 ? "s" : ""})
        </Button>
        {files.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => { setFiles([]); setResult(""); }}>
            Clear files
          </Button>
        )}
      </div>

      {/* Results */}
      {parsed && parsed.explanation && (
        <div className="rounded-lg border border-border bg-card overflow-hidden mb-4 animate-fade-up">
          <div className="px-4 py-2 border-b border-border bg-secondary/30">
            <span className="text-xs font-mono text-muted-foreground">Debug Report</span>
          </div>
          <div className="p-5 prose prose-invert prose-sm max-w-none [&_pre]:bg-[hsl(var(--terminal-bg))] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_code]:text-cyan/90 [&_li]:text-muted-foreground [&_p]:text-muted-foreground">
            <ReactMarkdown>{parsed.explanation}</ReactMarkdown>
          </div>
        </div>
      )}

      {parsed && parsed.files.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          <h3 className="text-sm font-semibold text-foreground">Fixed Files</h3>
          {parsed.files.map((file) => (
            <div key={file.name} className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center justify-between">
                <span className="text-xs font-mono text-primary">{file.name}</span>
                <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => copyCode(file.name, file.code)}>
                  {copiedFile === file.name ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedFile === file.name ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="p-4 text-xs font-mono text-foreground/80 overflow-x-auto max-h-[400px] overflow-y-auto bg-[hsl(var(--terminal-bg))]">
                <code>{file.code}</code>
              </pre>
            </div>
          ))}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-red-400" />
        </div>
      )}
    </div>
  );
}
