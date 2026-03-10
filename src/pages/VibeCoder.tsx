import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FolderCode, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  published: boolean;
  slug: string | null;
}

export default function VibeCoder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setProjects(data || []);
    setLoading(false);
  };

  const createProject = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    const devsflowFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0a0a0a"/><text x="8" y="44" font-family="monospace" font-size="36" fill="#a855f7">{</text><text x="36" y="44" font-family="monospace" font-size="36" fill="#a855f7">}</text><circle cx="28" cy="26" r="4" fill="#06b6d4"/><circle cx="38" cy="34" r="3" fill="#06b6d4"/></svg>`;
    const defaultFiles: Record<string, string> = {
      "index.html": `<!DOCTYPE html>\n<html>\n<head>\n  <title>My App</title>\n  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World</h1>\n  <script src="main.js"></script>\n</body>\n</html>`,
      "style.css": "body {\n  font-family: system-ui, sans-serif;\n  margin: 0;\n  padding: 2rem;\n  background: #0a0a0a;\n  color: #fafafa;\n}\n\nh1 {\n  color: #00ff88;\n}",
      "main.js": "console.log('Hello from DevsFlow!');\n",
      "assets/favicon.svg": devsflowFavicon,
    };
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: newName.trim(), user_id: user.id, files: defaultFiles })
      .select()
      .single();
    if (error) toast.error(error.message);
    else {
      setNewName("");
      navigate(`/editor/${data.id}`);
    }
    setCreating(false);
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setProjects((p) => p.filter((proj) => proj.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-cyan" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold mb-2 text-foreground animate-fade-up">Vibe Coder</h1>
      <p className="text-muted-foreground mb-8 animate-fade-up" style={{ animationDelay: "0.05s" }}>Create and manage your coding workspaces</p>

      <div className="flex gap-3 mb-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project name..."
          className="bg-secondary border-border"
          onKeyDown={(e) => e.key === "Enter" && createProject()}
        />
        <Button onClick={createProject} disabled={creating || !newName.trim()} className="gap-2 shrink-0 bg-cyan hover:bg-cyan/80 text-background">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg animate-fade-up">
          <FolderCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">No projects yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-cyan/30 hover:shadow-lg hover:shadow-cyan/5 transition-all duration-300 cursor-pointer group animate-fade-up"
              style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
              onClick={() => navigate(`/editor/${p.id}`)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground group-hover:text-cyan transition-colors">{p.name}</h3>
                  {p.published && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Live</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
