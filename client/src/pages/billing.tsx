import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Zap, Building2, Loader2, ExternalLink, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Get a taste of AI search visibility",
    features: ["1 project", "1 competitor", "3 prompts", "1 scan (lifetime)", "ChatGPT + Claude only"],
    cta: "Current plan",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 49,
    description: "For solo marketers & consultants",
    features: ["1 project", "5 competitors", "50 prompts", "4 scans/month", "All 4 AI models", "Email reports"],
    cta: "Upgrade to Starter",
    highlight: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    description: "For marketing teams",
    features: ["5 projects", "15 competitors", "200 prompts", "20 scans/month", "Scheduled scans", "API access", "Team members", "Priority support"],
    cta: "Upgrade to Growth",
    highlight: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: 399,
    description: "For agencies managing clients",
    features: ["25 projects", "Unlimited competitors", "Unlimited prompts", "Unlimited scans", "White-label reports", "API access", "Webhooks", "Dedicated support"],
    cta: "Upgrade to Agency",
    highlight: false,
  },
];

export default function BillingPage() {
  const { org, refreshAuth } = useAuth();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  const currentPlan = org?.plan || "free";
  const scansUsed = org?.scansThisMonth || 0;
  const scansMax = org?.maxScansPerMonth || 1;

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) return;
    setUpgrading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) throw new Error("Failed to open billing portal");
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOpeningPortal(false);
    }
  };

  const planIndex = (id: string) => ["free", "starter", "growth", "agency", "enterprise"].indexOf(id);
  const isUpgrade = (planId: string) => planIndex(planId) > planIndex(currentPlan);
  const isDowngrade = (planId: string) => planIndex(planId) < planIndex(currentPlan);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current plan summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                {PLANS.find((p) => p.id === currentPlan)?.name || "Free"} Plan
                <Badge variant={currentPlan === "free" ? "secondary" : "default"}>
                  {org?.subscriptionStatus === "active" ? "Active" : currentPlan === "free" ? "Free" : "Inactive"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {currentPlan === "free" ? "Upgrade to unlock more scans and features" : "Your subscription renews automatically"}
              </CardDescription>
            </div>
            {currentPlan !== "free" && (
              <Button variant="outline" onClick={handleManageBilling} disabled={openingPortal}>
                {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ExternalLink className="w-4 h-4 mr-2" />Manage billing</>}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Scans this month</span>
              <span className="font-medium">{scansUsed} / {scansMax === 999 ? "Unlimited" : scansMax}</span>
            </div>
            {scansMax !== 999 && (
              <Progress value={(scansUsed / scansMax) * 100} className="h-2" />
            )}
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold">{org?.maxProjects === 999 ? "∞" : org?.maxProjects}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{org?.maxCompetitors === 999 ? "∞" : org?.maxCompetitors}</p>
                <p className="text-xs text-muted-foreground">Competitors</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{org?.maxPrompts === 999 ? "∞" : org?.maxPrompts}</p>
                <p className="text-xs text-muted-foreground">Prompts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Choose a plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <Card key={plan.id} className={`relative flex flex-col ${plan.highlight ? "border-primary shadow-md" : ""}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    {plan.price > 0 && <span className="text-muted-foreground text-sm">/mo</span>}
                  </div>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1 mb-4">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "secondary" : plan.highlight ? "default" : "outline"}
                    disabled={isCurrent || !!upgrading}
                    onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  >
                    {upgrading === plan.id ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting...</>
                    ) : isCurrent ? (
                      "Current plan"
                    ) : isDowngrade(plan.id) ? (
                      "Downgrade"
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Enterprise CTA */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold">Need Enterprise?</p>
              <p className="text-sm text-muted-foreground">Custom pricing, SSO, white-label, dedicated support, and SLA.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.open("mailto:hello@plumboost.com?subject=Enterprise inquiry", "_blank")}>
            Contact sales
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
