import { useState, useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProjectProvider, useProjectContext } from "@/lib/project-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, CreditCard, Users, ShieldAlert, Zap } from "lucide-react";
import { CreateProjectWizard } from "@/components/create-project-wizard";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import PrivacyPolicy from "@/pages/legal/privacy";
import TermsOfService from "@/pages/legal/terms";
import CookiePolicy from "@/pages/legal/cookies";
import PendingVerificationPage from "@/pages/auth/pending-verification";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import AcceptInvitePage from "@/pages/auth/accept-invite";
import Dashboard from "@/pages/dashboard";
import Visibility from "@/pages/visibility";
import ShareOfVoice from "@/pages/share-of-voice";
import Ranking from "@/pages/ranking";
import BrandStrength from "@/pages/brand-strength";
import Sentiment from "@/pages/sentiment";
import Citations from "@/pages/citations";
import Prompts from "@/pages/prompts";
import BoostActions from "@/pages/boost-actions";
import SettingsPage from "@/pages/settings";
import ScanPage from "@/pages/scan";
import BillingPage from "@/pages/billing";
import TeamPage from "@/pages/team";
import AccountPage from "@/pages/account";
import AdminPage from "@/pages/admin";

const PLAN_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  free: { label: "Free", variant: "secondary" },
  starter: { label: "Starter", variant: "outline" },
  growth: { label: "Growth", variant: "default" },
  agency: { label: "Agency", variant: "default" },
  enterprise: { label: "Enterprise", variant: "default" },
};

function AppHeader() {
  const { user, org, logout } = useAuth();
  const [, navigate] = useLocation();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  const planBadge = PLAN_BADGE[org?.plan || "free"];

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between gap-1 p-2 border-b h-12 shrink-0">
      <SidebarTrigger />
      <div className="flex items-center gap-2">
        {planBadge && (
          <Badge variant={planBadge.variant} className="text-xs hidden sm:flex">
            {planBadge.label}
          </Badge>
        )}
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/account")}>
              <User className="w-4 h-4 mr-2" />Account settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/team")}>
              <Users className="w-4 h-4 mr-2" />Team
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/billing")}>
              <CreditCard className="w-4 h-4 mr-2" />Billing
              {org?.plan === "free" && <Badge variant="secondary" className="ml-auto text-xs">Upgrade</Badge>}
            </DropdownMenuItem>
            {user?.email === "vipaymanshalaby@gmail.com" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin")} className="text-red-600">
                  <ShieldAlert className="w-4 h-4 mr-2" />Admin panel
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function ProjectRouter() {
  const { activeProjectId, projects, isLoading } = useProjectContext();
  const { org } = useAuth();
  const [location, navigate] = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState<{ brand: string; domain: string; industry: string } | undefined>();

  // Detect post-demo signup redirect and restore context
  useEffect(() => {
    if (location.includes("demo=restore") && !isLoading && projects.length === 0) {
      try {
        const raw = sessionStorage.getItem("plumboost_demo");
        if (raw) {
          const data = JSON.parse(raw);
          setWizardPrefill({ brand: data.brand || "", domain: data.domain || "", industry: data.industry || "" });
          sessionStorage.removeItem("plumboost_demo");
        }
      } catch { /* malformed data — ignore */ }
      setWizardOpen(true);
      // Clean the URL without a full reload
      navigate("/", { replace: true });
    }
  }, [location, isLoading, projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">
            {wizardPrefill ? `Welcome! Let's set up ${wizardPrefill.brand}` : "Welcome to PlumBoost"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            {wizardPrefill
              ? `We've pulled your details from the demo scan. Add competitors and we'll generate your first full scan.`
              : "Create your first project to start monitoring your brand's AI search visibility across ChatGPT, Claude, Gemini, and Grok."}
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Zap className="w-4 h-4 mr-2" />
          {wizardPrefill ? `Continue Setting Up ${wizardPrefill.brand}` : "Create Your First Project"}
        </Button>
        <CreateProjectWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setWizardPrefill(undefined); }}
          prefill={wizardPrefill}
        />
      </div>
    );
  }

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const base = `/projects/${activeProjectId}`;

  return (
    <Switch>
      <Route path="/">
        <Redirect to={base} />
      </Route>
      <Route path="/projects/:id" component={Dashboard} />
      <Route path="/projects/:id/visibility" component={Visibility} />
      <Route path="/projects/:id/share-of-voice" component={ShareOfVoice} />
      <Route path="/projects/:id/ranking" component={Ranking} />
      <Route path="/projects/:id/brand-strength" component={BrandStrength} />
      <Route path="/projects/:id/sentiment" component={Sentiment} />
      <Route path="/projects/:id/citations" component={Citations} />
      <Route path="/projects/:id/scan" component={ScanPage} />
      <Route path="/projects/:id/prompts" component={Prompts} />
      <Route path="/projects/:id/boost-actions" component={BoostActions} />
      <Route path="/projects/:id/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ProjectProvider>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <AppHeader />
              <main className="flex-1 overflow-auto">
                <Switch>
                  {/* Global pages */}
                  <Route path="/billing" component={BillingPage} />
                  <Route path="/team" component={TeamPage} />
                  <Route path="/account" component={AccountPage} />
                  <Route path="/admin" component={AdminPage} />
                  {/* Project pages */}
                  <Route component={ProjectRouter} />
                </Switch>
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </ProjectProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, pendingVerification, refreshAuth } = useAuth();
  const [location] = useLocation();

  // Handle post-verification redirect — refresh auth to clear pendingVerification
  useEffect(() => {
    if (location.includes("verified=true")) {
      refreshAuth();
    }
  }, [location, refreshAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Public routes — always accessible
  if (location === "/login" || location.startsWith("/login")) return <LoginPage />;
  if (location === "/signup" || location.startsWith("/signup")) return <SignupPage />;
  if (location === "/forgot-password") return <ForgotPasswordPage />;
  if (location === "/reset-password") return <ResetPasswordPage />;
  if (location === "/accept-invite") return <AcceptInvitePage />;
  if (location === "/privacy") return <PrivacyPolicy />;
  if (location === "/terms") return <TermsOfService />;
  if (location === "/cookies") return <CookiePolicy />;

  // Landing page — show to unauthenticated users at root
  if (!isAuthenticated && location === "/") return <LandingPage />;

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Authenticated but email not yet verified
  if (pendingVerification) return <PendingVerificationPage />;

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
