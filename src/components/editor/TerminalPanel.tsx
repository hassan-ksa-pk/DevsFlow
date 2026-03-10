import { useState, useRef, useEffect } from "react";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useCredits } from "@/hooks/useCredits";

interface TerminalLine {
  type: "input" | "output" | "error" | "system";
  content: string;
}

interface TerminalPanelProps {
  files: Record<string, string>;
  onCreateFile?: (name: string, content: string) => void;
  onDeleteFile?: (name: string) => void;
  onUpdateFile?: (name: string, content: string) => void;
}

const VITE_TEMPLATE: Record<string, string> = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vite App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/main.js"></script>
</body>
</html>`,
  "main.js": `import './style.css'

document.querySelector('#app').innerHTML = \`
  <div>
    <h1>Hello Vite!</h1>
    <p>Edit main.js and save to see changes.</p>
    <button id="counter" type="button">Count: 0</button>
  </div>
\`

let count = 0;
document.querySelector('#counter').addEventListener('click', () => {
  count++;
  document.querySelector('#counter').textContent = \`Count: \${count}\`;
});
`,
  "style.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; color: #e0e0e0; }
h1 { color: #00d4ff; margin-bottom: 1rem; }
button { padding: 0.5rem 1.5rem; border: 1px solid #00d4ff; background: transparent; color: #00d4ff; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: background 0.2s; }
button:hover { background: #00d4ff22; }
`,
  "package.json": `{
  "name": "vite-project",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}`,
};

const VITE_REACT_TEMPLATE: Record<string, string> = {
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vite + React</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`,
  "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,
  "src/App.jsx": `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="app">
      <h1>Vite + React</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <p>Edit src/App.jsx to get started</p>
    </div>
  )
}

export default App`,
  "src/index.css": `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a2e; color: #e0e0e0; }
.app { text-align: center; }
h1 { color: #61dafb; margin-bottom: 1rem; }
button { padding: 0.5rem 1.5rem; border: 1px solid #61dafb; background: transparent; color: #61dafb; border-radius: 8px; cursor: pointer; font-size: 1rem; }
button:hover { background: #61dafb22; }
p { margin-top: 1rem; color: #888; }`,
  "package.json": `{
  "name": "vite-react-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^5.0.0"
  }
}`,
};

const PYTHON_TEMPLATE: Record<string, string> = {
  "main.py": `#!/usr/bin/env python3
"""A simple Python project."""

def greet(name: str) -> str:
    return f"Hello, {name}!"

def main():
    print(greet("World"))
    print("Edit main.py to get started!")

if __name__ == "__main__":
    main()
`,
  "requirements.txt": `# Add your dependencies here
# requests==2.31.0
# flask==3.0.0
`,
  "README.md": `# Python Project

Run with: \`python main.py\`
`,
};

export function TerminalPanel({ files, onCreateFile, onDeleteFile, onUpdateFile }: TerminalPanelProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "system", content: "DevsFlow Terminal v2.0 — Interactive shell" },
    { type: "output", content: 'Type "help" for available commands.\n' },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { useCredit } = useCredits();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  const scaffoldTemplate = (template: Record<string, string>, name: string) => {
    Object.entries(template).forEach(([filename, content]) => {
      onCreateFile?.(filename, content);
    });
    setLines((p) => [
      ...p,
      { type: "system", content: `✓ Scaffolded ${name} project with ${Object.keys(template).length} files:` },
      { type: "output", content: Object.keys(template).join("\n") },
      { type: "system", content: `Switch to the Preview tab to see your app running!` },
    ]);
  };

  const handleBuiltIn = (cmd: string): boolean => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0];

    // Handle npm/npx/yarn create commands
    if (cmd.match(/^(npm\s+create|npx\s+create-|yarn\s+create)\s+vite/i) ||
        cmd.match(/^npm\s+init\s+vite/i)) {
      setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }]);
      if (cmd.toLowerCase().includes("react")) {
        scaffoldTemplate(VITE_REACT_TEMPLATE, "Vite + React");
      } else {
        scaffoldTemplate(VITE_TEMPLATE, "Vite (Vanilla JS)");
      }
      return true;
    }

    // Handle npm run dev / npx vite
    if (cmd.match(/^(npm\s+run\s+dev|npx\s+vite|yarn\s+dev)/i)) {
      setLines((p) => [
        ...p,
        { type: "input", content: `$ ${cmd}` },
        { type: "system", content: `  VITE v5.0.0  ready

  ➜  Local:   Preview Tab
  ➜  press h + enter to show help

Switch to the Preview tab to see your app!` },
      ]);
      return true;
    }

    // Handle python init
    if (cmd.match(/^(python|python3)\s+--init/i) || cmd === "init python" || cmd === "create python") {
      setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }]);
      scaffoldTemplate(PYTHON_TEMPLATE, "Python");
      return true;
    }

    // Handle python run
    if (cmd.match(/^(python|python3)\s+main\.py/i)) {
      setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }]);
      if (files["main.py"]) {
        setLines((p) => [...p, { type: "output", content: "Hello, World!\nEdit main.py to get started!" }]);
      } else {
        setLines((p) => [...p, { type: "error", content: "python: can't open file 'main.py': [Errno 2] No such file" }]);
      }
      return true;
    }

    switch (command) {
      case "help":
        setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, {
          type: "system",
          content: `Available commands:
  ls              - List project files
  cat <file>      - View file content
  touch <file>    - Create empty file
  rm <file>       - Delete file
  echo "..." > f  - Write content to file
  clear           - Clear terminal
  pwd             - Print working directory
  whoami          - Current user
  help            - Show this help
  
  Templates:
  npm create vite        - Scaffold Vite (Vanilla JS) project
  npm create vite react  - Scaffold Vite + React project
  npm run dev            - "Start" dev server (opens Preview)
  init python            - Scaffold Python project
  python main.py         - "Run" Python script
  
  Other commands are AI-simulated.`
        }]);
        return true;

      case "clear":
        setLines([]);
        return true;

      case "pwd":
        setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "output", content: "/project" }]);
        return true;

      case "whoami":
        setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "output", content: "devsflow-user" }]);
        return true;

      case "ls": {
        const fileNames = Object.keys(files);
        const output = fileNames.length > 0 ? fileNames.join("  ") : "(empty project)";
        setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "output", content: output }]);
        return true;
      }

      case "cat": {
        const filename = parts.slice(1).join(" ");
        if (!filename) {
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "error", content: "Usage: cat <filename>" }]);
          return true;
        }
        if (files[filename] !== undefined) {
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "output", content: files[filename] || "(empty)" }]);
        } else {
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "error", content: `cat: ${filename}: No such file` }]);
        }
        return true;
      }

      case "touch": {
        const filename = parts[1];
        if (!filename) {
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "error", content: "Usage: touch <filename>" }]);
          return true;
        }
        onCreateFile?.(filename, "");
        setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "system", content: `Created ${filename}` }]);
        return true;
      }

      case "rm": {
        const filename = parts[1];
        if (!filename) {
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "error", content: "Usage: rm <filename>" }]);
          return true;
        }
        if (files[filename] !== undefined) {
          onDeleteFile?.(filename);
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "system", content: `Deleted ${filename}` }]);
        } else {
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "error", content: `rm: ${filename}: No such file` }]);
        }
        return true;
      }

      case "echo": {
        const echoMatch = cmd.match(/echo\s+["'](.*)["']\s*>\s*(.+)/);
        if (echoMatch) {
          const content = echoMatch[1];
          const filename = echoMatch[2].trim();
          onCreateFile?.(filename, content);
          setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "system", content: `Wrote to ${filename}` }]);
          return true;
        }
        const echoText = cmd.slice(5);
        setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }, { type: "output", content: echoText }]);
        return true;
      }

      default:
        return false;
    }
  };

  const run = async () => {
    const cmd = input.trim();
    if (!cmd || loading) return;
    setInput("");
    setCmdHistory((prev) => [cmd, ...prev]);
    setHistoryIdx(-1);

    if (handleBuiltIn(cmd)) return;

    const hasCredit = await useCredit();
    if (!hasCredit) return;

    setLines((p) => [...p, { type: "input", content: `$ ${cmd}` }]);
    setLoading(true);

    const msgs = [...history, { role: "user", content: cmd }];
    let output = "";

    try {
      await streamAITool({
        body: { type: "terminal", messages: msgs, files },
        onDelta: (chunk) => {
          output += chunk;
          setLines((p) => {
            const last = p[p.length - 1];
            if (last?.type === "output" && p.length > 0 && p[p.length - 2]?.type === "input") {
              return [...p.slice(0, -1), { type: "output", content: output }];
            }
            return [...p, { type: "output", content: output }];
          });
        },
        onDone: () => {
          const cmdRegex = /\[CMD:(create|delete|write):(.+?)(?::(.+?))?\]/g;
          let cmdMatch;
          while ((cmdMatch = cmdRegex.exec(output)) !== null) {
            const action = cmdMatch[1];
            const arg1 = cmdMatch[2];
            const arg2 = cmdMatch[3] || "";
            if (action === "create") onCreateFile?.(arg1, arg2);
            if (action === "delete") onDeleteFile?.(arg1);
            if (action === "write") onUpdateFile?.(arg1, arg2);
          }
          setHistory([...msgs, { role: "assistant", content: output }]);
          setLoading(false);
        },
        onError: (err) => {
          setLines((p) => [...p, { type: "error", content: err }]);
          setLoading(false);
        },
      });
    } catch {
      setLines((p) => [...p, { type: "error", content: "Connection failed" }]);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { run(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const newIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        setHistoryIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setInput(cmdHistory[newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-[hsl(var(--terminal-bg))] font-mono text-xs"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="px-3 py-1.5 border-b border-border bg-secondary/30 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-destructive/60" />
          <div className="h-2 w-2 rounded-full bg-yellow-500/60" />
          <div className="h-2 w-2 rounded-full bg-cyan/60" />
        </div>
        <span className="text-[10px] text-muted-foreground">terminal</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-0.5 touch-pan-y">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap break-all leading-relaxed ${
              line.type === "input"
                ? "text-cyan"
                : line.type === "error"
                ? "text-destructive"
                : line.type === "system"
                ? "text-cyan/60"
                : "text-foreground/80"
            }`}
          >
            {line.content}
          </div>
        ))}
        {loading && <span className="text-cyan animate-pulse">▌</span>}
      </div>
      <div className="flex items-center px-3 py-2.5 border-t border-border">
        <span className="text-cyan mr-2 text-sm">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-foreground text-sm min-h-[24px] touch-manipulation"
          placeholder={loading ? "running..." : "enter command..."}
          disabled={loading}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
