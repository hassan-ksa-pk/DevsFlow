import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function BotHosted() {
  const { slug } = useParams();
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (!slug) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-bot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ slug }),
        });
        const raw = await res.text();
        let data: any = {};
        try { data = JSON.parse(raw || "{}"); } catch { data = {}; }
        if (!res.ok) throw new Error(data?.error || raw || "Failed to load bot via function");
        if (data?.html) {
          setHtml(data.html);
          return;
        }
        throw new Error("Empty HTML from function");
      } catch (e) {
        // Fallback: direct Supabase query (requires public policy on is_public=true)
        try {
          const { data, error } = await supabase
            .from("chatbot_projects")
            .select("custom_html")
            .eq("slug", slug)
            .eq("is_public", true)
            .single();
          if (error) throw error;
          if (!data?.custom_html) throw new Error("Bot has no hosted HTML yet");
          setHtml(data.custom_html as string);
        } catch (dbErr) {
          setError(dbErr instanceof Error ? dbErr.message : (dbErr as any)?.message || (e instanceof Error ? e.message : "Failed to load bot"));
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-cyan" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Bot unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Bot not published yet</h1>
          <p className="text-sm text-muted-foreground">This bot doesn&apos;t have hosted HTML saved. Open it in the dashboard and save the Hosted HTML.</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title={slug}
      className="w-full h-screen border-0"
      // eslint-disable-next-line react/no-danger
      srcDoc={html}
      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
    />
  );
}
