import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, ArrowLeft, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PreviewPanelProps {
  files: Record<string, string>;
}

function getHtmlFiles(files: Record<string, string>): string[] {
  return Object.keys(files).filter((f) => f.endsWith(".html"));
}

function buildSrcDoc(files: Record<string, string>, page: string): string {
  const html = files[page] || "<html><body><p>Page not found</p></body></html>";

  let doc = html;

  // 1. Replace <script src="..."> references with inline content from project files
  doc = doc.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (_match, src) => {
    const resolved = src.replace(/^\.\//, '').replace(/^\//, '');
    if (files[resolved]) {
      return `<script>${files[resolved]}</script>`;
    }
    return _match; // keep external CDN scripts unchanged
  });

  // 2. Replace <link rel="stylesheet" href="..."> with inline <style> for project files
  // Also handle favicon/icon links by inlining as data URIs
  const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp"];
  doc = doc.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
    const resolved = href.replace(/^\.\//, '').replace(/^\//, '');
    // Handle favicon / icon links
    if (match.includes('icon') && files[resolved]) {
      const content = files[resolved];
      if (content.startsWith('data:')) {
        return match.replace(href, content);
      }
      if (resolved.endsWith('.svg')) {
        const encoded = 'data:image/svg+xml,' + encodeURIComponent(content);
        return match.replace(href, encoded);
      }
    }
    if (!match.includes('stylesheet') && !href.endsWith('.css')) return match;
    if (files[resolved]) {
      return `<style>${files[resolved]}</style>`;
    }
    return match; // keep external CDN links unchanged
  });

  // 2b. Replace image src attributes with base64 data from project files
  doc = doc.replace(/(src|href)=["']([^"']+)["']/gi, (match, attr, path) => {
    const resolved = path.replace(/^\.\//, '').replace(/^\//, '');
    if (files[resolved] && IMAGE_EXTENSIONS.some(ext => resolved.toLowerCase().endsWith(ext))) {
      const content = files[resolved];
      if (content.startsWith('data:')) {
        return `${attr}="${content}"`;
      }
      if (resolved.endsWith('.svg')) {
        return `${attr}="data:image/svg+xml,${encodeURIComponent(content)}"`;
      }
    }
    return match;
  });

  // 3. Inject any remaining project CSS/JS not already referenced in HTML
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

  // Inject navigation interceptor — full browser simulation
  // Intercepts ALL navigation: <a>, buttons with onclick, window.location,
  // form actions, setTimeout navigations, and any JS that sets location
  const navScript = `
<script>
(function() {
  var PAGE_LIST = ${JSON.stringify(Object.keys(files).filter(f => f.endsWith('.html')))};

  function resolveTarget(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (url.startsWith('#') || url === '' || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return { external: true, url: url };
    var target = url.replace(/^\\.?\\//, '').replace(/^\\.\\//, '');
    if (!target) return null;
    // Try exact match first
    if (PAGE_LIST.indexOf(target) !== -1) return { page: target };
    // Try with .html
    if (PAGE_LIST.indexOf(target + '.html') !== -1) return { page: target + '.html' };
    // Try just the filename part
    var parts = target.split('/');
    var last = parts[parts.length - 1];
    if (PAGE_LIST.indexOf(last) !== -1) return { page: last };
    if (PAGE_LIST.indexOf(last + '.html') !== -1) return { page: last + '.html' };
    return null;
  }

  function handleNav(url) {
    var resolved = resolveTarget(url);
    if (!resolved) return false;
    if (resolved.external) {
      window.parent.postMessage({ type: 'devsflow-open-external', url: resolved.url }, '*');
      return true;
    }
    window.parent.postMessage({ type: 'devsflow-navigate', page: resolved.page }, '*');
    return true;
  }

  // 1. Intercept <a> and [data-href] clicks for navigation only
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

  // 2. Proxy window.location.href setter
  try {
    var origHrefDesc = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href');
    Object.defineProperty(window.Location.prototype, 'href', {
      set: function(url) { if (!handleNav(url)) origHrefDesc.set.call(this, url); },
      get: origHrefDesc.get
    });
  } catch(e) {}

  // 3. Intercept window.location.assign and .replace
  var origAssign = window.Location.prototype.assign;
  window.Location.prototype.assign = function(url) { if (!handleNav(url)) origAssign.call(this, url); };
  var origReplace = window.Location.prototype.replace;
  window.Location.prototype.replace = function(url) { if (!handleNav(url)) origReplace.call(this, url); };

  // 4. Intercept window.open
  var origOpen = window.open;
  window.open = function(url) { if (url && handleNav(url)) return null; return origOpen.apply(this, arguments); };

  // 5. Intercept history.pushState/replaceState
  var origPush = history.pushState;
  history.pushState = function(s, t, url) { if (url && handleNav(String(url))) return; return origPush.apply(this, arguments); };
  var origRS = history.replaceState;
  history.replaceState = function(s, t, url) { if (url && handleNav(String(url))) return; return origRS.apply(this, arguments); };

  // 6. Observe DOM for dynamically added onclick handlers that do navigation
  // Override setTimeout/setInterval to catch delayed navigations
  var origSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, delay) {
    if (typeof fn === 'string' && handleNav(fn)) return 0;
    return origSetTimeout.apply(this, arguments);
  };

  // 7. Intercept form submissions that navigate
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action) {
      var action = form.getAttribute('action');
      if (action && handleNav(action)) { e.preventDefault(); }
    }
  }, true);
})();
</script>`;

  doc = doc.replace("</body>", `${navScript}</body>`);
  return doc;
}

