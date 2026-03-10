import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics } from "@/hooks/use-project-data";
import { MODEL_COLORS, AI_MODELS } from "@/lib/constants";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function Visibility() {
  const { data: metrics, isLoading } = useMetrics();

  const chartData = useMemo(() => {
    if (!metrics) return [];
    const acme = metrics.filter((m) => m.brandName === "AcmeCloud");
    const dateMap = new Map<string, Record<string, number>>();

    acme.forEach((m) => {
      const key = m.date;
      if (!dateMap.has(key)) dateMap.set(key, {});
      const obj = dateMap.get(key)!;
      obj[m.model] = m.visibilityPct || 0;
    });

    return Array.from(dateMap.entries())
      .map(([date, models]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...models,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [metrics]);

  const modelStats = useMemo(() => {
    if (!metrics) return [];
    const dates = Array.from(new Set(metrics.map((m) => m.date))).sort();
    const lastDate = dates[dates.length - 1];
    const weekAgo = dates[Math.max(0, dates.length - 8)];

    return AI_MODELS.map((model) => {
      const current = metrics.find((m) => m.brandName === "AcmeCloud" && m.model === model && m.date === lastDate);
      const prev = metrics.find((m) => m.brandName === "AcmeCloud" && m.model === model && m.date === weekAgo);
      return {
        model,
        current: current?.visibilityPct || 0,
        change: (current?.visibilityPct || 0) - (prev?.visibilityPct || 0),
      };
    });
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Visibility</h1>
        <p className="text-sm text-muted-foreground mt-1">How often AcmeCloud appears in AI-generated responses</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {modelStats.map((m) => (
          <Card key={m.model} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MODEL_COLORS[m.model] }} />
              <span className="text-xs font-medium truncate">{m.model}</span>
            </div>
            <p className="text-xl font-bold font-mono">{m.current.toFixed(1)}%</p>
            <p className={`text-xs font-medium ${m.change >= 0 ? "text-green-400" : "text-red-400"}`}>
              {m.change >= 0 ? "+" : ""}{m.change.toFixed(1)}%
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1">Visibility Trend by AI Model</h3>
        <p className="text-xs text-muted-foreground mb-4">Percentage of prompts where AcmeCloud appears</p>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            {AI_MODELS.map((model) => (
              <Line key={model} type="monotone" dataKey={model} stroke={MODEL_COLORS[model]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
