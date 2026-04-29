import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";

export default function PendingVerificationPage() {
  const { user, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: user?.email }),
      });
      if (res.ok) {
        setResent(true);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to resend. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <LogoMark size={36} />
            <span className="text-2xl font-bold" style={{ background: "linear-gradient(135deg,#A855F7,#06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.02em" }}>PlumBoost</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground text-sm">
              We sent a verification link to{" "}
              <strong className="text-foreground">{user?.email}</strong>.
              Click the link in the email to access your dashboard.
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 border p-4 text-sm text-muted-foreground text-left space-y-1">
            <p>✓ Check your spam/junk folder if you don't see it</p>
            <p>✓ The link expires in 24 hours</p>
            <p>✓ Make sure you used the right email address</p>
          </div>

          {resent ? (
            <div className="flex items-center justify-center gap-2 text-sm text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              Verification email resent!
            </div>
          ) : (
            <div className="space-y-3">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</>
                ) : (
                  "Resend verification email"
                )}
              </Button>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
