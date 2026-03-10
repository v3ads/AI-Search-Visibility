import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Eye, PieChart, Trophy, Shield, SmilePlus,
  Link2, FileText, Rocket, Settings, Zap,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { PROJECT_ID } from "@/lib/constants";

const base = `/projects/${PROJECT_ID}`;

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

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === base) return location === base || location === base + "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href={base}>
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-brand-home">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight">AI Visibility</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">Search Intelligence</span>
            </div>
          </div>
        </Link>
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

      <SidebarFooter className="p-4">
        <div className="rounded-md bg-primary/10 border border-primary/20 p-3">
          <p className="text-xs font-medium text-primary">Pro Plan</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">18 of 500 prompts used</p>
          <div className="w-full h-1 bg-muted rounded-full mt-2">
            <div className="h-1 bg-primary rounded-full" style={{ width: "3.6%" }} />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
