import { FileCode, FolderOpen, FolderClosed, Plus, Trash2, FolderPlus, FolderUp, Image, FileImage } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp"];

interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string;
  onSelect: (name: string) => void;
  onAddFile: (name: string) => void;
  onDeleteFile: (name: string) => void;
  onBulkAddFiles?: (files: Record<string, string>) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  children: TreeNode[];
}

function buildTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode[] = [];

  const sortedPaths = Object.keys(files).sort();

  for (const path of sortedPaths) {
    const parts = path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const fullPath = parts.slice(0, i + 1).join("/");
      const isFolder = i < parts.length - 1;

      let existing = current.find((n) => n.name === part && n.isFolder === isFolder);
      if (!existing) {
        existing = { name: part, fullPath, isFolder, children: [] };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    }).map((n) => ({ ...n, children: sortNodes(n.children) }));
  };

  return sortNodes(root);
}

function TreeItem({
  node,
  depth,
  activeFile,
  onSelect,
  onDeleteFile,
  expandedFolders,
  toggleFolder,
}: {
  node: TreeNode;
  depth: number;
  activeFile: string;
  onSelect: (name: string) => void;
  onDeleteFile: (name: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(node.fullPath);

  if (node.isFolder) {
    return (
      <>
        <div
          className="group flex items-center justify-between py-1.5 cursor-pointer text-xs font-mono text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 12}px`, paddingRight: "12px" }}
          onClick={() => toggleFolder(node.fullPath)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {isExpanded ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            ) : (
              <FolderClosed className="h-3.5 w-3.5 shrink-0 text-primary/50" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
        </div>
        {isExpanded &&
          node.children.map((child) => (
            <TreeItem
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              onSelect={onSelect}
              onDeleteFile={onDeleteFile}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
      </>
    );
  }

  return (
    <div
      className={`group flex items-center justify-between py-1.5 cursor-pointer text-xs font-mono transition-colors ${
        node.fullPath === activeFile
          ? "bg-sidebar-accent text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
      style={{ paddingLeft: `${depth * 12 + 12}px`, paddingRight: "12px" }}
      onClick={() => onSelect(node.fullPath)}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {IMAGE_EXTENSIONS.some(ext => node.name.toLowerCase().endsWith(ext)) ? (
          <FileImage className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        ) : (
          <FileCode className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
        onClick={(e) => { e.stopPropagation(); onDeleteFile(node.fullPath); }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".cpp", ".c", ".cs", ".rb", ".php", ".swift", ".kt", ".html", ".css", ".json", ".md", ".yaml", ".yml", ".toml", ".dart", ".lua", ".scala", ".r", ".hs", ".ex", ".zig", ".nim", ".jl", ".sol", ".sh", ".xml", ".svg", ".txt", ".env", ".gitignore", ".lock"];

export function FileTree({ files, activeFile, onSelect, onAddFile, onDeleteFile, onBulkAddFiles }: FileTreeProps) {
  const [addingType, setAddingType] = useState<"file" | "folder" | null>(null);
  const [newName, setNewName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const folderInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const tree = useMemo(() => buildTree(files), [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (addingType === "folder") {
      onAddFile(`${name}/.gitkeep`);
      setExpandedFolders((prev) => new Set(prev).add(name));
    } else {
      onAddFile(name);
    }
    setNewName("");
    setAddingType(null);
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const newFiles: Record<string, string> = {};
    let count = 0;
    for (let i = 0; i < fileList.length && count < 50; i++) {
      const file = fileList[i];
      const isCode = CODE_EXTENSIONS.some((ext) => file.name.endsWith(ext));
      if (!isCode) continue;
      const text = await file.text();
      // webkitRelativePath gives "folder/sub/file.ts"
      const path = file.webkitRelativePath || file.name;
      // Strip the root folder name to keep paths clean
      const parts = path.split("/");
      const cleanPath = parts.length > 1 ? parts.slice(1).join("/") : path;
      newFiles[cleanPath] = text;
      count++;
    }
    if (count === 0) { toast.error("No code files found in folder"); return; }
    if (onBulkAddFiles) {
      onBulkAddFiles(newFiles);
    } else {
      Object.entries(newFiles).forEach(([name, content]) => {
        onAddFile(name);
        // We need the parent to handle content, so use onApplyFileEdit pattern
      });
    }
    toast.success(`Imported ${count} files`);
    // Expand all new folders
    const folders = new Set<string>();
    Object.keys(newFiles).forEach((p) => {
      const parts = p.split("/");
      for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join("/"));
    });
    setExpandedFolders((prev) => new Set([...prev, ...folders]));
    e.target.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    let count = 0;
    for (let i = 0; i < fileList.length && count < 10; i++) {
      const file = fileList[i];
      const isImage = IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!isImage) continue;
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 2MB)`);
        continue;
      }
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const path = `assets/${file.name}`;
      onAddFile(path);
      // Use setTimeout to ensure file is created first, then set content
      setTimeout(() => {
        if (onBulkAddFiles) {
          onBulkAddFiles({ [path]: base64 });
        }
      }, 0);
      count++;
    }
    if (count > 0) {
      toast.success(`Uploaded ${count} image${count > 1 ? "s" : ""}`);
      setExpandedFolders((prev) => new Set([...prev, "assets"]));
    }
    e.target.value = "";
  };

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="text-xs font-mono text-sidebar-foreground uppercase tracking-wider">Explorer</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-sidebar-foreground hover:text-primary"
            onClick={() => setAddingType("file")}
            title="New file"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-sidebar-foreground hover:text-primary"
            onClick={() => setAddingType("folder")}
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-sidebar-foreground hover:text-primary"
            onClick={() => folderInputRef.current?.click()}
            title="Upload folder"
          >
            <FolderUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-sidebar-foreground hover:text-primary"
            onClick={() => imageInputRef.current?.click()}
            title="Upload images"
          >
            <Image className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
        onChange={handleFolderUpload}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,.ico,.svg"
        onChange={handleImageUpload}
      />
      <div className="flex-1 overflow-y-auto py-1">
        {addingType && (
          <div className="px-2 py-1">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAddingType(null); setNewName(""); }
              }}
              onBlur={() => { if (!newName.trim()) { setAddingType(null); setNewName(""); } }}
              placeholder={addingType === "folder" ? "folder-name" : "path/to/file.ts"}
              className="h-6 text-xs bg-secondary border-border font-mono"
            />
          </div>
        )}
        {tree.map((node) => (
          <TreeItem
            key={node.fullPath}
            node={node}
            depth={0}
            activeFile={activeFile}
            onSelect={onSelect}
            onDeleteFile={onDeleteFile}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
          />
        ))}
      </div>
    </div>
  );
}
