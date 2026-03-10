import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link2, Copy, Trash2, Loader2, ExternalLink, MousePointerClick, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface ShortUrl {
  id: string;
  code: string;
  redirect_url: string;
  clicks: number;
  created_at: string;
}

function generateCode(custom?: string) {
  if (custom) return custom.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function URLShortener() {
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (user) fetchUrls();
  }, [user]);

  const fetchUrls = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("short_urls")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setUrls((data as ShortUrl[]) || []);
    setLoading(false);
  };

  const createShortUrl = async () => {
    if (!url.trim() || !user) return;
    try { new URL(url); } catch { toast.error("Enter a valid URL"); return; }
    if (customCode && customCode.length < 2) { toast.error("Custom code must be at least 2 characters"); return; }
    setCreating(true);
    const code = generateCode(customCode || undefined);
    const { data: existing } = await supabase.from("short_urls").select("id").eq("code", code).limit(1);
    if (existing && existing.length > 0) { toast.error(`Code "${code}" is already taken. Try another.`); setCreating(false); return; }
    const { error } = await supabase.from("short_urls").insert({
      user_id: user.id,
      code,
      redirect_url: url.trim(),
    });
    if (error) { toast.error("Failed to create short URL"); setCreating(false); return; }
    toast.success("Short URL created!");
    setUrl("");
    setCustomCode("");
    setShowDialog(false);
    fetchUrls();
    setCreating(false);
  };

  const deleteUrl = async (id: string) => {
    await supabase.from("short_urls").delete().eq("id", id);
    setUrls((prev) => prev.filter((u) => u.id !== id));
    toast.success("Deleted");
  };

  const copyUrl = (code: string) => {
    const shortUrl = `${window.location.origin}/dev/${code}`;
    navigator.clipboard.writeText(shortUrl);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            URL Shortener
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create short links with <code className="text-primary">/dev/</code> prefix</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-1.5 bg-primary hover:bg-primary/80 text-primary-foreground">
          <Plus className="h-4 w-4" /> Add URL
        </Button>
      </div>

      {/* Add URL Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shorten a URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/very/long/url"
              className="bg-secondary border-border font-mono text-sm"
              onKeyDown={(e) => e.key === "Enter" && createShortUrl()}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 font-mono">/dev/</span>
              <Input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="custom-code (optional)"
                className="bg-secondary border-border font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Preview: {window.location.origin}/dev/{customCode || "auto-generated"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={createShortUrl} disabled={creating || !url.trim()} className="gap-1.5 bg-primary hover:bg-primary/80 text-primary-foreground">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Shorten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : urls.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">No short URLs yet. Click "Add URL" to create one!</p>
      ) : (
        <div className="space-y-2">
          {urls.map((item) => {
            const shortUrl = `${window.location.origin}/dev/${item.code}`;
            return (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-primary truncate">{shortUrl}</code>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
                      <MousePointerClick className="h-2.5 w-2.5" /> {item.clicks}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.redirect_url}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyUrl(item.code)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                    <a href={item.redirect_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteUrl(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
