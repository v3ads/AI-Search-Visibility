import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useProjectContext } from "@/lib/project-context";
import { apiRequest } from "@/lib/queryClient";
import type { Project, Tag, Prompt, Competitor, DailyMetric, BoostAction, Citation, AnalysisRun } from "@shared/schema";

/** Get the current project ID from the URL params (falls back to active project in context) */
function useCurrentProjectId(): string | null {
  const params = useParams<{ id: string }>();
  const { activeProjectId } = useProjectContext();
  return params?.id ?? activeProjectId;
}

export function useProject() {
  const id = useCurrentProjectId();
  return useQuery<Project>({
    queryKey: ["/api/projects", id],
    queryFn: () => apiRequest("GET", `/api/projects/${id}`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useTags() {
  const id = useCurrentProjectId();
  return useQuery<Tag[]>({
    queryKey: ["/api/projects", id, "tags"],
    queryFn: () => apiRequest("GET", `/api/projects/${id}/tags`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function usePrompts() {
  const id = useCurrentProjectId();
  return useQuery<Prompt[]>({
    queryKey: ["/api/projects", id, "prompts"],
    queryFn: () => apiRequest("GET", `/api/projects/${id}/prompts`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useCompetitors() {
  const id = useCurrentProjectId();
  return useQuery<Competitor[]>({
    queryKey: ["/api/projects", id, "competitors"],
    queryFn: () => apiRequest("GET", `/api/projects/${id}/competitors`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useMetrics(days?: number) {
  const id = useCurrentProjectId();
  const url = days ? `/api/projects/${id}/metrics?days=${days}` : `/api/projects/${id}/metrics`;
  return useQuery<DailyMetric[]>({
    queryKey: days ? ["/api/projects", id, "metrics", days] : ["/api/projects", id, "metrics"],
    queryFn: () => apiRequest("GET", url).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useBoostActions() {
  const id = useCurrentProjectId();
  return useQuery<BoostAction[]>({
    queryKey: ["/api/projects", id, "boost-actions"],
    queryFn: () => apiRequest("GET", `/api/projects/${id}/boost-actions`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useCitations() {
  const id = useCurrentProjectId();
  return useQuery<Citation[]>({
    queryKey: ["/api/projects", id, "citations"],
    queryFn: () => apiRequest("GET", `/api/projects/${id}/citations`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useAnalysisRuns() {
  const id = useCurrentProjectId();
  return useQuery<AnalysisRun[]>({
    queryKey: ["/api/projects", id, "scans"],
    queryFn: () => apiRequest("GET", `/api/projects/${id}/scans`).then((r) => r.json()),
    enabled: !!id,
  });
}
