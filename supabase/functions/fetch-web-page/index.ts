import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function stripHtmlToText(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : null;
  // Remove scripts/styles then tags.
  const noScripts = html
    .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style[\\s\\S]*?<\\/style>/gi, " ");
  const text = noScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\s+/g, " ")
    .trim();
  return { title, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { page_id } = await req.json();
    if (!page_id) {
      return new Response(JSON.stringify({ error: "page_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: page, error: pageErr } = await supabase
      .from("knowledge_web_pages")
      .select("id, url")
      .eq("id", page_id)
      .single();

    if (pageErr || !page) {
      return new Response(JSON.stringify({ error: "Page not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(page.url, {
      headers: {
        "User-Agent": "DevsFlowBot/1.0 (+https://devsflow.ai)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    const html = await resp.text();

    const { title, text } = stripHtmlToText(html);
    const clipped = text.slice(0, 50000);

    const { error: updErr } = await supabase
      .from("knowledge_web_pages")
      .update({
        title: title || new URL(page.url).hostname,
        content_text: clipped,
        last_fetched_at: new Date().toISOString(),
      })
      .eq("id", page_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true, title: title || null, chars: clipped.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-web-page error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

