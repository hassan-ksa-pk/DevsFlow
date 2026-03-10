import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, FolderCode, MessageSquare, GraduationCap, Sparkles, Code2, Search, ArrowRightLeft, Map, Loader2 } from "lucide-react";

const vibeLabels = ["Noob", "Learner", "Builder", "Hacker", "Wizard", "Legend"];

function getVibeLevelFromMessages(count: number): number {
  if (count >= 500) return 6;
  if (count >= 200) return 5;
  if (count >= 100) return 4;
  if (count >= 40) return 3;
  if (count >= 10) return 2;
  return 1;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ projects: 0, messages: 0, courses: 0, publishedCount: 0 });
  const [vibeLevel, setVibeLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    const [projectsRes, messagesRes, coursesRes, profileRes] = await Promise.all([
      supabase.from("projects").select("id, published", { count: "exact" }).eq("user_id", user!.id),
      supabase.from("chat_messages").select("id", { count: "exact" }).eq("user_id", user!.id),
      supabase.from("courses").select("id", { count: "exact" }).eq("user_id", user!.id),
      supabase.from("profiles").select("display_name").eq("id", user!.id).single(),
    ]);

    const projectCount = projectsRes.count || 0;
    const publishedCount = projectsRes.data?.filter((p: any) => p.published).length || 0;
    const messageCount = messagesRes.count || 0;
    const courseCount = coursesRes.count || 0;

    setStats({ projects: projectCount, messages: messageCount, courses: courseCount, publishedCount });
    setDisplayName(profileRes.data?.display_name || user!.email || "");

    const level = getVibeLevelFromMessages(messageCount);
    setVibeLevel(level);

    // Update vibe_level in profile
    await supabase.from("profiles").update({ vibe_level: level } as any).eq("id", user!.id);

    setLoading(false);
  };

  const shortcuts = [
    { label: "Vibe Coder", icon: Sparkles, path: "/editor", color: "text-cyan" },
    { label: "Snippets", icon: Code2, path: "/ai/snippets", color: "text-primary" },
    { label: "Analysis", icon: Search, path: "/ai/analysis", color: "text-primary" },
    { label: "Converter", icon: ArrowRightLeft, path: "/ai/converter", color: "text-primary" },
    { label: "Courses", icon: GraduationCap, path: "/courses", color: "text-cyan" },
    { label: "Roadmap", icon: Map, path: "/roadmap", color: "text-cyan" },
  ];

  if (loading || creditsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-cyan" />
      </div>
    );
  }

  const nextLevelMessages = [0, 10, 40, 100, 200, 500, 999999];
  const currentMin = nextLevelMessages[vibeLevel - 1];
  const currentMax = nextLevelMessages[vibeLevel];
  const progressPercent = Math.min(100, ((stats.messages - currentMin) / (currentMax - currentMin)) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Welcome */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, <span className="text-gradient">{displayName}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your coding overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-cyan" />
              <span className="text-xs font-mono text-muted-foreground">Credits</span>
            </div>
            <p className="text-2xl font-bold font-mono text-cyan">{credits ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">15 daily / 20 max</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderCode className="h-4 w-4 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">Projects</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{stats.projects}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.publishedCount} published</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-cyan" />
              <span className="text-xs font-mono text-muted-foreground">AI Messages</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{stats.messages}</p>
            <p className="text-[10px] text-muted-foreground mt-1">total sent</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">Courses</span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{stats.courses}</p>
            <p className="text-[10px] text-muted-foreground mt-1">enrolled</p>
          </CardContent>
        </Card>
      </div>

      {/* Vibe Level */}
      <Card className="bg-card border-border animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono flex items-center justify-between">
            <span>Vibe Level</span>
            <span className="text-cyan">{vibeLabels[vibeLevel - 1]} ({vibeLevel}/6)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.messages} messages sent · {vibeLevel < 6 ? `${currentMax - stats.messages} more to reach ${vibeLabels[vibeLevel]}` : "Max level reached! 🎉"}
          </p>
        </CardContent>
      </Card>

      {/* Quick shortcuts */}
      <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <h2 className="text-sm font-mono text-muted-foreground mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {shortcuts.map((s) => (
            <button
              key={s.path}
              onClick={() => navigate(s.path)}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-cyan/30 hover:shadow-lg hover:shadow-cyan/5 transition-all duration-300 group text-left"
            >
              <s.icon className={`h-5 w-5 ${s.color} group-hover:scale-110 transition-transform`} />
              <span className="text-sm font-medium text-foreground group-hover:text-cyan transition-colors">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
