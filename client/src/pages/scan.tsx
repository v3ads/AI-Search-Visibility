import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext } from "@/lib/project-context";
import { useAnalysisRuns, usePrompts } from "@/hooks/use-project-data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AnalysisRun } from "@shared/schema";
import {
  Radar, Loader2, CheckCircle2, XCircle, Clock, Play,
  ChevronRight, Zap, AlertCircle,
} from "lucide-react";

const MODELS = ["ChatGPT", "Claude", "Google Gemini", "Grok"];

const MODEL_COLORS: Record<string, string> = {
  "ChatGPT": "text-emerald-400",
  "Claude": "text-orange-400",
  "Google Gemini": "text-blue-400",
  "Grok": "text-purple-400",
};

const MODEL_BG: Record<string, string> = {
  "ChatGPT": "bg-emerald-500/10 border-emerald-500/30",
  "Claude": "bg-orange-500/10 border-orange-500/30",
  "Google Gemini": "bg-blue-500/10 border-blue-500/30",
  "Grok": "bg-purple-500/10 border-purple-500/30",
};

type ModelStatus = "idle" | "running" | "done" | "error";

interface LogEntry {
  id: number;
  model: string;
  promptText: string;
  status: "running" | "done" | "error";
  ts: number;
}

function duration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const secs = Math.round((e - s) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
  if (status === "running") return <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />;
  return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
}

