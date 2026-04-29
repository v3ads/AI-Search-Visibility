import { LogoMark } from '@/components/logo';
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Eye, PieChart, Trophy, Shield, SmilePlus,
  Link2, FileText, Rocket, Settings, ChevronsUpDown, Plus, Check, Radar, History,
  CreditCard, Users, Crown,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectContext } from "@/lib/project-context";
import { useAuth } from "@/lib/auth-context";
import { CreateProjectWizard } from "./create-project-wizard";

const PLAN_COLORS: Record<string, string> = {
  free: "text-muted-foreground",
  starter: "text-blue-500",
  growth: "text-green-500",
  agency: "text-purple-500",
  enterprise: "text-yellow-500",
};

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };
  const { projects, activeProject, activeProjectId, setActiveProjectId, isLoading } = useProjectContext();
  const { org } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);

  const base = activeProjectId ? `/projects/${activeProjectId}` : "/projects/loading";

  const analyticsItems = [
    { title: "Overview", url: `${base}`, icon: LayoutDashboard },
    { title: "AI Visibility", url: `${base}/visibility`, icon: Eye },
    { title: "Share of Voice", url: `${base}/share-of-voice`, icon: PieChart },
    { title: "Ranking", url: `${base}/ranking`, icon: Trophy },
    { title: "Brand Strength", url: `${base}/brand-strength`, icon: Shield },
    { title: "Sentiment", url: `${base}/sentiment`, icon: SmilePlus },
    { title: "Citations", url: `${base}/citations`, icon: Link2 },
  ];

  const configItems = [
    { title: "Scan", url: `${base}/scan`, icon: Radar },
    { title: "History", url: `${base}/history`, icon: History },
    { title: "Prompts", url: `${base}/prompts`, icon: FileText },
    { title: "Boost Actions", url: `${base}/boost-actions`, icon: Rocket },
    { title: "Settings", url: `${base}/settings`, icon: Settings },
  ];

  const isActive = (url: string) => {
    if (url === base) return location === base || location === base + "/";
    return location.startsWith(url);
  };

  const handleSwitchProject = (id: string) => {
    setActiveProjectId(id);
    navigate(`/projects/${id}`);
    closeOnMobile();
  };

  const plan = org?.plan || "free";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const scansLeft = (org?.maxScansPerMonth || 1) - (org?.scansThisMonth || 0);
  const scansMax = org?.maxScansPerMonth || 1;

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-3">
          {/* Brand logo */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <LogoMark size={28} />
            <div>
              <span className="font-bold text-sm tracking-tight" style={{ background: "linear-gradient(135deg, #A855F7, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>PlumBoost</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">AI Search Visibility</span>
            </div>
          </div>

          {/* Project switcher */}
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">
                        {activeProject?.brandName?.[0] ?? "?"}
                      </span>
                    </div>
                    <span className="truncate font-medium text-xs">
                      {activeProject?.brandName ?? "Select project"}
                    </span>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handleSwitchProject(p.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{p.brandName[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.brandName}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.domain}</p>
                      </div>
                    </div>
                    {p.id === activeProjectId && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setWizardOpen(true)} className="text-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Analytics</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {analyticsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link href={item.url} onClick={closeOnMobile}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link href={item.url} onClick={closeOnMobile}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/team"}>
                    <Link href="/team" onClick={closeOnMobile}>
                      <Users className="w-4 h-4" />
                      <span>Team</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild data-active={location === "/billing"}>
                    <Link href="/billing" onClick={closeOnMobile}>
                      <CreditCard className="w-4 h-4" />
                      <span>Billing</span>
                      {plan === "free" && (
                        <Badge variant="secondary" className="ml-auto text-[10px] py-0">Upgrade</Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="rounded-md bg-muted/60 border p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className={`w-3.5 h-3.5 ${PLAN_COLORS[plan]}`} />
                <span className={`text-xs font-semibold ${PLAN_COLORS[plan]}`}>{planLabel} Plan</span>
              </div>
              {plan === "free" && (
                <Link href="/billing">
                  <span className="text-[10px] text-primary hover:underline cursor-pointer">Upgrade</span>
                </Link>
              )}
            </div>
            {scansMax !== 999 && (
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{plan === "free" ? "Free scan" : "Scans this month"}</span>
                  <span>{org?.scansThisMonth || 0}/{scansMax}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((org?.scansThisMonth || 0) / scansMax) * 100)}%` }}
                  />
                </div>
                {plan === "free" && (org?.scansThisMonth || 0) >= scansMax && (
                  <p className="text-[10px] text-destructive mt-1">Scan used — <Link href="/billing"><span className="underline cursor-pointer">upgrade</span></Link> for more</p>
                )}
              </div>
            )}
            {org?.name && (
              <p className="text-[10px] text-muted-foreground truncate">{org.name}</p>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <CreateProjectWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
