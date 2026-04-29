/**
 * Shared analytics utilities for all analytics pages.
 * All computations are derived from real DailyMetric rows returned by the API.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjectContext } from "@/lib/project-context";
import type { DailyMetric } from "@shared/schema";

export type DateRange = 7 | 14 | 30 | 60 | 90;

export const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
];

export const MODEL_COLORS: Record<string, string> = {
  "ChatGPT": "#10b981",
  "Claude": "#f97316",
  "Google Gemini": "#3b82f6",
  "Grok": "#a855f7",
};

export const MODEL_STROKE: Record<string, string> = {
  "ChatGPT": "#10b981",
  "Claude": "#f97316",
  "Google Gemini": "#3b82f6",
  "Grok": "#a855f7",
};

/** Fetch metrics for the active project with a date range */
export function useMetricsData(days: DateRange = 30) {
  const { activeProjectId } = useProjectContext();
  return useQuery<DailyMetric[]>({
    queryKey: ["/api/projects", activeProjectId, "metrics", days],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${activeProjectId}/metrics?days=${days}`, { credentials: "include",
        
      });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
    enabled: !!activeProjectId,
  });
}

/** Average an array of numbers */
export function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Get all unique models from metrics */
export function getModels(metrics: DailyMetric[]): string[] {
  return Array.from(new Set(metrics.map((m) => m.model))).sort();
}

/** Get all unique brand names from metrics */
export function getBrands(metrics: DailyMetric[]): string[] {
  return Array.from(new Set(metrics.map((m) => m.brandName))).sort();
}

/** Get all unique dates from metrics, sorted ascending */
export function getDates(metrics: DailyMetric[]): string[] {
  return Array.from(new Set(metrics.map((m) => m.date))).sort();
}

/** Format a date string for display */
export function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Get the latest date in the dataset */
export function latestDate(metrics: DailyMetric[]): string | null {
  const dates = getDates(metrics);
  return dates.length ? dates[dates.length - 1] : null;
}

/** Get the second-to-last date for comparison */
export function prevDate(metrics: DailyMetric[], n = 1): string | null {
  const dates = getDates(metrics);
  return dates.length > n ? dates[dates.length - 1 - n] : null;
}

/** Average a metric field across models for a given brand on a given date */
export function brandAvgOnDate(
  metrics: DailyMetric[],
  brandName: string,
  date: string,
  field: keyof DailyMetric
): number {
  const rows = metrics.filter((m) => m.brandName === brandName && m.date === date);
  return avg(rows.map((m) => (m[field] as number) ?? 0));
}

/**
 * Build a time-series array for a chart.
 * Returns [{date, [brand1]: value, [brand2]: value, ...}]
 */
export function buildTimeSeries(
  metrics: DailyMetric[],
  brands: string[],
  field: keyof DailyMetric,
  modelFilter?: string
): Record<string, string | number>[] {
  const dates = getDates(metrics);
  return dates.map((date) => {
    const row: Record<string, string | number> = { date: fmtDate(date), rawDate: date };
    for (const brand of brands) {
      const rows = metrics.filter(
        (m) => m.brandName === brand && m.date === date && (!modelFilter || m.model === modelFilter)
      );
      row[brand] = rows.length ? Math.round(avg(rows.map((m) => (m[field] as number) ?? 0)) * 10) / 10 : 0;
    }
    return row;
  });
}

/** Build per-model time series for a single brand */
export function buildModelTimeSeries(
  metrics: DailyMetric[],
  brandName: string,
  field: keyof DailyMetric
): Record<string, string | number>[] {
  const dates = getDates(metrics);
  const models = getModels(metrics);
  return dates.map((date) => {
    const row: Record<string, string | number> = { date: fmtDate(date), rawDate: date };
    for (const model of models) {
      const rows = metrics.filter((m) => m.brandName === brandName && m.date === date && m.model === model);
      row[model] = rows.length ? Math.round(avg(rows.map((m) => (m[field] as number) ?? 0)) * 10) / 10 : 0;
    }
    return row;
  });
}

/** Hook: date range selector state */
export function useDateRange(defaultDays: DateRange = 30) {
  const [days, setDays] = useState<DateRange>(defaultDays);
  return { days, setDays };
}

/** Hook: model filter state */
export function useModelFilter(metrics: DailyMetric[]) {
  const models = useMemo(() => getModels(metrics), [metrics]);
  const [selectedModel, setSelectedModel] = useState<string>("all");
  return { models, selectedModel, setSelectedModel };
}