// ── Scan History Row ─────────────────────────────────────────────────────────
function ScanHistoryRow({ run }: { run: AnalysisRun }) {
  const pct = run.totalPrompts && run.totalPrompts > 0
    ? Math.round((run.completedPrompts ?? 0) / run.totalPrompts * 100)
    : 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0 text-sm">
      <StatusIcon status={run.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-xs">
            {run.startedAt
              ? new Date(run.startedAt).toLocaleString("en-US", {
                  month: "short", day: "numeric",
                  hour: "numeric", minute: "2-digit",
                })
              : "—"}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              run.status === "completed" ? "border-green-500/40 text-green-400" :
              run.status === "failed" ? "border-red-500/40 text-red-400" :
              run.status === "running" ? "border-amber-500/40 text-amber-400" :
              "border-muted text-muted-foreground"
            }`}
          >
            {run.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {run.completedPrompts ?? 0}/{run.totalPrompts ?? 0} queries
          {run.modelsUsed ? ` · ${run.modelsUsed.length} models` : ""}
          {run.status === "running" && ` · ${pct}%`}
          {run.error && ` · ${run.error.slice(0, 60)}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {duration(run.startedAt?.toString(), run.completedAt?.toString())}
      </span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const { activeProjectId } = useProjectContext();
  const projectId = params?.id ?? activeProjectId ?? "";

  const { toast } = useToast();
  const { data: runs, isLoading: runsLoading } = useAnalysisRuns();
  const { data: prompts } = usePrompts();

  const activePromptCount = (prompts ?? []).filter((p) => p.isActive).length;

  // ── Live scan state ──────────────────────────────────────────────────────
  const [scanning, setScanning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [modelStatus, setModelStatus] = useState<Record<string, ModelStatus>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logCounter = useRef(0);

  const appendLog = useCallback((entry: Omit<LogEntry, "id" | "ts">) => {
    setLog((prev) => {
      const next = [...prev, { ...entry, id: ++logCounter.current, ts: Date.now() }];
      return next.slice(-80); // keep last 80 entries
    });
  }, []);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Connect to SSE when we have an active run
  useEffect(() => {
    if (!activeRunId) return;

    const es = new EventSource(`/api/scans/${activeRunId}/progress`, { withCredentials: true });
    eventSourceRef.current = es;

    es.addEventListener("start", (e) => {
      const data = JSON.parse(e.data);
      setProgress({ completed: 0, total: data.totalPrompts * data.totalModels });
      setModelStatus(Object.fromEntries(MODELS.map((m) => [m, "idle"])));
    });

    es.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      setProgress({ completed: data.completed, total: data.total });
      setModelStatus((prev) => ({ ...prev, [data.model]: data.status }));
      appendLog({ model: data.model, promptText: data.promptText, status: data.status });
    });

    es.addEventListener("complete", () => {
      setScanning(false);
      setActiveRunId(null);
      setModelStatus(Object.fromEntries(MODELS.map((m) => [m, "done"])));
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "citations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scans"] });
      toast({ title: "Scan complete", description: "All AI models have been queried." });
      es.close();
    });

    es.addEventListener("failed", (e) => {
      const data = JSON.parse(e.data);
      setScanning(false);
      setActiveRunId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "scans"] });
      toast({ title: "Scan failed", description: data.error, variant: "destructive" });
      es.close();
    });

    es.addEventListener("heartbeat", () => {});

    es.onerror = () => {
      // SSE connection dropped — fall back to polling
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [activeRunId, projectId, toast, appendLog]);

  const handleScan = async () => {
    if (!projectId) return;
    setScanning(true);
    setLog([]);
    setProgress({ completed: 0, total: 0 });
    setModelStatus(Object.fromEntries(MODELS.map((m) => [m, "idle"])));

    try {
      const res = await apiRequest("POST", `/api/projects/${projectId}/scan`);
      const data = await res.json();
      setActiveRunId(data.runId);
      toast({ title: "Scan started", description: "Querying AI models with your active prompts." });
    } catch (err: any) {
      setScanning(false);
      toast({ title: "Failed to start scan", description: err.message, variant: "destructive" });
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const recentRuns = (runs ?? []).slice(0, 10);

  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Scan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Query ChatGPT, Claude, Gemini, and Grok with your {activePromptCount} active prompt{activePromptCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={handleScan}
          disabled={scanning || activePromptCount === 0}
          className="gap-2 shrink-0"
          size="lg"
          data-testid="button-run-scan"
        >
          {scanning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Scanning...</>
          ) : (
            <><Radar className="h-4 w-4" /> Run Scan</>
          )}
        </Button>
      </div>

      {activePromptCount === 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">No active prompts</p>
              <p className="text-xs text-muted-foreground">
                Go to the Prompts page and activate at least one prompt before running a scan.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Live Progress — shown while scanning */}
      {scanning && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-semibold">Scan in progress</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {progress.completed}/{progress.total} · {pct}%
            </span>
          </div>

          <Progress value={pct} className="h-2" />

          {/* Per-model status grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MODELS.map((model) => {
              const status = modelStatus[model] ?? "idle";
              return (
                <div
                  key={model}
                  className={`rounded-lg border p-3 flex flex-col gap-1.5 transition-all ${
                    status === "running" ? MODEL_BG[model] : "bg-muted/20 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${status === "running" ? MODEL_COLORS[model] : "text-muted-foreground"}`}>
                      {model}
                    </span>
                    {status === "running" && <Loader2 className={`h-3 w-3 animate-spin ${MODEL_COLORS[model]}`} />}
                    {status === "done" && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                    {status === "error" && <XCircle className="h-3 w-3 text-red-400" />}
                    {status === "idle" && <Clock className="h-3 w-3 text-muted-foreground/40" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">{status}</span>
                </div>
              );
            })}
          </div>

          {/* Live log */}
          {log.length > 0 && (
            <div
              ref={logRef}
              className="bg-muted/30 rounded-md p-3 h-40 overflow-y-auto space-y-1 font-mono text-[11px]"
            >
              {log.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2">
                  {entry.status === "running" && <Loader2 className={`h-3 w-3 animate-spin mt-0.5 shrink-0 ${MODEL_COLORS[entry.model] ?? "text-muted-foreground"}`} />}
                  {entry.status === "done" && <CheckCircle2 className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />}
                  {entry.status === "error" && <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />}
                  <span className={`shrink-0 ${MODEL_COLORS[entry.model] ?? "text-muted-foreground"}`}>{entry.model}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground truncate">{entry.promptText}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Scan History */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Scan History</h2>
          {recentRuns.length > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {recentRuns.length} run{recentRuns.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {runsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Radar className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No scans yet</p>
            <p className="text-xs mt-1">Run your first scan to start collecting AI visibility data.</p>
          </div>
        ) : (
          <div>
            {recentRuns.map((run) => (
              <ScanHistoryRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </Card>

      {/* Info card */}
      <Card className="p-4 bg-muted/20">
        <div className="flex items-start gap-3">
          <Play className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium">How scans work</p>
            <p className="text-xs text-muted-foreground">
              Each scan queries all 4 AI models (ChatGPT, Claude, Gemini, Grok) with every active prompt.
              Results are analyzed for brand mentions, ranking position, sentiment, and citations.
              Metrics are stored per-day so you can track changes over time.
            </p>
            <p className="text-xs text-muted-foreground">
              A scan with {activePromptCount} active prompt{activePromptCount !== 1 ? "s" : ""} runs{" "}
              <strong>{activePromptCount * 4} queries</strong> total.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
