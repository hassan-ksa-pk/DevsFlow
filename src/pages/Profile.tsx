import { useState, useEffect } from "react";
import { User, Save, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AVATAR_COLORS = [
  ["#6366f1", "#818cf8"], ["#06b6d4", "#22d3ee"], ["#f43f5e", "#fb7185"],
  ["#8b5cf6", "#a78bfa"], ["#10b981", "#34d399"], ["#f59e0b", "#fbbf24"],
  ["#ec4899", "#f472b6"], ["#14b8a6", "#2dd4bf"], ["#ef4444", "#f87171"],
  ["#3b82f6", "#60a5fa"],
];
const AVATAR_SHAPES = ["circle", "hexagon", "diamond", "square"] as const;

function generateAvatarSvg(index: number): string {
  const [bg, accent] = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const shape = AVATAR_SHAPES[index % AVATAR_SHAPES.length];
  let shapeEl = "";
  if (shape === "circle") shapeEl = `<circle cx="32" cy="28" r="12" fill="${accent}" opacity="0.6"/><circle cx="32" cy="42" r="16" fill="${accent}" opacity="0.4"/>`;
  else if (shape === "hexagon") shapeEl = `<polygon points="32,12 48,24 48,40 32,52 16,40 16,24" fill="${accent}" opacity="0.5"/>`;
  else if (shape === "diamond") shapeEl = `<rect x="18" y="18" width="28" height="28" rx="4" transform="rotate(45 32 32)" fill="${accent}" opacity="0.5"/>`;
  else shapeEl = `<rect x="16" y="16" width="32" height="32" rx="8" fill="${accent}" opacity="0.5"/>`;
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${bg}"/>${shapeEl}<circle cx="26" cy="28" r="2.5" fill="white"/><circle cx="38" cy="28" r="2.5" fill="white"/><path d="M25 38 Q32 44 39 38" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`)}`;
}
const AVATARS = Array.from({ length: 10 }, (_, i) => generateAvatarSvg(i));

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [vibeLevel, setVibeLevel] = useState(1);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/profile-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      toast.success("Avatar uploaded. Don't forget to Save Profile.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload avatar");
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    if (data) {
      setDisplayName(data.display_name || "");
      setUsername(data.username || "");
      setAbout((data as any).about || "");
      setCustomInstructions((data as any).custom_instructions || "");
      setVibeLevel((data as any).vibe_level || 1);
      setAvatarUrl((data as any).avatar_url || "");
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, username, about, custom_instructions: customInstructions, vibe_level: vibeLevel, avatar_url: avatarUrl || null, updated_at: new Date().toISOString() } as any)
      .eq("id", user!.id);
    if (error) toast.error("Failed to save");
    else toast.success("Profile saved!");
    setSaving(false);
  };

  const vibeLabels = ["Noob", "Learner", "Builder", "Hacker", "Wizard", "Legend"];

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-cyan" /></div>;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="h-10 w-10 rounded-lg overflow-hidden bg-cyan/10 flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-cyan" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="animate-fade-up" style={{ animationDelay: "0.02s" }}>
          <label className="text-xs font-mono text-muted-foreground mb-2 block">Avatar</label>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs font-mono text-muted-foreground cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted/40 transition-colors">
              Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <span className="text-xs text-muted-foreground">or pick one below</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((av, i) => (
              <button
                key={i}
                onClick={() => setAvatarUrl(av)}
                className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all hover:scale-110 ${avatarUrl === av ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              >
                <img src={av} alt={`Avatar ${i + 1}`} className="h-full w-full" />
              </button>
            ))}
          </div>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <label className="text-xs font-mono text-muted-foreground mb-2 block">Display Name</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <label className="text-xs font-mono text-muted-foreground mb-2 block">Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              className="bg-secondary border-border pl-7"
              placeholder="username"
            />
          </div>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <label className="text-xs font-mono text-muted-foreground mb-2 block">About</label>
          <Textarea value={about} onChange={(e) => setAbout(e.target.value)} className="bg-secondary border-border min-h-[80px]" placeholder="Tell us about yourself..." />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <label className="text-xs font-mono text-muted-foreground mb-2 block">Vibe Level</label>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-cyan">{vibeLabels[vibeLevel - 1]} ({vibeLevel}/6)</span>
          </div>
          <p className="text-xs text-muted-foreground/60 mt-1">Vibe level increases automatically as you send more AI messages</p>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
          <label className="text-xs font-mono text-muted-foreground mb-2 block">Custom AI Instructions</label>
          <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} className="bg-secondary border-border min-h-[100px] font-mono text-sm" placeholder="e.g. Always use TypeScript, prefer functional patterns..." />
          <p className="text-xs text-muted-foreground/60 mt-1">These instructions will guide AI when generating code for you</p>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="w-full gap-2 bg-cyan hover:bg-cyan/80 text-background animate-fade-up" style={{ animationDelay: "0.3s" }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
