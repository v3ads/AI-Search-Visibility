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
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
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
import { CreateProjectWizard } from "@/components/create-project-wizard";

function Router() {
  const { activeProjectId, projects, isLoading } = useProjectContext();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Show wizard if no projects exist after loading
  if (!isLoading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-3xl">🚀</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold">No projects yet</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create your first project to start monitoring your brand's AI search visibility.
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>Create Your First Project</Button>
        <CreateProjectWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
      </div>
    );
  }

  if (isLoading || !activeProjectId) {
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
      {/* Dynamic project routes — match any project ID */}
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

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => setUser(data.username))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    queryClient.clear();
  };

  if (checking) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <Login onLogin={(username) => setUser(username)} />
        <Toaster />
      </ThemeProvider>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ProjectProvider>
          <TooltipProvider>
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                  <header className="flex items-center justify-between gap-1 p-2 border-b h-12 shrink-0">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground" data-testid="text-username">{user}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="h-8 w-8"
                        data-testid="button-logout"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="flex-1 overflow-auto">
                    <Router />
                  </main>
                </div>
              </div>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </ProjectProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
