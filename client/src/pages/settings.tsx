import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProject, useCompetitors, useTags } from "@/hooks/use-project-data";
import { useProjectContext } from "@/lib/project-context";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import {
  Globe, Building2, Map, Languages, Users, Tag,
  Pencil, Check, X, Plus, Trash2, AlertTriangle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const INDUSTRIES = [
  "SaaS / Software", "E-commerce / Retail", "Finance / Fintech",
  "Healthcare / MedTech", "Marketing / Agencies", "Education / EdTech",
  "Real Estate", "Travel / Hospitality", "Legal / Professional Services",
  "Media / Publishing", "Cloud Infrastructure", "Other",
];

const COUNTRIES = [
  { value: "US", label: "United States" }, { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" }, { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" }, { value: "FR", label: "France" },
  { value: "IN", label: "India" }, { value: "SG", label: "Singapore" },
  { value: "AE", label: "UAE" }, { value: "OTHER", label: "Other" },
];

const TAG_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#64748b", "#a855f7",
];

export default function SettingsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;
  const { data: project, isLoading: projectLoading } = useProject();
  const { data: competitors, isLoading: competitorsLoading } = useCompetitors();
  const { data: tags, isLoading: tagsLoading } = useTags();
  const { updateProject, deleteProject } = useProjectContext();
  const { org } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Project details editing
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({ domain: "", brandName: "", industry: "", country: "" });
  const [savingDetails, setSavingDetails] = useState(false);

  // Competitors
  const [newCompetitor, setNewCompetitor] = useState("");
  const [addingCompetitor, setAddingCompetitor] = useState(false);

  // Tags
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [addingTag, setAddingTag] = useState(false);

  // Delete project
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const startEditDetails = () => {
    if (!project) return;
    setDetailsForm({
      domain: project.domain,
      brandName: project.brandName,
      industry: project.industry || "",
      country: project.country || "US",
    });
    setEditingDetails(true);
  };

  const saveDetails = async () => {
    if (!projectId) return;
    setSavingDetails(true);
    try {
      await updateProject(projectId, {
        domain: detailsForm.domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        brandName: detailsForm.brandName.trim(),
        industry: detailsForm.industry || null,
        country: detailsForm.country,
      });
      setEditingDetails(false);
      toast({ title: "Project updated successfully" });
    } catch (err: any) {
      toast({ title: "Failed to update project", description: err.message, variant: "destructive" });
    } finally {
      setSavingDetails(false);
    }
  };

  const addCompetitor = async () => {
    if (!newCompetitor.trim() || !projectId) return;
    setAddingCompetitor(true);
    try {
      await apiRequest("POST", `/api/projects/${projectId}/competitors`, { brandName: newCompetitor.trim() });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "competitors"] });
      setNewCompetitor("");
      toast({ title: "Competitor added" });
    } catch (err: any) {
      toast({ title: "Failed to add competitor", description: err.message, variant: "destructive" });
    } finally {
      setAddingCompetitor(false);
    }
  };

  const removeCompetitor = async (id: number) => {
    if (!projectId) return;
    try {
      await apiRequest("DELETE", `/api/competitors/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "competitors"] });
      toast({ title: "Competitor removed" });
    } catch (err: any) {
      toast({ title: "Failed to remove competitor", description: err.message, variant: "destructive" });
    }
  };

  const addTag = async () => {
    if (!newTagName.trim() || !projectId) return;
    setAddingTag(true);
    try {
      await apiRequest("POST", `/api/projects/${projectId}/tags`, { name: newTagName.trim(), color: newTagColor });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tags"] });
      setNewTagName("");
      toast({ title: "Tag added" });
    } catch (err: any) {
      toast({ title: "Failed to add tag", description: err.message, variant: "destructive" });
    } finally {
      setAddingTag(false);
    }
  };

  const removeTag = async (id: number) => {
    if (!projectId) return;
    try {
      await apiRequest("DELETE", `/api/tags/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tags"] });
      toast({ title: "Tag removed" });
    } catch (err: any) {
      toast({ title: "Failed to remove tag", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    setDeletingProject(true);
    try {
      await deleteProject(projectId);
      toast({ title: "Project deleted" });
    } catch (err: any) {
      toast({ title: "Failed to delete project", description: err.message, variant: "destructive" });
      setDeletingProject(false);
    }
  };

  if (projectLoading || competitorsLoading || tagsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Project Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your monitoring project</p>
      </div>

      {/* ── Project Details ─────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Project Details</h3>
          {!editingDetails ? (
            <Button variant="ghost" size="sm" onClick={startEditDetails} className="h-7 gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingDetails(false)} className="h-7">
                <X className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" onClick={saveDetails} disabled={savingDetails} className="h-7 gap-1.5">
                <Check className="w-3.5 h-3.5" /> {savingDetails ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        {!editingDetails ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-sm font-medium">{COUNTRIES.find(c => c.value === project.country)?.label ?? project.country}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Industry</p>
                <p className="text-sm font-medium">{project.industry || "Not set"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-domain" className="flex items-center gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5" /> Domain
              </Label>
              <Input
                id="edit-domain"
                value={detailsForm.domain}
                onChange={(e) => setDetailsForm({ ...detailsForm, domain: e.target.value })}
                placeholder="yourcompany.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-brand" className="flex items-center gap-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5" /> Brand Name
              </Label>
              <Input
                id="edit-brand"
                value={detailsForm.brandName}
                onChange={(e) => setDetailsForm({ ...detailsForm, brandName: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select value={detailsForm.country} onValueChange={(v) => setDetailsForm({ ...detailsForm, country: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Industry</Label>
              <Select value={detailsForm.industry} onValueChange={(v) => setDetailsForm({ ...detailsForm, industry: v })}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Project ID</p>
            <p className="text-xs font-mono text-muted-foreground">{project.id}</p>
          </div>
          <Badge variant="secondary" className="capitalize">{org?.plan ?? "starter"} plan</Badge>
        </div>
      </Card>

      {/* ── Competitors ─────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Tracked Competitors</h3>
          <span className="text-xs text-muted-foreground ml-auto">{(competitors || []).length} tracked</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(competitors || []).map((c) => (
            <Badge key={c.id} variant="secondary" className="gap-1 pr-1" data-testid={`badge-competitor-${c.id}`}>
              {c.brandName}
              <button
                onClick={() => removeCompetitor(c.id)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                title="Remove competitor"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {(competitors || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No competitors tracked yet.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add competitor brand name..."
            value={newCompetitor}
            onChange={(e) => setNewCompetitor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addCompetitor}
            disabled={!newCompetitor.trim() || addingCompetitor}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </Card>

      {/* ── Tags ────────────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Prompt Tags</h3>
          <span className="text-xs text-muted-foreground ml-auto">{(tags || []).length} tags</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(tags || []).map((t) => (
            <Badge key={t.id} variant="outline" className="gap-1 pr-1" data-testid={`badge-tag-${t.id}`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color || "#22c55e" }} />
              {t.name}
              <button
                onClick={() => removeTag(t.id)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                title="Remove tag"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {(tags || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No tags created yet.</p>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className="w-5 h-5 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: color,
                  borderColor: newTagColor === color ? "white" : "transparent",
                  outline: newTagColor === color ? `2px solid ${color}` : "none",
                }}
                title={color}
              />
            ))}
          </div>
          <Input
            placeholder="Tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addTag}
            disabled={!newTagName.trim() || addingTag}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </Card>

      {/* ── Danger Zone ─────────────────────────────────────────────────────── */}
      <Card className="p-5 border-destructive/30">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete this project</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes all prompts, scans, metrics, and data. This cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="gap-1.5 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Project
          </Button>
        </div>
      </Card>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{project.brandName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all associated data — prompts, scan results,
              metrics, citations, and boost actions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deletingProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingProject ? "Deleting..." : "Yes, delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
