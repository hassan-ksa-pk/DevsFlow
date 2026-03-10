import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, Code2, Search, ArrowRightLeft, Bug } from "lucide-react";

interface HistoryItem {
  id: string;
  created_at: string;
  model: string;
  result: string;
  code_snippet: string;
  extra_instructions: string | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  analysis: <Search className="h-3.5 w-3.5" />,
  converter: <ArrowRightLeft className="h-3.5 w-3.5" />,
  debug: <Bug className="h-3.5 w-3.5" />,
};

export default function GenerationHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("analysis_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data as HistoryItem[]);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground font-mono">Generation History</h1>
      </div>
      <p className="text-sm text-muted-foreground">All your AI generations in one place.</p>

      {items.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No generations yet. Use AI tools to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="bg-card border-border cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-mono">
                      {item.code_snippet.slice(0, 60).replace(/\n/g, " ")}
                      {item.code_snippet.length > 60 ? "..." : ""}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">{item.model}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {expanded === item.id && (
                <CardContent className="px-4 pb-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Input</p>
                      <ScrollArea className="max-h-40 rounded border border-border bg-secondary/30 p-3">
                        <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80">{item.code_snippet}</pre>
                      </ScrollArea>
                    </div>
                    {item.extra_instructions && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Instructions</p>
                        <p className="text-xs text-foreground/70">{item.extra_instructions}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Result</p>
                      <ScrollArea className="max-h-60 rounded border border-border bg-secondary/30 p-3">
                        <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80">{item.result}</pre>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
