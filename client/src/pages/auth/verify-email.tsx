import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { LogoMark } from "@/components/logo";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link — no token provided.");
      return;
    }
    // The server handles the redirect on GET /api/auth/verify-email
    // This page is shown if JS intercepts it. Just let the redirect happen.
    window.location.href = `/api/auth/verify-email?token=${token}`;
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <LogoMark size={36} />
          <span className="text-2xl font-bold" style={{ background: "linear-gradient(135deg,#A855F7,#06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.02em" }}>PlumBoost</span>
        </div>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying your email…</p>
        </div>
      </div>
    </div>
  );
}
