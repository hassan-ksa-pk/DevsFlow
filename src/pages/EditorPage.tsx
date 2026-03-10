import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FileTree } from "@/components/editor/FileTree";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { DiffChatPanel } from "@/components/editor/DiffChatPanel";
import { PreviewPanel } from "@/components/editor/PreviewPanel";
// Terminal temporarily disabled from UI but kept for future re-wiring
// import { TerminalPanel } from "@/components/editor/TerminalPanel";
import { Button } from "@/components/ui/button";
import { Terminal, ArrowLeft, Save, Loader2, Code2, Eye, TerminalSquare, Sparkles, Zap, Globe, X, Check, FolderUp, ExternalLink, Copy, Download, Undo2 } from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

type EditorView = "ide" | "preview" | "ai";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<EditorView>("ai");
  const [showTerminal, setShowTerminal] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [publishSlug, setPublishSlug] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fileHistory, setFileHistory] = useState<Record<string, string>[]>([]);
  const MAX_HISTORY = 2;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) fetchProject();
  }, [user, id]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast.error("Project not found");
      navigate("/dashboard");
      return;
    }
    setProject(data);
    const f = (data.files || {}) as Record<string, string>;
    setFiles(f);
    const keys = Object.keys(f);
    // Restore last active file from localStorage, fallback to first file
    const storedFile = localStorage.getItem(`devsflow_active_file_${id}`);
    if (storedFile && f[storedFile]) {
      setActiveFile(storedFile);
    } else if (keys.length > 0) {
      setActiveFile(keys[0]);
    }
    setLoading(false);
  };

  const saveProject = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({ files, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Failed to save");
    else toast.success("Saved");
    setSaving(false);
  }, [id, files]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveProject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveProject]);

  // Save on tab/page leave
  const filesRef = useRef(files);
  filesRef.current = files;
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && id) {
        supabase
          .from("projects")
          .update({ files: filesRef.current, updated_at: new Date().toISOString() })
          .eq("id", id)
          .then(() => {});
      }
    };
    const handleBeforeUnload = () => {
      if (id) {
        supabase
          .from("projects")
          .update({ files: filesRef.current, updated_at: new Date().toISOString() })
          .eq("id", id)
          .then(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [id]);

  // Autosave when switching files
  const prevActiveFile = useRef(activeFile);
  useEffect(() => {
    if (prevActiveFile.current && prevActiveFile.current !== activeFile && id) {
      supabase
        .from("projects")
        .update({ files: filesRef.current, updated_at: new Date().toISOString() })
        .eq("id", id)
        .then(() => {});
    }
    prevActiveFile.current = activeFile;
    // Persist active file to localStorage
    if (activeFile && id) {
      localStorage.setItem(`devsflow_active_file_${id}`, activeFile);
    }
  }, [activeFile, id]);

  const updateFile = (content: string) => {
    setFileHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), { ...files }]);
    setFiles((prev) => ({ ...prev, [activeFile]: content }));
  };

  const addFile = (name: string, content = "") => {
    if (files[name] !== undefined && !content) { toast.error("File already exists"); return; }
    setFiles((prev) => ({ ...prev, [name]: content || prev[name] || "" }));
    if (!content) setActiveFile(name);
  };

  const bulkAddFiles = (newFiles: Record<string, string>) => {
    setFiles((prev) => ({ ...prev, ...newFiles }));
    const firstKey = Object.keys(newFiles)[0];
    if (firstKey) setActiveFile(firstKey);
  };

  const deleteFile = (name: string) => {
    const next = { ...files };
    delete next[name];
    setFiles(next);
    const keys = Object.keys(next);
    if (activeFile === name) setActiveFile(keys[0] || "");
  };

  const applyFileEdit = (filename: string, content: string) => {
    setFileHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), { ...files }]);
    setFiles((prev) => {
      const updated = { ...prev, [filename]: content };
      if (id) {
        supabase
          .from("projects")
          .update({ files: updated, updated_at: new Date().toISOString() })
          .eq("id", id)
          .then(() => {});
      }
      return updated;
    });
  };

  const undoEdit = () => {
    if (fileHistory.length === 0) { toast.error("Nothing to undo"); return; }
    const prev = fileHistory[fileHistory.length - 1];
    setFileHistory((h) => h.slice(0, -1));
    setFiles(prev);
    toast.success("Reverted to previous state");
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    Object.entries(files).forEach(([name, content]) => zip.file(name, content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "project"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug.trim()) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    const { data } = await supabase
      .from("projects")
      .select("id")
      .eq("slug", slug)
      .neq("id", id || "")
      .limit(1);
    setSlugAvailable(!data || data.length === 0);
    setCheckingSlug(false);
  };

  const handlePublish = async () => {
    if (!id || !project || !publishSlug.trim() || slugAvailable === false) return;
    setPublishing(true);
    const { error } = await supabase
      .from("projects")
      .update({ published: !project.published, slug: publishSlug })
      .eq("id", id);
    if (error) { toast.error("Failed to publish"); setPublishing(false); return; }
    const newPublished = !project.published;
    setProject((prev: any) => ({ ...prev, published: newPublished, slug: publishSlug }));
    if (newPublished) {
      const publishedUrl = `${window.location.origin}/p/${publishSlug}`;
      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Published successfully! 🎉</p>
          <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline text-cyan break-all">{publishedUrl}</a>
        </div>,
        { duration: 10000 }
      );
    } else {
      toast.success("Unpublished");
    }
    setShowPublish(false);
    setPublishing(false);
  };

  const openPublishDialog = () => {
    const slug = project?.slug || project?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "";
    setPublishSlug(slug);
    setSlugAvailable(null);
    setShowPublish(true);
    if (slug) checkSlugAvailability(slug);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-cyan" />
      </div>
    );
  }

  const navItems: { key: EditorView; label: string; icon: React.ReactNode }[] = [
    { key: "ide", label: "IDE", icon: <Code2 className="h-3.5 w-3.5" /> },
    { key: "preview", label: "Preview", icon: <Eye className="h-3.5 w-3.5" /> },
    { key: "ai", label: "AI", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top navbar */}
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono font-medium text-foreground hidden sm:inline">
              Devs<span className="text-primary">Flow</span>
            </span>
            <span className="text-xs text-muted-foreground font-mono ml-1 truncate max-w-[100px] sm:max-w-none">/ {project?.name}</span>
          </div>
        </div>

        {/* Center nav tabs */}
        <div className="flex items-center bg-secondary rounded-md p-0.5 gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded text-xs font-mono transition-all duration-300 ${
                activeView === item.key
                  ? "bg-background text-cyan shadow-sm shadow-cyan/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {credits !== null && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20 hidden sm:inline-flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" />
              {credits}
            </span>
          )}
          {/* Terminal button temporarily hidden - can be re-enabled */}
          {/* <Button
            variant={showTerminal ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowTerminal((v) => !v)}
          >
            <TerminalSquare className="h-3 w-3" />
            <span className="hidden sm:inline">Terminal</span>
          </Button> */}
          <Button size="sm" className="h-7 gap-1 text-xs bg-cyan hover:bg-cyan/80 text-background" onClick={saveProject} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={undoEdit} disabled={fileHistory.length === 0} title="Undo last edit">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={downloadZip} title="Download as ZIP">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            variant={project?.published ? "secondary" : "outline"}
            onClick={openPublishDialog}
          >
            <Globe className="h-3 w-3" />
            <span className="hidden sm:inline">{project?.published ? "Unpublish" : "Publish"}</span>
          </Button>
          {project?.published && project?.slug && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                onClick={() => {
                  const url = `${window.location.origin}/p/${project.slug}`;
                  navigator.clipboard.writeText(url);
                  toast.success("URL copied!");
                }}
                title="Copy published URL"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground"
                asChild
                title="Open published site"
              >
                <a href={`/p/${project.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Publish Dialog */}
      <Dialog open={showPublish} onOpenChange={setShowPublish}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{project?.published ? "Unpublish Project" : "Publish Project"}</DialogTitle>
          </DialogHeader>
          {!project?.published ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-muted-foreground mb-2 block">Choose a unique URL name</label>
                <div className="flex gap-2">
                  <Input
                    value={publishSlug}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                      setPublishSlug(val);
                      setSlugAvailable(null);
                    }}
                    onBlur={() => checkSlugAvailability(publishSlug)}
                    placeholder="my-awesome-project"
                    className="bg-secondary border-border font-mono text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={() => checkSlugAvailability(publishSlug)} disabled={checkingSlug || !publishSlug.trim()}>
                    {checkingSlug ? <Loader2 className="h-3 w-3 animate-spin" /> : "Check"}
                  </Button>
                </div>
                {slugAvailable === true && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1"><Check className="h-3 w-3" /> Available!</p>
                )}
                {slugAvailable === false && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1"><X className="h-3 w-3" /> Already taken</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">Your project will be live at: /p/{publishSlug || "..."}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This will unpublish your project and remove it from public access.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublish(false)}>Cancel</Button>
            <Button
              onClick={handlePublish}
              disabled={publishing || (!project?.published && (slugAvailable !== true || !publishSlug.trim()))}
              className="gap-2 bg-cyan hover:bg-cyan/80 text-background"
            >
              {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
              {project?.published ? "Unpublish" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content based on active view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === "ide" && (
          isMobile ? (
            <div className="flex-1 flex flex-col">
              {activeFile ? (
                <div className="flex-1 flex flex-col">
                  <div className="px-3 py-1.5 border-b border-border bg-secondary/30 flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground truncate">{activeFile}</span>
                  </div>
                  <div className="flex-1">
                    <CodeEditor filename={activeFile} value={files[activeFile] || ""} onChange={updateFile} />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Select or create a file
                </div>
              )}
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                <FileTree
                  files={files}
                  activeFile={activeFile}
                  onSelect={setActiveFile}
                  onAddFile={addFile}
                  onDeleteFile={deleteFile}
                  onBulkAddFiles={bulkAddFiles}
                />
              </ResizablePanel>
              <ResizableHandle className="w-px bg-border" />
              <ResizablePanel defaultSize={55}>
                {activeFile ? (
                  <div className="h-full flex flex-col">
                    <div className="px-3 py-1.5 border-b border-border bg-secondary/30">
                      <span className="text-xs font-mono text-muted-foreground">{activeFile}</span>
                    </div>
                    <div className="flex-1">
                      <CodeEditor filename={activeFile} value={files[activeFile] || ""} onChange={updateFile} />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Select or create a file
                  </div>
                )}
              </ResizablePanel>
              <ResizableHandle className="w-px bg-border" />
              <ResizablePanel defaultSize={30}>
                <PreviewPanel files={files} />
              </ResizablePanel>
            </ResizablePanelGroup>
          )
        )}

        {activeView === "preview" && (
          <div className="flex-1">
            <PreviewPanel files={files} />
          </div>
        )}

        {activeView === "ai" && (
          isMobile ? (
            <div className="flex-1">
              <DiffChatPanel
                projectId={id || ""}
                activeFile={activeFile}
                files={files}
                onApplyFileEdit={applyFileEdit}
              />
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={35}>
                <DiffChatPanel
                  projectId={id || ""}
                  activeFile={activeFile}
                  files={files}
                  onApplyFileEdit={applyFileEdit}
                />
              </ResizablePanel>
              <ResizableHandle className="w-px bg-border" />
              <ResizablePanel defaultSize={65}>
                <PreviewPanel files={files} />
              </ResizablePanel>
            </ResizablePanelGroup>
          )
        )}

        {/* Terminal panel - temporarily disabled, can be re-wired */}
        {/* {showTerminal && (
          <div className="h-48 border-t border-border shrink-0 animate-slide-up">
            <TerminalPanel
              files={files}
              onCreateFile={(name, content) => addFile(name, content)}
              onDeleteFile={deleteFile}
              onUpdateFile={(name, content) => setFiles((prev) => ({ ...prev, [name]: content }))}
            />
          </div>
        )} */}
      </div>
    </div>
  );
}
