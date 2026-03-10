import { Link } from "react-router-dom";
import { Code2, MessageSquare, Layers, Zap, ArrowRight, Terminal, Sparkles, Globe, Shield, Cpu, GitBranch, Palette, BookOpen, Bot, Workflow, Link2, BarChart3, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const features = [
  { icon: Code2, title: "Monaco Editor", desc: "Full-featured code editor with syntax highlighting, autocomplete, and multi-file support.", color: "from-primary to-cyan" },
  { icon: MessageSquare, title: "AI Chat", desc: "Built-in AI assistant that understands your code and helps you build faster.", color: "from-cyan to-primary" },
  { icon: Layers, title: "Workspaces", desc: "Organize your projects with persistent workspaces that save your progress.", color: "from-primary/80 to-cyan/80" },
  { icon: Zap, title: "Live Preview", desc: "See your changes instantly with a built-in live preview panel.", color: "from-cyan/80 to-primary/80" },
];


const codeLines = [
  { indent: 0, tokens: [{ text: "const ", cls: "text-accent" }, { text: "App", cls: "text-primary" }, { text: " = () => {", cls: "text-muted-foreground" }] },
  { indent: 1, tokens: [{ text: "return ", cls: "text-accent" }, { text: "(", cls: "text-muted-foreground" }] },
  { indent: 2, tokens: [{ text: "<", cls: "text-muted-foreground" }, { text: "div", cls: "text-cyan" }, { text: ' className="', cls: "text-muted-foreground" }, { text: "app", cls: "text-primary" }, { text: '">', cls: "text-muted-foreground" }] },
  { indent: 3, tokens: [{ text: "<", cls: "text-muted-foreground" }, { text: "h1", cls: "text-cyan" }, { text: ">", cls: "text-muted-foreground" }, { text: "Hello, DevsFlow!", cls: "text-primary glow-text" }, { text: "</", cls: "text-muted-foreground" }, { text: "h1", cls: "text-cyan" }, { text: ">", cls: "text-muted-foreground" }] },
  { indent: 3, tokens: [{ text: "<", cls: "text-muted-foreground" }, { text: "Button", cls: "text-cyan" }, { text: " onClick={", cls: "text-muted-foreground" }, { text: "handleVibe", cls: "text-accent" }, { text: "}>", cls: "text-muted-foreground" }] },
  { indent: 4, tokens: [{ text: "Start Vibing ✨", cls: "text-primary" }] },
  { indent: 3, tokens: [{ text: "</", cls: "text-muted-foreground" }, { text: "Button", cls: "text-cyan" }, { text: ">", cls: "text-muted-foreground" }] },
  { indent: 2, tokens: [{ text: "</", cls: "text-muted-foreground" }, { text: "div", cls: "text-cyan" }, { text: ">", cls: "text-muted-foreground" }] },
  { indent: 1, tokens: [{ text: ")", cls: "text-muted-foreground" }] },
  { indent: 0, tokens: [{ text: "}", cls: "text-muted-foreground" }] },
];

function FloatingParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <div
      className="absolute rounded-full bg-primary/20 blur-sm animate-float"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${20 + Math.random() * 60}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${5 + Math.random() * 4}s`,
      }}
    />
  );
}

function OrbitingIcon({ icon: Icon, delay, duration, radius }: { icon: any; delay: number; duration: number; radius: number }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -ml-4 -mt-4"
      style={{
        animation: `orbit ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        ["--radius" as any]: `${radius}px`,
      }}
    >
      <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center glow-box">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