export function PreviewPanel({ files }: PreviewPanelProps) {
  const [key, setKey] = useState(0);
  const [currentPage, setCurrentPage] = useState("index.html");
  const [urlInput, setUrlInput] = useState("index.html");
  const [history, setHistory] = useState<string[]>(["index.html"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pages = useMemo(() => getHtmlFiles(files), [files]);

  const navigateTo = useCallback((page: string) => {
    // Add .html if no extension
    let target = page;
    if (!target.includes('.')) target = target + '.html';
    if (!files[target]) return;
    setCurrentPage(target);
    setUrlInput(target);
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), target];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
    setKey((k) => k + 1);
  }, [files, historyIndex]);

  // Listen for postMessage navigation and external URL opening from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'devsflow-navigate' && e.data?.page) {
        navigateTo(e.data.page);
      }
      if (e.data?.type === 'devsflow-open-external' && e.data?.url) {
        window.open(e.data.url, '_blank', 'noopener,noreferrer');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [navigateTo]);

  const goBack = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setCurrentPage(history[newIndex]);
    setUrlInput(history[newIndex]);
    setKey((k) => k + 1);
  };

  const goForward = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setCurrentPage(history[newIndex]);
    setUrlInput(history[newIndex]);
    setKey((k) => k + 1);
  };

  const handleUrlSubmit = () => {
    const target = urlInput.trim();
    if (target && files[target]) {
      navigateTo(target);
    }
  };

  const srcDoc = useMemo(() => buildSrcDoc(files, currentPage), [files, currentPage, key]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Browser toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border bg-secondary/30">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={goBack} disabled={historyIndex <= 0}>
          <ArrowLeft className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={goForward} disabled={historyIndex >= history.length - 1}>
          <ArrowRight className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => setKey((k) => k + 1)}>
          <RefreshCw className="h-3 w-3" />
        </Button>
        <div className="flex-1 flex items-center gap-1.5 bg-background/50 rounded-md px-2 py-0.5 border border-border">
          <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="h-5 border-0 bg-transparent text-xs font-mono p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="index.html"
          />
        </div>
      </div>

      {/* Page tabs */}
      {pages.length > 1 && (
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-secondary/20 overflow-x-auto">
          {pages.map((page) => (
            <button
              key={page}
              onClick={() => navigateTo(page)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all whitespace-nowrap ${
                currentPage === page
                  ? "bg-background text-cyan shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 bg-foreground/[0.02]">
        <iframe
          key={key}
          srcDoc={srcDoc}
          title="Preview"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
