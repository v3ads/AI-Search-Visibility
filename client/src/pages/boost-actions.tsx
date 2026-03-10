import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBoostActions } from "@/hooks/use-project-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_ID, PRIORITY_COLORS } from "@/lib/constants";
import { Rocket, ArrowRight, CheckCircle2, Clock, Circle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

const STATUS_CONFIG: Record<string, { icon: typeof Circle; label: string; color: string }> = {
  todo: { icon: Circle, label: "To Do", color: "text-muted-foreground" },
  in_progress: { icon: Clock, label: "In Progress", color: "text-amber-400" },
  done: { icon: CheckCircle2, label: "Done", color: "text-green-400" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Technical SEO for AI": "bg-blue-500/10 text-blue-400",
  "Owned-Domain Citations": "bg-green-500/10 text-green-400",
  "PR for Listicles": "bg-purple-500/10 text-purple-400",
  "Social & Forum": "bg-orange-500/10 text-orange-400",
  "Influencer Outreach": "bg-pink-500/10 text-pink-400",
};

export default function BoostActions() {
  const { data: actions, isLoading } = useBoostActions();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/boost-actions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", PROJECT_ID, "boost-actions"] });
      toast({ title: "Status updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }

  const actionList = actions || [];
  const todo = actionList.filter((a) => a.status === "todo");
  const inProgress = actionList.filter((a) => a.status === "in_progress");
  const done = actionList.filter((a) => a.status === "done");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Boost Actions</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated weekly action plans to improve your visibility</p>
        </div>
        <Badge variant="default" className="text-xs">
          <Rocket className="w-3 h-3 mr-1" /> {actionList.length} actions this week
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">To Do</p>
          <p className="text-2xl font-bold font-mono mt-1">{todo.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="text-2xl font-bold font-mono mt-1 text-amber-400">{inProgress.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold font-mono mt-1 text-green-400">{done.length}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {actionList.map((action) => {
          const statusConfig = STATUS_CONFIG[action.status || "todo"];
          const StatusIcon = statusConfig.icon;
          const categoryStyle = CATEGORY_ICONS[action.category] || "bg-muted text-muted-foreground";

          return (
            <Card key={action.id} className="p-5" data-testid={`card-action-${action.id}`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-md shrink-0 ${categoryStyle}`}>
                  <Rocket className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{action.title}</h3>
                    <Select
                      value={action.status || "todo"}
                      onValueChange={(status) => updateMutation.mutate({ id: action.id, status })}
                    >
                      <SelectTrigger className="w-32 h-8" data-testid={`select-status-${action.id}`}>
                        <div className={`flex items-center gap-1.5 ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="text-xs">{statusConfig.label}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{action.description}</p>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant="secondary" className={`text-[10px] ${categoryStyle}`}>{action.category}</Badge>
                    <Badge variant="secondary" className={`text-[10px] ${PRIORITY_COLORS[action.priority]}`}>
                      {action.priority} priority
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {action.effort} effort
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
