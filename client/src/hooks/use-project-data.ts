import { useQuery } from "@tanstack/react-query";
import { PROJECT_ID } from "@/lib/constants";
import type { Project, Tag, Prompt, Competitor, DailyMetric, BoostAction, Citation } from "@shared/schema";

export function useProject() {
  return useQuery<Project>({ queryKey: ["/api/projects", PROJECT_ID] });
}

export function useTags() {
  return useQuery<Tag[]>({ queryKey: ["/api/projects", PROJECT_ID, "tags"] });
}

export function usePrompts() {
  return useQuery<Prompt[]>({ queryKey: ["/api/projects", PROJECT_ID, "prompts"] });
}

export function useCompetitors() {
  return useQuery<Competitor[]>({ queryKey: ["/api/projects", PROJECT_ID, "competitors"] });
}

export function useMetrics() {
  return useQuery<DailyMetric[]>({ queryKey: ["/api/projects", PROJECT_ID, "metrics"] });
}

export function useBoostActions() {
  return useQuery<BoostAction[]>({ queryKey: ["/api/projects", PROJECT_ID, "boost-actions"] });
}

export function useCitations() {
  return useQuery<Citation[]>({ queryKey: ["/api/projects", PROJECT_ID, "citations"] });
}
