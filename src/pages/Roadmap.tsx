import { useState } from "react";
import { Map, Loader2, Sparkles, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { LANGUAGES } from "@/lib/languages";

export default function Roadmap() {
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("");
  const [experience, setExperience] = useState("beginner");
  const [roadmap, setRoadmap] = useState("");
  const [loading, setLoading] = useState(false);
  const { credits, useCredit } = useCredits();

  const generateRoadmap = async () => {
    if (!goal.trim() || !language) return;
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setRoadmap("");
    setLoading(true);
    let full = "";
    try {
      await streamAITool({
        body: {
          type: "courses",
          messages: [{
            role: "user",
            content: `Create a detailed programming learning roadmap for someone who wants to: "${goal}" using ${language}. They are currently at "${experience}" level.

Include:
1. **Phase 1 - Foundations** (weeks 1-4): Core concepts to learn
2. **Phase 2 - Building** (weeks 5-8): Projects and skills to develop
3. **Phase 3 - Advanced** (weeks 9-12): Advanced topics and real-world projects
4. **Phase 4 - Mastery** (weeks 13-16): Portfolio projects and career tips

For each phase include:
- Topics to study with brief descriptions
- Recommended resources (free & paid)
- A mini-project idea
- Skills checklist

Make it actionable, specific, and encouraging. Use markdown with emojis.`
          }],
        },
        onDelta: (chunk) => { full += chunk; setRoadmap(full); },
        onDone: () => setLoading(false),
        onError: (err) => { toast.error(err); setLoading(false); },
      });
    } catch { toast.error("Failed to connect"); setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6 animate-fade-up">
        <div className="h-10 w-10 rounded-lg bg-cyan/10 flex items-center justify-center">
          <Map className="h-5 w-5 text-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Roadmap</h1>
          <p className="text-sm text-muted-foreground">Get a personalized programming learning roadmap</p>
        </div>
      </div>

      <div className="space-y-4 mb-8 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <Input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What do you want to achieve? e.g. Become a full-stack developer"
          className="bg-secondary border-border"
        />
        <div className="flex gap-3">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger className="w-40 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={generateRoadmap}
            disabled={loading || !goal.trim() || !language}
            className="gap-2 bg-cyan hover:bg-cyan/80 text-background shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </Button>
        </div>
      </div>

      {roadmap && (
        <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
          <div className="px-4 py-2 border-b border-border bg-secondary/30 flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-cyan" />
            <span className="text-xs font-mono text-muted-foreground">Your Roadmap</span>
          </div>
          <div className="p-6 prose prose-invert prose-sm max-w-none [&_pre]:bg-[hsl(var(--terminal-bg))] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_code]:text-cyan/90 [&_h2]:text-cyan [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h1]:text-primary">
            <ReactMarkdown>{roadmap}</ReactMarkdown>
          </div>
        </div>
      )}

      {loading && !roadmap && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan" />
          <span className="ml-2 text-muted-foreground text-sm">Generating your roadmap...</span>
        </div>
      )}
    </div>
  );
}
