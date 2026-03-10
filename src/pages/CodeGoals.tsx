import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trash2, CheckCircle2, Loader2, Minus, PlusCircle } from "lucide-react";
import { toast } from "sonner";

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  progress: number;
  created_at: string;
}

export default function CodeGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    const { data } = await (supabase.from as any)("code_goals")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setGoals(data || []);
    setLoading(false);
  };

  const addGoal = async () => {
    if (!newGoal.trim() || !user) return;
    const { error } = await (supabase.from as any)("code_goals").insert({
      user_id: user.id,
      title: newGoal.trim(),
      completed: false,
      progress: 0,
    });
    if (error) { toast.error("Failed to add goal"); return; }
    setNewGoal("");
    toast.success("Goal added!");
    fetchGoals();
  };

  const updateProgress = async (goal: Goal, delta: number) => {
    const newProgress = Math.min(100, Math.max(0, goal.progress + delta));
    const completed = newProgress >= 100;

    await (supabase.from as any)("code_goals")
      .update({ progress: newProgress, completed })
      .eq("id", goal.id);

    setGoals(goals.map(g =>
      g.id === goal.id ? { ...g, progress: newProgress, completed } : g
    ));

    if (completed && !goal.completed) {
      toast.success(`🎉 "${goal.title}" completed!`);
    }
  };

  const deleteGoal = async (id: string) => {
    await (supabase.from as any)("code_goals").delete().eq("id", id);
    setGoals(goals.filter(g => g.id !== id));
    toast.success("Goal removed");
  };

  const completedCount = goals.filter(g => g.completed).length;
  const overallProgress = goals.length > 0
    ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
    : 0;

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-8 animate-fade-up">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Code Goals</h1>
          <p className="text-sm text-muted-foreground">Track your coding milestones</p>
        </div>
      </div>

      {/* Overall progress */}
      <Card className="bg-card border-border mb-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-muted-foreground">Overall Progress</span>
            <span className="text-xs font-mono text-primary">{completedCount}/{goals.length} completed • {Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Add goal */}
      <div className="flex gap-2 mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <Input
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="e.g. Build a REST API with Node.js"
          className="bg-secondary border-border"
          onKeyDown={(e) => e.key === "Enter" && addGoal()}
        />
        <Button onClick={addGoal} className="bg-primary hover:bg-primary/80 text-primary-foreground gap-1 shrink-0">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {/* Goals list */}
      <div className="space-y-3">
        {goals.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No goals yet. Add your first coding goal above!</p>
        )}
        {goals.map((goal, i) => (
          <Card
            key={goal.id}
            className={`bg-card border-border animate-fade-up transition-all ${goal.completed ? "opacity-60" : ""}`}
            style={{ animationDelay: `${0.15 + i * 0.03}s` }}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {goal.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Target className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className={`flex-1 text-sm font-medium ${goal.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {goal.title}
                </span>
                <button onClick={() => deleteGoal(goal.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Progress bar + controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => updateProgress(goal, -10)}
                  disabled={goal.progress <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="flex-1 relative">
                  <Progress value={goal.progress} className="h-3" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-primary-foreground mix-blend-difference">
                    {goal.progress}%
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => updateProgress(goal, 10)}
                  disabled={goal.progress >= 100}
                >
                  <PlusCircle className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
