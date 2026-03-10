import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function RedirectPage() {
  const { code } = useParams<{ code: string }>();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    supabase
      .from("short_urls")
      .select("redirect_url")
      .eq("code", code)
      .limit(1)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) { setNotFound(true); return; }
        // Increment clicks (fire and forget)
        supabase.rpc("increment_short_url_clicks" as any, { p_code: code });
        window.location.href = data[0].redirect_url;
      });
  }, [code]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Short link not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </div>
  );
}
