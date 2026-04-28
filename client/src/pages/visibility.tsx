import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project-data";
import {
  useMetricsData, useDateRange, DATE_RANGE_OPTIONS, MODEL_COLORS,
  buildTimeSeries, buildModelTimeSeries, getBrands, getModels,
  brandAvgOnDate, latestDate, prevDate, avg,
} from "@/hooks/use-analytics";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Eye, TrendingUp, TrendingDown } from "lucide-react";

const BRAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

function DateRangeSelector({ days, setDays }: { days: number; setDays: (d: any) => void }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {DATE_RANGE_OPTIONS.map((opt) => (
        <Button key={opt.value} variant={days === opt.value ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays(opt.value)}>
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export default function Visibility() {
  const { data: project } = useProject();
  const { days, setDays } = useDateRange(30);
  const { data: metrics, isLoading } = useMetricsData(days);
  const [selectedModel, setSelectedModel] = useState<string>("all");

  const brandName = project?.brandName ?? "";
  const models = useMemo(() => (metrics ? getModels(metrics) : []), [metrics]);
  const brands = useMemo(() => (metrics ? getBrands(metrics) : []), [metrics]);

  const trendData = useMemo(() => {
    if (!metrics || !brandName) return [];
    if (selectedModel === "all") return buildTimeSeries(metrics, brands, "visibilityPct");
    return buildModelTimeSeries(metrics, brandName, "visibilityPct").map((row) => ({ date: row.date, [selectedModel]: row[selectedModel] ?? 0 }));
  }, [metrics, brands, brandName, selectedModel]);

  const { latest, change } = useMemo(() => {
    if (!metrics || !brandName) return { latest: 0, change: 0 };
    const ld = latestDate(metrics);
    const pd = prevDate(metrics, 1);
    const l = ld ? brandAvgOnDate(metrics, brandName, ld, "visibilityPct") : 0;
    const p = pd ? brandAvgOnDate(metrics, brandName, pd, "visibilityPct") : 0;
    return { latest: l, change: l - p };
  }, [metrics, brandName]);

  const modelBreakdown = useMemo(() => {
    if (!metrics || !brandName) return [];
    const ld = latestDate(metrics);
    if (!ld) return [];
    return models.map((model) => {
      const rows = metrics.filter((m) => m.brandName === brandName && m.date === ld && m.model === model);
      const val = rows.length ? avg(rows.map((m) => m.visibilityPct ?? 0)) : 0;
      const pd = prevDate(metrics, 1);
      const prevRows = pd ? metrics.filter((m) => m.brandName === brandName && m.date === pd && m.model === model) : [];
      const prevVal = prevRows.length ? avg(prevRows.map((m) => m.visibilityPct ?? 0)) : 0;
      return { model, value: val, change: val - prevVal };
    });
  }, [metrics, brandName, models]);

  if (isLoading) return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-80" />
    </div>
  );

  const noData = !metrics || metrics.length === 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Visibility</h1>
          <p className="text-sm text-muted-foreground mt-1">How often <span className="text-foreground font-medium">{brandName}</span> appears in AI responses</p>
        </div>
        <DateRangeSelector days={days} setDays={setDays} />
      </div>

      {noData ? (
        <Card className="p-10 text-center">
          <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No data yet</p>
          <p className="text-xs text-muted-foreground mt-1">Run a scan to start collecting visibility data.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Visibility</p>
              <p className="text-3xl font-bold font-mono mt-1">{latest.toFixed(1)}%</p>
              <div className={`flex items-center gap-1 text-xs mt-1 ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{change >= 0 ? "+" : ""}{change.toFixed(1)}% vs prev</span>
              </div>
            </Card>
            {modelBreakdown.slice(0, 3).map((m) => (
              <Card key={m.model} className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.model}</p>
                <p className="text-3xl font-bold font-mono mt-1">{m.value.toFixed(1)}%</p>
                <div className={`flex items-center gap-1 text-xs mt-1 ${m.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {m.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{m.change >= 0 ? "+" : ""}{m.change.toFixed(1)}%</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Model:</span>
            <Button variant={selectedModel === "all" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setSelectedModel("all")}>All</Button>
            {models.map((m) => (
              <Button key={m} variant={selectedModel === m ? "default" : "outline"} size="sm" className="h-7 text-xs"
                onClick={() => setSelectedModel(m)}
                style={selectedModel === m ? { backgroundColor: MODEL_COLORS[m] ?? undefined, borderColor: MODEL_COLORS[m] ?? undefined } : {}}
              >{m}</Button>
            ))}
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Visibility Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs>
                  {brands.map((brand, i) => (
                    <linearGradient key={brand} id={`vgrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND_COLORS[i % BRAND_COLORS.length]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={BRAND_COLORS[i % BRAND_COLORS.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {selectedModel === "all"
                  ? brands.map((brand, i) => (
                      <Area key={brand} type="monotone" dataKey={brand}
                        stroke={brand === brandName ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length]}
                        strokeWidth={brand === brandName ? 2.5 : 1.5}
                        fill={`url(#vgrad-${i})`}
                        strokeDasharray={brand === brandName ? undefined : "4 2"}
                      />
                    ))
                  : <Area type="monotone" dataKey={selectedModel} stroke={MODEL_COLORS[selectedModel] ?? "#22c55e"} strokeWidth={2} fill="url(#vgrad-0)" />
                }
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Per-Model Breakdown — {brandName}</h3>
            <div className="space-y-3">
              {modelBreakdown.map((m) => (
                <div key={m.model} className="flex items-center gap-4">
                  <span className="text-sm w-32 shrink-0" style={{ color: MODEL_COLORS[m.model] }}>{m.model}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, m.value)}%`, backgroundColor: MODEL_COLORS[m.model] ?? "#22c55e" }} />
                  </div>
                  <span className="font-mono text-sm font-medium w-14 text-right">{m.value.toFixed(1)}%</span>
                  <span className={`text-xs font-medium w-16 text-right ${m.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {m.change >= 0 ? "+" : ""}{m.change.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
