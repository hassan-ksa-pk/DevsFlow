import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function PublishedProject() {
  const { slug, page } = useParams<{ slug: string; page?: string }>();
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentPage, setCurrentPage] = useState(page || "index.html");

  useEffect(() => {
    if (page) setCurrentPage(page);
  }, [page]);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("projects")
      .select("files")
      .eq("slug", slug)
      .eq("published", true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return; }
        setFiles((data.files || {}) as Record<string, string>);
      });
  }, [slug]);

  const htmlPages = useMemo(() => {
    if (!files) return [];
    return Object.keys(files).filter((f) => f.endsWith(".html"));
  }, [files]);

  const srcDoc = useMemo(() => {
    if (!files) return "";
    const html = files[currentPage] || files["index.html"] || "<html><body><p>No index.html</p></body></html>";

    let doc = html;

    // 1. Replace <script src="..."> with inline content from project files
    doc = doc.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (_match, src) => {
      const resolved = src.replace(/^\.\//, '').replace(/^\//, '');
      if (files[resolved]) return `<script>${files[resolved]}</script>`;
      return _match;
    });

    // 2. Replace <link rel="stylesheet" href="..."> with inline <style>
    doc = doc.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
      if (!match.includes('stylesheet') && !href.endsWith('.css')) return match;
      const resolved = href.replace(/^\.\//, '').replace(/^\//, '');
      if (files[resolved]) return `<style>${files[resolved]}</style>`;
      return match;
    });

    // 3. Inject any remaining project CSS/JS not already referenced
    const cssFiles = Object.keys(files).filter(f => f.endsWith('.css'));
    const jsFiles = Object.keys(files).filter(f => f.endsWith('.js'));

    for (const cssFile of cssFiles) {
      if (!doc.includes(files[cssFile]) && files[cssFile]) {
        doc = doc.replace('</head>', `<style>/* ${cssFile} */\n${files[cssFile]}</style></head>`);
        if (!doc.includes('</head>')) {
          doc = doc.replace('</body>', `<style>/* ${cssFile} */\n${files[cssFile]}</style></body>`);
        }
      }
    }

    for (const jsFile of jsFiles) {
      if (!doc.includes(files[jsFile]) && files[jsFile]) {
        doc = doc.replace('</body>', `<script>/* ${jsFile} */\n${files[jsFile]}</script></body>`);
      }
    }

    // Navigation interceptor for published view
    const pageList = JSON.stringify(Object.keys(files).filter(f => f.endsWith('.html')));
    const navScript = `
      <script>
      (function() {
        var PAGE_LIST = ${pageList};
        function resolveTarget(url) {
          if (!url || typeof url !== 'string') return null;
          url = url.trim();
          if (url.startsWith('#') || url === '' || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) return null;
          if (url.startsWith('http://') || url.startsWith('https://')) return { external: true, url: url };
          var target = url.replace(/^\\.?\\//, '').replace(/^\\.\\//, '');
          if (!target) return null;
          if (PAGE_LIST.indexOf(target) !== -1) return { page: target };
          if (PAGE_LIST.indexOf(target + '.html') !== -1) return { page: target + '.html' };
          var parts = target.split('/');
          var last = parts[parts.length - 1];
          if (PAGE_LIST.indexOf(last) !== -1) return { page: last };
          if (PAGE_LIST.indexOf(last + '.html') !== -1) return { page: last + '.html' };
          return null;
        }
        function handleNav(url) {
          var resolved = resolveTarget(url);
          if (!resolved) return false;
          if (resolved.external) { window.open(resolved.url, '_blank'); return true; }
          window.parent.postMessage({ type: 'published-navigate', page: resolved.page }, '*');
          return true;
        }
        document.addEventListener('click', function(e) {
          var link = e.target.closest('a[href]');
          if (link) {
            var href = link.getAttribute('href');
            if (href && handleNav(href)) { e.preventDefault(); return; }
          }
          var clickable = e.target.closest('[data-href]');
          if (clickable) {
            var dataHref = clickable.getAttribute('data-href');
            if (dataHref && handleNav(dataHref)) { e.preventDefault(); return; }
          }
        }, false);
        try {
          var origHrefDesc = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
          Object.defineProperty(window.Location.prototype, 'href', {
            set: function(url) { if (!handleNav(url)) origHrefDesc.set.call(this, url); },
            get: origHrefDesc.get
          });
        } catch(e) {}
        var origAssign = window.Location.prototype.assign;
        window.Location.prototype.assign = function(url) { if (!handleNav(url)) origAssign.call(this, url); };
        var origReplace = window.Location.prototype.replace;
        window.Location.prototype.replace = function(url) { if (!handleNav(url)) origReplace.call(this, url); };
        var origOpen = window.open;
        window.open = function(url) { if (url && handleNav(url)) return null; return origOpen.apply(this, arguments); };
        var origPush = history.pushState;
        history.pushState = function(s, t, url) { if (url && handleNav(String(url))) return; return origPush.apply(this, arguments); };
        var origRS = history.replaceState;
        history.replaceState = function(s, t, url) { if (url && handleNav(String(url))) return; return origRS.apply(this, arguments); };
        document.addEventListener('submit', function(e) {
          var form = e.target;
          if (form && form.action) {
            var action = form.getAttribute('action');
            if (action && handleNav(action)) { e.preventDefault(); }
          }
        }, true);
      })();
      </script>`;
    doc = doc.replace("</body>", navScript + "</body>");
    return doc;
  }, [files, currentPage]);

  // Listen for navigation messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "published-navigate" && e.data.page) {
        setCurrentPage(e.data.page);
        // Update URL without full reload
        window.history.replaceState(null, "", `/p/${slug}/${e.data.page}`);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Project not found or not published.</p>
      </div>
    );
  }

  if (!files) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {htmlPages.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card overflow-x-auto shrink-0">
          {htmlPages.map((p) => (
            <button
              key={p}
              onClick={() => {
                setCurrentPage(p);
                window.history.replaceState(null, "", `/p/${slug}/${p}`);
              }}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                currentPage === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <iframe
        key={currentPage}
        srcDoc={srcDoc}
        title="Published Project"
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
