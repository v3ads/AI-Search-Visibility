import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { apiRequest } from "./queryClient";

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
  isLoading: boolean;
  createProject: (data: Omit<Project, "id" | "userId" | "createdAt">) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = "ai_visibility_active_project";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("GET", "/api/projects").then((r) => r.json()),
  });

  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  // Auto-select first project if none selected or stored one no longer exists
  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      const stored = localStorage.getItem(STORAGE_KEY);
      const exists = stored && projects.some((p) => p.id === stored);
      if (!exists) {
        const id = projects[0].id;
        localStorage.setItem(STORAGE_KEY, id);
        setActiveProjectIdState(id);
      }
    }
  }, [projects, isLoading]);

  const setActiveProjectId = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setActiveProjectIdState(id);
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Project, "id" | "userId" | "createdAt">) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json() as Promise<Project>;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setActiveProjectId(project.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return res.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (activeProjectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProjectId] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (activeProjectId === deletedId) {
        const remaining = projects.filter((p) => p.id !== deletedId);
        if (remaining.length > 0) {
          setActiveProjectId(remaining[0].id);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          setActiveProjectIdState(null);
        }
      }
    },
  });

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        setActiveProjectId,
        isLoading,
        createProject: createMutation.mutateAsync,
        updateProject: (id, data) => updateMutation.mutateAsync({ id, data }),
        deleteProject: deleteMutation.mutateAsync,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjectContext must be used within ProjectProvider");
  return ctx;
}
