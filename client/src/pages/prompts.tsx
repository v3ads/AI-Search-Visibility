import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrompts, useTags } from "@/hooks/use-project-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { INTENTS, INTENT_COLORS } from "@/lib/constants";
import { useProjectContext } from "@/lib/project-context";
import { useParams } from "wouter";
import {
  Plus, Trash2, Search, Pencil, Check, X, Upload,
  MoreVertical, Tag, ChevronDown,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import type { Prompt, Tag as TagType } from "@shared/schema";

// ── Inline edit row ──────────────────────────────────────────────────────────
function PromptRow({
  prompt, tags, projectId,
}: { prompt: Prompt; tags: TagType[]; projectId: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(prompt.text);
  const [editIntent, setEditIntent] = useState(prompt.intent);
  const [editTagId, setEditTagId] = useState<string>(prompt.tagId?.toString() ?? "none");
  const [saving, setSaving] = useState(false);

  const tag = prompt.tagId ? tags.find((t) => t.id === prompt.tagId) : null;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });

  const toggleActive = async () => {
    try {
      await apiRequest("PATCH", `/api/prompts/${prompt.id}`, { isActive: !prompt.isActive });
      invalidate();
    } catch {
      toast({ title: "Failed to update prompt", variant: "destructive" });
    }
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/prompts/${prompt.id}`, {
        text: editText.trim(),
        intent: editIntent,
        tagId: editTagId && editTagId !== "none" ? parseInt(editTagId) : null,
      });
      invalidate();
      setEditing(false);
      toast({ title: "Prompt updated" });
    } catch {
      toast({ title: "Failed to update prompt", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deletePrompt = async () => {
    try {
      await apiRequest("DELETE", `/api/prompts/${prompt.id}`);
      invalidate();
      toast({ title: "Prompt deleted" });
    } catch {
      toast({ title: "Failed to delete prompt", variant: "destructive" });
    }
  };

  const cancelEdit = () => {
    setEditText(prompt.text);
    setEditIntent(prompt.intent);
    setEditTagId(prompt.tagId?.toString() ?? "none");
    setEditing(false);
  };

  return (
    <Card
      className={`p-4 transition-opacity ${!prompt.isActive ? "opacity-50" : ""}`}
      data-testid={`card-prompt-${prompt.id}`}
    >
      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="text-sm resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 flex-wrap">
            <Select value={editIntent} onValueChange={setEditIntent}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTENTS.map((i) => (
                  <SelectItem key={i.value} value={i.value} className="text-xs">{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={editTagId} onValueChange={setEditTagId}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="No tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">No tag</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || "#22c55e" }} />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5 ml-auto">
              <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-8 px-2">
                <X className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving || !editText.trim()} className="h-8 px-3 gap-1">
                <Check className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          {/* Active toggle */}
          <Switch
            checked={!!prompt.isActive}
            onCheckedChange={toggleActive}
            className="mt-0.5 shrink-0"
            data-testid={`switch-active-${prompt.id}`}
          />
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed">{prompt.text}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="secondary"
                className={`text-[10px] ${INTENT_COLORS[prompt.intent] || ""}`}
              >
                {INTENTS.find((i) => i.value === prompt.intent)?.label ?? prompt.intent}
              </Badge>
              {tag && (
                <Badge variant="outline" className="text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: tag.color || "#22c55e" }} />
                  {tag.name}
                </Badge>
              )}
              {!prompt.isActive && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">inactive</Badge>
              )}
            </div>
          </div>
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)} className="gap-2 text-xs">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={deletePrompt} className="gap-2 text-xs text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  );
}

// ── Bulk Import Dialog ───────────────────────────────────────────────────────
function BulkImportDialog({
  open, onClose, projectId, tags,
}: { open: boolean; onClose: () => void; projectId: string; tags: TagType[] }) {
  const { toast } = useToast();
  const [rawText, setRawText] = useState("");
  const [intent, setIntent] = useState("informational");
  const [tagId, setTagId] = useState("none");
  const [importing, setImporting] = useState(false);

  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const handleImport = async () => {
    if (lines.length === 0) return;
    setImporting(true);
    try {
      const res = await apiRequest("POST", `/api/projects/${projectId}/prompts/bulk`, {
        lines,
        intent,
        tagId: tagId && tagId !== "none" ? parseInt(tagId) : null,
      });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      toast({ title: `Imported ${data.created} prompts successfully` });
      setRawText("");
      onClose();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Prompts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Prompts (one per line)</Label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"What is the best CRM for small businesses?\nHow does Salesforce compare to HubSpot?\nBest project management tools for remote teams"}
              className="text-sm h-40 resize-none font-mono"
              autoFocus
            />
            {lines.length > 0 && (
              <p className="text-xs text-muted-foreground">{lines.length} prompt{lines.length !== 1 ? "s" : ""} detected</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Intent (applied to all)</Label>
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENTS.map((i) => (
                    <SelectItem key={i.value} value={i.value} className="text-xs">{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tag (optional)</Label>
              <Select value={tagId} onValueChange={setTagId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">No tag</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || "#22c55e" }} />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={lines.length === 0 || importing} className="gap-2">
            <Upload className="w-4 h-4" />
            {importing ? "Importing..." : `Import ${lines.length > 0 ? lines.length : ""} Prompts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Single Prompt Dialog ─────────────────────────────────────────────────
function AddPromptDialog({
  open, onClose, projectId, tags,
}: { open: boolean; onClose: () => void; projectId: string; tags: TagType[] }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [intent, setIntent] = useState("informational");
  const [tagId, setTagId] = useState("none");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await apiRequest("POST", `/api/projects/${projectId}/prompts`, {
        text: text.trim(),
        intent,
        tagId: tagId && tagId !== "none" ? parseInt(tagId) : null,
        isActive: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "prompts"] });
      toast({ title: "Prompt created" });
      setText("");
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to create prompt", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Prompt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Prompt text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. What is the best CRM for small businesses?"
              className="text-sm resize-none"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate();
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Intent</Label>
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENTS.map((i) => (
                    <SelectItem key={i.value} value={i.value} className="text-xs">{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tag</Label>
              <Select value={tagId} onValueChange={setTagId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">No tag</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || "#22c55e" }} />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!text.trim() || saving} className="gap-2">
            <Plus className="w-4 h-4" />
            {saving ? "Creating..." : "Add Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Prompts() {
  const params = useParams<{ id: string }>();
  const { activeProjectId } = useProjectContext();
  const projectId = params?.id ?? activeProjectId ?? "";

  const { data: promptList, isLoading: promptsLoading } = usePrompts();
  const { data: tagList, isLoading: tagsLoading } = useTags();

  const [search, setSearch] = useState("");
  const [filterIntent, setFilterIntent] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const tags = tagList ?? [];
  const prompts = promptList ?? [];

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      if (search && !p.text.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterIntent !== "all" && p.intent !== filterIntent) return false;
      if (filterTag !== "all") { if (filterTag === "none" && p.tagId != null) return false; if (filterTag !== "none" && String(p.tagId ?? "") !== filterTag) return false; }
      if (filterActive === "active" && !p.isActive) return false;
      if (filterActive === "inactive" && p.isActive) return false;
      return true;
    });
  }, [prompts, search, filterIntent, filterTag, filterActive]);

  const activeCount = prompts.filter((p) => p.isActive).length;

  if (promptsLoading || tagsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Prompts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {prompts.length} total &middot; {activeCount} active &middot; {prompts.length - activeCount} inactive
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Bulk Import
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Prompt
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="input-search-prompts"
          />
        </div>
        <Select value={filterIntent} onValueChange={setFilterIntent}>
          <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-filter-intent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Intents</SelectItem>
            {INTENTS.map((i) => (
              <SelectItem key={i.value} value={i.value} className="text-xs">{i.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <Tag className="w-3 h-3 mr-1" />
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Tags</SelectItem>
            <SelectItem value="none" className="text-xs">No tag</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || "#22c55e" }} />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={(v) => setFilterActive(v as any)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="active" className="text-xs">Active only</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompt list */}
      <div className="space-y-2">
        {filtered.map((prompt) => (
          <PromptRow
            key={prompt.id}
            prompt={prompt}
            tags={tags}
            projectId={projectId}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            {prompts.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">No prompts yet</p>
                <p className="text-xs">Add individual prompts or bulk import a list to get started.</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)} className="gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Bulk Import
                  </Button>
                  <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Prompt
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">No prompts match your filters.</p>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddPromptDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        projectId={projectId}
        tags={tags}
      />
      <BulkImportDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        projectId={projectId}
        tags={tags}
      />
    </div>
  );
}
