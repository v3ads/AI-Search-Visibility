import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Eye, PieChart, Trophy, Shield, SmilePlus,
  Link2, FileText, Rocket, Settings, Zap, ChevronsUpDown, Plus, Check,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectContext } from "@/lib/project-context";
import { CreateProjectWizard } from "./create-project-wizard";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { projects, activeProject, activeProjectId, setActiveProjectId, isLoading } = useProjectContext();
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
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="p-3">
          {/* Brand logo */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">AI Visibility</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">Search Intelligence</span>
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
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
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
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3">
          {activeProject && (
            <div className="rounded-md bg-primary/10 border border-primary/20 p-3">
              <p className="text-xs font-medium text-primary capitalize">{activeProject.plan ?? "Starter"} Plan</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{activeProject.domain}</p>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <CreateProjectWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
