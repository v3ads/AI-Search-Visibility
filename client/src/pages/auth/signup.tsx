import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check } from "lucide-react";
import { LogoMark } from "@/components/logo";

const FEATURES = [
  "Monitor your brand in ChatGPT, Claude, Gemini & Grok",
  "Track competitors' AI search visibility",
  "Get AI-powered recommendations to improve your ranking",
  "Free scan — no credit card required",
];

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", orgName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(form.email, form.password, form.name, form.orgName);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — features */}
      <div className="hidden lg:flex flex-col justify-center p-12 w-1/2 text-white" style={{ background: "linear-gradient(135deg, #4C1D95, #0E7490)" }}>
        <div className="flex items-center gap-3 mb-8">
          <LogoMark size={36} />
          <span className="text-2xl font-bold tracking-tight">PlumBoost</span>
        </div>
        <h2 className="text-3xl font-bold mb-4">Know exactly how AI talks about your brand</h2>
        <p className="text-white/75 mb-8 text-lg">
          The only platform that tracks your brand's visibility across every major AI search engine in real time.
        </p>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3" />
              </div>
              <span className="text-white/90">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <LogoMark size={32} />
              <span className="text-2xl font-bold" style={{
                background: "linear-gradient(135deg, #A855F7, #06B6D4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.02em",
              }}>PlumBoost</span>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>Start with a free scan — no credit card required</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" placeholder="Jane Smith" value={form.name} onChange={update("name")} required autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Company name</Label>
                    <Input id="orgName" placeholder="Acme Inc." value={form.orgName} onChange={update("orgName")} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" placeholder="jane@acme.com" value={form.email} onChange={update("email")} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Min. 8 characters" value={form.password} onChange={update("password")} required minLength={8} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : "Create free account"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By signing up you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link> and{" "}
                  <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                </p>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
