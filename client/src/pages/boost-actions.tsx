import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { useBoostActions } from "@/hooks/use-project-data";
import { useProjectContext } from "@/lib/project-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Rocket, Loader2, CheckCircle2, Clock, Play,
  FileText, Settings, Megaphone, TrendingUp, Link, Smile,
  ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import type { BoostAction } from "@shared/schema";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400 bg-red-400/10 border-red-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const EFFORT_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  content: { label: "Content", icon: FileText, color: "text-blue-400 bg-blue-400/10" },
  technical: { label: "Technical", icon: Settings, color: "text-purple-400 bg-purple-400/10" },
  pr_outreach: { label: "PR & Outreach", icon: Megaphone, color: "text-pink-400 bg-pink-400/10" },
  competitor_gap: { label: "Competitor Gap", icon: TrendingUp, color: "text-orange-400 bg-orange-400/10" },
  citations: { label: "Citations", icon: Link, color: "text-cyan-400 bg-cyan-400/10" },
  sentiment: { label: "Sentiment", icon: Smile, color: "text-green-400 bg-green-400/10" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  todo: { label: "To Do", icon: Clock, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Play, color: "text-amber-400" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-400" },
};

function ActionCard({
  action,
  onStatusChange,
}: {
  action: BoostAction;
  onStatusChange: (id: number, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const category = CATEGORY_CONFIG[action.category] || CATEGORY_CONFIG.content;
  const CategoryIcon = category.icon;
  const statusKey = action.status || "todo";
  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;
  const StatusIcon = status.icon;
  const longDesc = (action.description || "").length > 140;

  return (
    <Card className={`p-4 transition-all border ${statusKey === "done" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md shrink-0 ${category.color}`}>
          <CategoryIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3
              className={`text-sm font-semibold leading-snug ${
                statusKey === "done" ? "line-through text-muted-foreground" : ""
              }`}
            >
              {action.title}
            </h3>
            <Select
              value={statusKey}
              onValueChange={(val) => onStatusChange(action.id, val)}
            >
              <SelectTrigger className="w-36 h-7 text-xs" data-testid={`select-status-${action.id}`}>
                <div className={`flex items-center gap-1.5 ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{status.label}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" /> To Do
                  </div>
                </SelectItem>
                <SelectItem value="in_progress">
                  <div className="flex items-center gap-2">
                    <Play className="w-3 h-3" /> In Progress
                  </div>
                </SelectItem>
                <SelectItem value="done">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className={`text-xs text-muted-foreground mt-1.5 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            {action.description}
          </p>
          {longDesc && (
            <button
              className="text-xs text-primary mt-1 flex items-center gap-0.5 hover:underline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> Read more
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <Badge
              variant="outline"
              className={`text-[10px] border ${PRIORITY_COLORS[action.priority] || ""}`}
            >
              {action.priority} priority
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              <span className={`mr-1 ${EFFORT_COLORS[action.effort] || ""}`}>●</span>
              {action.effort} effort
            </Badge>
            <Badge variant="secondary" className={`text-[10px] ${category.color}`}>
              {category.label}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function BoostActions() {
  const { activeProjectId } = useProjectContext();
  const { data: actions, isLoading } = useBoostActions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const generateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/projects/${activeProjectId}/boost-actions/generate`).then((r) =>
        r.json()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", activeProjectId, "boost-actions"],
      });
      toast({
        title: "Boost Actions Generated",
        description:
          "Claude has analyzed your scan data and generated 7 new recommendations.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Generation Failed",
        description: err.message || "Could not generate boost actions",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/boost-actions/${id}`, { status }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", activeProjectId, "boost-actions"],
      });
    },
  });

  const allActions = actions || [];
  const filtered = allActions.filter((a) => {
    const statusMatch = statusFilter === "all" || (a.status || "todo") === statusFilter;
    const catMatch = categoryFilter === "all" || a.category === categoryFilter;
    return statusMatch && catMatch;
  });

  const todoCount = allActions.filter((a) => !a.status || a.status === "todo").length;
  const inProgressCount = allActions.filter((a) => a.status === "in_progress").length;
  const doneCount = allActions.filter((a) => a.status === "done").length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Boost Actions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated recommendations to improve your brand's visibility in AI search results
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="gap-2 shrink-0"
          data-testid="button-generate-actions"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating with Claude...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate with AI
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      {allActions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold font-mono">{todoCount}</p>
            <p className="text-xs text-muted-foreground mt-1">To Do</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-amber-400">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground mt-1">In Progress</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold font-mono text-green-400">{doneCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Done</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      {allActions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {(["all", "todo", "in_progress", "done"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all"
                  ? "All"
                  : s === "in_progress"
                  ? "In Progress"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            variant={categoryFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setCategoryFilter("all")}
          >
            All
          </Button>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <Button
              key={key}
              variant={categoryFilter === key ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setCategoryFilter(key)}
            >
              {cfg.label}
            </Button>
          ))}
        </div>
      )}

      {/* Action cards */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
            />
          ))}
        </div>
      ) : allActions.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">No boost actions yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-3">
                Click <strong>"Generate with AI"</strong> and Claude will analyze your scan data to
                produce specific, tactical recommendations for improving your AI search visibility.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Works best after running at least one scan — but can also generate general best
                practices for new projects.
              </p>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              size="lg"
              className="gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Boost Actions
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Rocket className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No actions match the current filters.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              setStatusFilter("all");
              setCategoryFilter("all");
            }}
          >
            Clear filters
          </Button>
        </Card>
      )}

      {allActions.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Generated by Claude Sonnet · Click "Generate with AI" anytime to refresh recommendations
          based on your latest scan data
        </p>
      )}
    </div>
  );
}
