import { useState } from "react";
import { useAnalysisRuns, useProject, useMetrics } from "@/hooks/use-project-data";
import { useQuery } from "@tanstack/react-query";
import { useProjectContext } from "@/lib/project-context";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, XCircle, Loader2, Clock, Zap, ChevronRight,
  BarChart2, Eye, Star, MessageSquare, ArrowLeft, Calendar,
  Cpu, TrendingUp, Activity
} from "lucide-react";
import type { AnalysisRun } from "@shared/schema";
import { MODEL_COLORS } from "@/lib/constants";

// ── Helpers ──────────────────────────────────────────────────────────────────

function duration(start?: string | Date | null, end?: string | Date | null): string {
  if (!start) return "";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = e - s;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function fmt(d?: string | Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function statusColor(status: string) {
  if (status === "completed") return "text-green-400 border-green-500/30 bg-green-500/10";
  if (status === "failed") return "text-red-400 border-red-500/30 bg-red-500/10";
  if (status === "running") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-muted-foreground border-border bg-muted/40";
}

function StatusDot({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
  if (status === "running") return <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />;
  return <Clock className="w-4 h-4 text-muted-foreground shrink-0" />;
}

// ── Metric card used in run detail ───────────────────────────────────────────
function StatPill({ label, value, icon: Icon, color = "" }: {
  label: string; value: string | number; icon: any; color?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30 border border-border/50">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color || "text-muted-foreground"}`} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ── Run Detail Panel ─────────────────────────────────────────────────────────

function RunDetail({ run, onBack }: { run: AnalysisRun; onBack: () => void }) {
  const { activeProjectId } = useProjectContext();

  // Fetch all metrics and filter to those from this run's date
  const { data: metrics } = useQuery({
    queryKey: ["/api/projects", activeProjectId, "metrics"],
    queryFn: () => apiRequest("GET", `/api/projects/${activeProjectId}/metrics?days=365`).then((r) => r.json()),
    enabled: !!activeProjectId,
  });

  const { data: project } = useProject();

  const runDate = run.startedAt ? new Date(run.startedAt).toISOString().slice(0, 10) : null;
  const runMetrics = (metrics ?? []).filter((m: any) => m.date === runDate);
  const modelsUsed = run.modelsUsed ?? [];
  const pct = run.totalPrompts && run.totalPrompts > 0
    ? Math.round(((run.completedPrompts ?? 0) / run.totalPrompts) * 100)
    : 0;

  // Per-model breakdown
  const brandName = project?.brandName ?? "";
  const brandMetrics = runMetrics.filter((m: any) => m.brandName === brandName);

  const avgVisibility = brandMetrics.length
    ? Math.round(brandMetrics.reduce((s: number, m: any) => s + Number(m.visibilityPct), 0) / brandMetrics.length)
    : null;
  const avgSentiment = brandMetrics.length
    ? Math.round(brandMetrics.reduce((s: number, m: any) => s + Number(m.sentimentScore), 0) / brandMetrics.length)
    : null;
  const avgBrandStrength = brandMetrics.length
    ? Math.round(brandMetrics.reduce((s: number, m: any) => s + Number(m.brandStrength), 0) / brandMetrics.length)
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 h-8 px-2 -ml-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-xs">All scans</span>
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <StatusDot status={run.status} />
          <span className="text-sm font-medium">Scan #{run.id}</span>
          <Badge variant="outline" className={`text-[10px] ${statusColor(run.status)}`}>
            {run.status}
          </Badge>
        </div>
      </div>

      {/* Meta row */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatPill label="Started" value={fmt(run.startedAt)} icon={Calendar} />
          <StatPill label="Duration" value={duration(run.startedAt, run.completedAt) || "—"} icon={Clock} />
          <StatPill
            label="Queries run"
            value={`${run.completedPrompts ?? 0} / ${run.totalPrompts ?? 0}`}
            icon={Activity}
            color={pct === 100 ? "text-green-400" : "text-amber-400"}
          />
          <StatPill label="Models" value={modelsUsed.length || "—"} icon={Cpu} />
        </div>
      </Card>

      {/* Models used */}
      {modelsUsed.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Models queried</h3>
          <div className="flex flex-wrap gap-2">
            {modelsUsed.map((m) => (
              <div key={m} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium bg-muted/30 ${MODEL_COLORS[m] ?? "text-foreground"}`}>
                <Cpu className="w-3 h-3" />
                {m}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Results breakdown — only if completed and metrics exist */}
      {run.status === "completed" && brandMetrics.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Results for {brandName}
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatPill
              label="Avg visibility"
              value={avgVisibility !== null ? `${avgVisibility}%` : "—"}
              icon={Eye}
              color="text-primary"
            />
            <StatPill
              label="Avg sentiment"
              value={avgSentiment !== null ? `${avgSentiment}/100` : "—"}
              icon={MessageSquare}
              color="text-green-400"
            />
            <StatPill
              label="Brand strength"
              value={avgBrandStrength !== null ? `${avgBrandStrength}` : "—"}
              icon={Star}
              color="text-amber-400"
            />
          </div>

          {/* Per-model breakdown */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground mb-2">Per-model breakdown</p>
            {brandMetrics.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/20 border border-border/40">
                <span className={`text-xs font-medium w-28 shrink-0 ${MODEL_COLORS[m.model] ?? "text-foreground"}`}>
                  {m.model}
                </span>
                <div className="flex-1 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {Math.round(Number(m.visibilityPct))}% visible
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    rank {m.avgRank > 0 ? `#${Math.round(Number(m.avgRank))}` : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {Math.round(Number(m.sentimentScore))}/100
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, Number(m.visibilityPct))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {run.status === "failed" && run.error && (
        <Card className="p-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Scan failed</p>
              <p className="text-xs text-muted-foreground mt-1">{run.error}</p>
            </div>
          </div>
        </Card>
      )}

      {run.status === "completed" && brandMetrics.length === 0 && (
        <Card className="p-6 text-center">
          <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">Metric data for this scan date isn't available in the current range.</p>
        </Card>
      )}
    </div>
  );
}

// ── Run List Row ─────────────────────────────────────────────────────────────

function RunRow({ run, onClick, isSelected }: {
  run: AnalysisRun;
  onClick: () => void;
  isSelected: boolean;
}) {
  const pct = run.totalPrompts && run.totalPrompts > 0
    ? Math.round(((run.completedPrompts ?? 0) / run.totalPrompts) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/30"
      }`}
    >
      <StatusDot status={run.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium">Scan #{run.id}</span>
          <Badge variant="outline" className={`text-[10px] ${statusColor(run.status)}`}>
            {run.status}
          </Badge>
          {run.modelsUsed && (
            <span className="text-[10px] text-muted-foreground">{run.modelsUsed.length} models</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {fmt(run.startedAt)}
          </span>
          <span>{run.completedPrompts ?? 0}/{run.totalPrompts ?? 0} queries</span>
          {run.status === "running" && <span className="text-amber-400">{pct}%</span>}
          {run.completedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration(run.startedAt, run.completedAt)}
            </span>
          )}
        </div>
        {/* Progress bar for running scans */}
        {run.status === "running" && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ScanHistoryPage() {
  const { data: runs, isLoading } = useAnalysisRuns();
  const { data: project } = useProject();
  const [selectedRun, setSelectedRun] = useState<AnalysisRun | null>(null);

  const sortedRuns = [...(runs ?? [])].sort(
    (a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime()
  );

  const completedRuns = sortedRuns.filter((r) => r.status === "completed");
  const totalQueries = completedRuns.reduce((s, r) => s + (r.completedPrompts ?? 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Scan History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {project?.brandName
            ? `All scans for ${project.brandName}`
            : "All AI visibility scans for this project"}
        </p>
      </div>

      {/* Summary stats */}
      {!isLoading && sortedRuns.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{sortedRuns.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total scans</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{completedRuns.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{totalQueries}</div>
            <div className="text-xs text-muted-foreground mt-1">Total queries run</div>
          </Card>
        </div>
      )}

      {/* Main content: list + detail side-by-side on desktop, stacked on mobile */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : sortedRuns.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-base font-semibold mb-1">No scans yet</h3>
          <p className="text-sm text-muted-foreground">
            Run your first AI scan from the Dashboard to start tracking brand visibility.
          </p>
        </Card>
      ) : selectedRun ? (
        /* Detail view */
        <RunDetail run={selectedRun} onBack={() => setSelectedRun(null)} />
      ) : (
        /* List view */
        <div className="space-y-2">
          {sortedRuns.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              onClick={() => setSelectedRun(run)}
              isSelected={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
