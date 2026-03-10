import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Terminal, Loader2, Mail, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const VERIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Generate deterministic avatar SVGs
const AVATAR_COLORS = [
  ["#6366f1", "#818cf8"], // indigo
  ["#06b6d4", "#22d3ee"], // cyan
  ["#f43f5e", "#fb7185"], // rose
  ["#8b5cf6", "#a78bfa"], // violet
  ["#10b981", "#34d399"], // emerald
  ["#f59e0b", "#fbbf24"], // amber
  ["#ec4899", "#f472b6"], // pink
  ["#14b8a6", "#2dd4bf"], // teal
  ["#ef4444", "#f87171"], // red
  ["#3b82f6", "#60a5fa"], // blue
];

const AVATAR_SHAPES = ["circle", "hexagon", "diamond", "square"] as const;

function generateAvatarSvg(index: number): string {
  const [bg, accent] = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const shape = AVATAR_SHAPES[index % AVATAR_SHAPES.length];

  let shapeEl = "";
  if (shape === "circle") shapeEl = `<circle cx="32" cy="28" r="12" fill="${accent}" opacity="0.6"/><circle cx="32" cy="42" r="16" fill="${accent}" opacity="0.4"/>`;
  else if (shape === "hexagon") shapeEl = `<polygon points="32,12 48,24 48,40 32,52 16,40 16,24" fill="${accent}" opacity="0.5"/>`;
  else if (shape === "diamond") shapeEl = `<rect x="18" y="18" width="28" height="28" rx="4" transform="rotate(45 32 32)" fill="${accent}" opacity="0.5"/>`;
  else shapeEl = `<rect x="16" y="16" width="32" height="32" rx="8" fill="${accent}" opacity="0.5"/>`;

  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${bg}"/>${shapeEl}<circle cx="26" cy="28" r="2.5" fill="white"/><circle cx="38" cy="28" r="2.5" fill="white"/><path d="M25 38 Q32 44 39 38" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`)}`;
}

const AVATARS = Array.from({ length: 10 }, (_, i) => generateAvatarSvg(i));

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pendingAction, setPendingAction] = useState<"signup" | "signin" | null>(null);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  // Randomize default avatar on mount
  useEffect(() => {
    setSelectedAvatar(Math.floor(Math.random() * AVATARS.length));
  }, []);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  const sendVerification = async () => {
    try {
      const resp = await fetch(`${VERIFY_URL}/send-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email,
          username: username || displayName || email.split("@")[0],
        }),
      });
      if (!resp.ok) throw new Error("Failed to send code");
      return true;
    } catch {
      toast.error("Failed to send verification email");
      return false;
    }
  };

  const verifyCode = async (): Promise<boolean> => {
    try {
      const resp = await fetch(`${VERIFY_URL}/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await resp.json();
      return data.verified === true;
    } catch {
      return false;
    }
  };

  const saveProfileDetails = async (userId: string) => {
    await (supabase.from as any)("profiles").update({
      username: username.trim() || null,
      about: about.trim() || null,
      avatar_url: AVATARS[selectedAvatar],
    }).eq("id", userId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    if (isSignup) {
      const sent = await sendVerification();
      if (!sent) { setSubmitting(false); return; }
      setPendingAction("signup");
      setVerificationStep(true);
      setSubmitting(false);
      toast.success("Verification code sent to your email!");
    } else {
      try {
        await signIn(email, password);
        toast.success("Welcome back!");
        navigate("/dashboard");
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
          toast.error("Invalid email or password.");
        } else {
          toast.error(msg || "Sign-in failed");
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) return;
    setVerifying(true);

    const verified = await verifyCode();
    if (!verified) {
      toast.error("Invalid or expired code. Please try again.");
      setVerifying(false);
      return;
    }

    try {
      if (pendingAction === "signup") {
        await signUp(email, password, displayName);
        // Wait a moment for the profile trigger to create the row, then update
        setTimeout(async () => {
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) await saveProfileDetails(newUser.id);
        }, 1000);
        toast.success("Account created! Welcome to DevsFlow.");
      }
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Terminal className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-mono text-foreground">
              Devs<span className="text-primary">Flow</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {verificationStep ? "Enter verification code" : isSignup ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        {!verificationStep ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <>
                  {/* Avatar picker */}
                  <div className="animate-fade-up">
                    <Label className="text-muted-foreground mb-2 block">Choose your avatar</Label>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {AVATARS.map((avatar, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedAvatar(i)}
                          className={`rounded-xl overflow-hidden transition-all ${
                            selectedAvatar === i
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                              : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={avatar} alt={`Avatar ${i + 1}`} className="w-10 h-10" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="animate-fade-up">
                    <Label htmlFor="name" className="text-muted-foreground">Display Name</Label>
                    <Input
                      id="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1 bg-secondary border-border"
                    />
                  </div>

                  <div className="animate-fade-up">
                    <Label htmlFor="username" className="text-muted-foreground">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="cool_dev"
                      maxLength={30}
                      className="mt-1 bg-secondary border-border font-mono"
                    />
                  </div>

                  <div className="animate-fade-up">
                    <Label htmlFor="about" className="text-muted-foreground">About you <span className="text-xs opacity-60">(optional)</span></Label>
                    <Textarea
                      id="about"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="A short bio about yourself..."
                      maxLength={200}
                      rows={2}
                      className="mt-1 bg-secondary border-border resize-none"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-muted-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 bg-secondary border-border"
                />
              </div>
              <Button type="submit" className="w-full gap-2 bg-primary hover:bg-primary/80 text-primary-foreground" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isSignup ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground font-mono">or</span>
              <Separator className="flex-1" />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                try {
                  const isCustomDomain =
                    !window.location.hostname.includes("lovable.app") &&
                    !window.location.hostname.includes("lovableproject.com");

                  if (isCustomDomain) {
                    const { data, error } = await supabase.auth.signInWithOAuth({
                      provider: "google",
                      options: {
                        redirectTo: `${window.location.origin}/dashboard`,
                        skipBrowserRedirect: true,
                      },
                    });
                    if (error) throw error;
                    if (data?.url) {
                      window.location.href = data.url;
                    }
                  } else {
                    const result = await lovable.auth.signInWithOAuth("google", {
                      redirect_uri: window.location.origin,
                    });
                    if (result.error) {
                      toast.error(result.error.message || "Google sign-in failed");
                    }
                  }
                } catch (err: any) {
                  toast.error(err.message || "Google sign-in failed");
                }
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-6">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-primary hover:underline font-medium"
              >
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </p>
          </>
        ) : (
          <div className="space-y-4 animate-fade-up">
            <div className="text-center p-4 rounded-lg border border-primary/20 bg-primary/5">
              <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm text-foreground">We sent a 6-digit code to</p>
              <p className="text-sm font-mono text-primary">{email}</p>
            </div>
            <div>
              <Label htmlFor="code" className="text-muted-foreground">Verification Code</Label>
              <Input
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="mt-1 bg-secondary border-border text-center text-2xl font-mono tracking-[0.5em] h-14"
                autoFocus
                inputMode="numeric"
              />
            </div>
            <Button
              className="w-full gap-2 bg-primary hover:bg-primary/80 text-primary-foreground"
              onClick={handleVerify}
              disabled={verifying || verificationCode.length !== 6}
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify & Continue
            </Button>
            <button
              onClick={() => { setVerificationStep(false); setPendingAction(null); setVerificationCode(""); }}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
