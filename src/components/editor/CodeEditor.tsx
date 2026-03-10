import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  filename: string;
  value: string;
  onChange: (value: string) => void;
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp"];

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext));
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
  };
  return map[ext || ""] || "plaintext";
}

export function CodeEditor({ filename, value, onChange }: CodeEditorProps) {
  if (isImageFile(filename) && value.startsWith("data:")) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black/20 p-8">
        <div className="text-center space-y-4">
          <img
            src={value}
            alt={filename}
            className="max-w-full max-h-[60vh] object-contain rounded-lg border border-border shadow-lg"
          />
          <p className="text-xs font-mono text-muted-foreground">{filename}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={getLanguage(filename)}
        value={value}
        onChange={(val) => onChange(val || "")}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', monospace",
          minimap: { enabled: true, scale: 1 },
          padding: { top: 12 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          renderLineHighlight: "gutter",
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          wordWrap: "on",
          tabSize: 2,
        }}
      />
    </div>
  );
}
