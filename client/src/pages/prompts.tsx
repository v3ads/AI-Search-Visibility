import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePrompts, useTags } from "@/hooks/use-project-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_ID, INTENTS, INTENT_COLORS } from "@/lib/constants";
import { Plus, Trash2, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export default function Prompts() {
  const { data: promptList, isLoading: promptsLoading } = usePrompts();
  const { data: tagList, isLoading: tagsLoading } = useTags();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterIntent, setFilterIntent] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [newIntent, setNewIntent] = useState("informational");
  const [newTagId, setNewTagId] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/projects/${PROJECT_ID}/prompts`, {
        text: newText,
        intent: newIntent,
        tagId: newTagId ? parseInt(newTagId) : null,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", PROJECT_ID, "prompts"] });
      setDialogOpen(false);
      setNewText("");
      toast({ title: "Prompt created" });
    },
    onError: () => {
      toast({ title: "Failed to create prompt", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", PROJECT_ID, "prompts"] });
      toast({ title: "Prompt deleted" });
    },
  });

  if (promptsLoading || tagsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  const prompts = promptList || [];
  const tagMap = new Map((tagList || []).map((t) => [t.id, t]));

  const filtered = prompts.filter((p) => {
    if (search && !p.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterIntent !== "all" && p.intent !== filterIntent) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">{prompts.length} of 500 prompts used</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-prompt"><Plus className="w-4 h-4 mr-1" />Add Prompt</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Enter the question AI models should answer..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                data-testid="input-prompt-text"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select value={newIntent} onValueChange={setNewIntent}>
                  <SelectTrigger data-testid="select-intent">
                    <SelectValue placeholder="Intent" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTENTS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newTagId} onValueChange={setNewTagId}>
                  <SelectTrigger data-testid="select-tag">
                    <SelectValue placeholder="Tag (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tagList || []).map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!newText.trim() || createMutation.isPending}
                data-testid="button-submit-prompt"
              >
                {createMutation.isPending ? "Creating..." : "Create Prompt"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-prompts"
          />
        </div>
        <Select value={filterIntent} onValueChange={setFilterIntent}>
          <SelectTrigger className="w-40" data-testid="select-filter-intent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intents</SelectItem>
            {INTENTS.map((i) => (
              <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((prompt) => {
          const tag = prompt.tagId ? tagMap.get(prompt.tagId) : null;
          return (
            <Card key={prompt.id} className="p-4" data-testid={`card-prompt-${prompt.id}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{prompt.text}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="secondary" className={`text-[10px] ${INTENT_COLORS[prompt.intent] || ""}`}>
                      {prompt.intent}
                    </Badge>
                    {tag && (
                      <Badge variant="outline" className="text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: tag.color || "#22c55e" }} />
                        {tag.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(prompt.id)}
                  data-testid={`button-delete-prompt-${prompt.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No prompts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