function RevolvingBall() {
  return (
    <div className="relative w-24 h-24 mx-auto mb-8">
      {/* Central glowing orb */}
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-cyan blur-md opacity-60 animate-pulse-glow" />
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-cyan" />
      {/* Orbiting rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full border border-primary/30"
          style={{
            animation: `orbit-ring ${3 + i}s linear infinite`,
            animationDelay: `${i * 0.5}s`,
            transform: `rotateX(${60 + i * 15}deg) rotateY(${i * 30}deg)`,
          }}
        >
          <div
            className="absolute h-3 w-3 rounded-full bg-primary glow-box -top-1.5 left-1/2 -ml-1.5"
            style={{ boxShadow: '0 0 12px hsl(155 100% 50% / 0.8)' }}
          />
        </div>
      ))}
    </div>
  );
}

function FeaturesSection() {
  const heading = useScrollReveal();
  const cards = features.map(() => useScrollReveal());

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
      <div
        ref={heading.ref}
        className={`text-center mb-16 transition-all duration-700 ${heading.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <RevolvingBall />
        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
          EVERYTHING YOU <span className="text-gradient">NEED</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          A complete AI-powered development environment built for speed.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <div
            key={f.title}
            ref={cards[i].ref}
            className={`group relative gradient-card rounded-xl border border-border p-6 hover:border-primary/40 transition-all duration-700 overflow-hidden ${cards[i].visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${f.color} p-[1px] mb-4`}>
                <div className="h-full w-full rounded-xl bg-card flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2 tracking-wide">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const capabilities = [
  { icon: Bot, title: "AI Code Generation", desc: "Describe what you want in plain English — the AI writes production-ready code for you in seconds.", color: "from-primary to-cyan" },
  { icon: Bug, title: "Smart Debugging", desc: "Paste an error or describe a bug. AI analyzes your code, finds the root cause, and suggests fixes.", color: "from-cyan to-primary" },
  { icon: BookOpen, title: "AI Courses", desc: "Personalized coding courses with interactive quizzes, challenges, and real-time feedback from AI.", color: "from-primary/80 to-cyan/80" },
  { icon: Workflow, title: "Flow Builder", desc: "Visual drag-and-drop flow builder to design logic, APIs, and app architecture before writing code.", color: "from-cyan/80 to-primary/80" },
  { icon: GitBranch, title: "Version Control", desc: "Every project saves your file history. Roll back changes, compare diffs, and never lose progress.", color: "from-primary to-cyan/70" },
  { icon: Link2, title: "URL Shortener", desc: "Built-in link shortener with click analytics — share projects and track engagement effortlessly.", color: "from-cyan/70 to-primary" },
  { icon: Palette, title: "AI Converter", desc: "Convert code between languages instantly. Python to JavaScript, React to Vue, and more.", color: "from-primary/70 to-cyan" },
  { icon: BarChart3, title: "Code Analysis", desc: "AI-powered code review that checks for performance, security, best practices, and gives a quality score.", color: "from-cyan to-primary/70" },
];

function CapabilitiesSection() {
  const heading = useScrollReveal();
  const cards = capabilities.map(() => useScrollReveal());

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
      <div
        ref={heading.ref}
        className={`text-center mb-16 transition-all duration-700 ${heading.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
          MORE THAN AN <span className="text-gradient">EDITOR</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          A full suite of AI-powered tools to supercharge every part of your workflow.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {capabilities.map((c, i) => (
          <div
            key={c.title}
            ref={cards[i].ref}
            className={`group relative gradient-card rounded-xl border border-border p-5 hover:border-primary/40 transition-all duration-700 overflow-hidden ${cards[i].visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${c.color} p-[1px] mb-3`}>
                <div className="h-full w-full rounded-lg bg-card flex items-center justify-center">
                  <c.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1.5 tracking-wide text-sm">{c.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { num: "01", title: "Describe Your Idea", desc: "Tell the AI what you want to build — a landing page, a full-stack app, or a quick script." },
  { num: "02", title: "AI Generates Code", desc: "Watch as production-ready code appears in the Monaco editor with syntax highlighting and structure." },
  { num: "03", title: "Iterate & Refine", desc: "Chat with the AI to tweak, debug, or extend. Use interactive courses to level up as you build." },
  { num: "04", title: "Ship It", desc: "Publish with one click. Share a live URL, track analytics, and keep building." },
];

function HowItWorksSection() {
  const heading = useScrollReveal();
  const cards = steps.map(() => useScrollReveal());

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
      <div
        ref={heading.ref}
        className={`text-center mb-16 transition-all duration-700 ${heading.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
          HOW IT <span className="text-gradient">WORKS</span>
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          From idea to deployed app in minutes, not days.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <div
            key={s.num}
            ref={cards[i].ref}
            className={`relative text-center transition-all duration-700 ${cards[i].visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionDelay: `${i * 150}ms` }}
          >
            <div className="text-5xl font-display font-black text-primary/10 mb-2">{s.num}</div>
            <h3 className="font-display font-semibold text-foreground mb-2 tracking-wide text-sm">{s.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            {i < steps.length - 1 && (
              <ArrowRight className="hidden lg:block absolute -right-3 top-8 h-5 w-5 text-primary/20" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Landing() {
  const [typedIndex, setTypedIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTypedIndex((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const taglines = ["vibe coding", "AI power", "zero friction", "pure flow"];

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
            animation: "grid-scroll 3s linear infinite",
          }}
        />
        {/* Radial glow spots */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan/5 rounded-full blur-[100px] animate-float-delayed" />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <FloatingParticle key={i} delay={i * 0.7} x={8 + i * 8} size={4 + (i % 3) * 3} />
      ))}

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center animate-glow-pulse">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-display font-bold text-foreground tracking-wider">
            DEVS<span className="text-primary glow-text">FLOW</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-display text-xs tracking-wider">
              Sign in
            </Button>
          </Link>
          <Link to="/auth?mode=signup">
            <Button size="sm" className="font-display text-xs tracking-wider glow-box gap-2">
              <Sparkles className="h-3 w-3" /> Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-primary/20 bg-primary/5 text-xs font-display tracking-widest text-primary/80 animate-fade-up animate-border-glow">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          AI-POWERED CODING ENVIRONMENT
        </div>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-display font-black tracking-tight leading-[1.05] mb-2 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          BUILD APPS WITH
        </h1>
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-display font-black tracking-tight leading-[1.05] mb-8 animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <span
            className="text-gradient glow-text inline-block"
            key={typedIndex}
            style={{ animation: "fade-up 0.4s ease-out" }}
          >
            {taglines[typedIndex].toUpperCase()}
          </span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-up leading-relaxed" style={{ animationDelay: "0.2s" }}>
          An AI-native IDE where you describe what you want and watch it come to life.
          Monaco editor, live preview, and an AI that actually <span className="text-primary font-medium">gets</span> your code.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="gap-2 glow-box font-display tracking-wider text-sm px-8 py-6 relative overflow-hidden group">
              <span className="relative z-10 flex items-center gap-2">
                START BUILDING <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="lg" className="font-display tracking-wider text-sm px-8 py-6 border-border hover:border-primary/50 hover:glow-box transition-all">
              SIGN IN
            </Button>
          </Link>
        </div>

      </section>

      {/* Editor Preview with scan line */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20 animate-fade-up" style={{ animationDelay: "0.5s" }}>
        <div className="rounded-xl border border-border bg-card overflow-hidden glow-border relative group hover:glow-box transition-all duration-700">
          {/* Scan line effect */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-scan-line pointer-events-none z-20" />

          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-destructive/60 hover:bg-destructive transition-colors" />
              <div className="h-3 w-3 rounded-full bg-accent/60 hover:bg-accent transition-colors" />
              <div className="h-3 w-3 rounded-full bg-primary/60 hover:bg-primary transition-colors" />
            </div>
            <span className="text-xs font-display tracking-wider text-muted-foreground ml-2">DEVSFLOW — WORKSPACE</span>
          </div>
          <div className="flex h-72 md:h-80">
            {/* Sidebar mock */}
            <div className="w-44 border-r border-border bg-secondary/30 p-3 hidden sm:block">
              <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-3">EXPLORER</div>
              {["index.tsx", "App.tsx", "styles.css", "utils.ts", "api.ts"].map((f, i) => (
                <div
                  key={f}
                  className={`text-xs font-mono py-1.5 px-2 rounded cursor-default transition-all ${i === 1 ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-muted-foreground hover:bg-surface-hover"}`}
                >
                  {f}
                </div>
              ))}
            </div>
            {/* Editor mock with line numbers */}
            <div className="flex-1 p-4 font-mono text-sm overflow-hidden relative">
              {codeLines.map((line, i) => (
                <div key={i} className="flex gap-4" style={{ paddingLeft: line.indent * 16 }}>
                  <span className="text-muted-foreground/30 text-xs w-4 text-right select-none shrink-0">{i + 1}</span>
                  <span>
                    {line.tokens.map((t, j) => (
                      <span key={j} className={t.cls}>{t.text}</span>
                    ))}
                  </span>
                </div>
              ))}
              {/* Blinking cursor */}
              <div className="absolute bottom-4 left-[100px] h-4 w-[2px] bg-primary animate-blink" />
            </div>
            {/* Chat mock */}
            <div className="w-56 md:w-64 border-l border-border bg-secondary/20 p-3 hidden md:block">
              <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-3">AI CHAT</div>
              <div className="bg-surface rounded-lg p-2.5 mb-2 text-xs text-secondary-foreground border border-border">
                Help me add a dark theme toggle ✨
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 text-xs text-primary animate-fade-up">
                I'll add a theme toggle using next-themes with a smooth transition...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <FeaturesSection />

      {/* Capabilities deep-dive */}
      <CapabilitiesSection />

      {/* How it works */}
      <HowItWorksSection />

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-12 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-cyan/5 animate-gradient-shift" style={{ backgroundSize: "200% 200%" }} />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground mb-4">
              READY TO <span className="text-gradient glow-text">VIBE</span>?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Join thousands of developers building with AI. It's free to get started.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gap-2 glow-box font-display tracking-wider text-sm px-10 py-6 group">
                <Sparkles className="h-4 w-4 group-hover:animate-pulse-glow" />
                START FOR FREE
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-display text-sm tracking-wider text-foreground">
            DEVS<span className="text-primary">FLOW</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Built with DevsFlow — the AI coding platform
        </p>
      </footer>
    </div>
  );
}
