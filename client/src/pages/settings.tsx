import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useProject, useCompetitors, useTags } from "@/hooks/use-project-data";
import { Globe, Building2, Map, Languages, Users, Tag } from "lucide-react";

export default function SettingsPage() {
  const { data: project, isLoading: projectLoading } = useProject();
  const { data: competitors, isLoading: competitorsLoading } = useCompetitors();
  const { data: tags, isLoading: tagsLoading } = useTags();

  if (projectLoading || competitorsLoading || tagsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Project Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your monitoring project</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Project Details</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Domain</p>
                <p className="text-sm font-medium">{project.domain}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Brand Name</p>
                <p className="text-sm font-medium">{project.brandName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Map className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm font-medium">{project.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="text-sm font-medium">{project.language}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Plan & Billing</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <Badge variant="default" className="capitalize">{project.plan}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Industry</span>
              <span className="text-sm">{project.industry || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Project ID</span>
              <span className="text-xs font-mono text-muted-foreground">{project.id}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Tracked Competitors</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(competitors || []).map((c) => (
            <Badge key={c.id} variant="secondary" data-testid={`badge-competitor-${c.id}`}>{c.brandName}</Badge>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Tags</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(tags || []).map((t) => (
            <Badge key={t.id} variant="outline" data-testid={`badge-tag-${t.id}`}>
              <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: t.color || "#22c55e" }} />
              {t.name}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
