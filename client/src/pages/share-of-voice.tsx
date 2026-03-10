import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics } from "@/hooks/use-project-data";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const BRAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function ShareOfVoice() {
  const { data: metrics, isLoading } = useMetrics();

  const sovData = useMemo(() => {
    if (!metrics) return [];
    const dates = Array.from(new Set(metrics.map((m) => m.date))).sort();
    const lastDate = dates[dates.length - 1];
    const weekAgo = dates[Math.max(0, dates.length - 8)];

    const brandMap = new Map<string, { current: number[]; prev: number[] }>();
    metrics.forEach((m) => {
      if (!brandMap.has(m.brandName)) brandMap.set(m.brandName, { current: [], prev: [] });
      const entry = brandMap.get(m.brandName)!;
      if (m.date === lastDate) entry.current.push(m.sovPct || 0);
      if (m.date === weekAgo) entry.prev.push(m.sovPct || 0);
    });

    return Array.from(brandMap.entries())
      .map(([name, data]) => ({
        name,
        sov: data.current.length ? data.current.reduce((a, b) => a + b, 0) / data.current.length : 0,
        change: data.current.length && data.prev.length
          ? (data.current.reduce((a, b) => a + b, 0) / data.current.length) -
            (data.prev.reduce((a, b) => a + b, 0) / data.prev.length)
          : 0,
      }))
      .sort((a, b) => b.sov - a.sov);
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Share of Voice</h1>
        <p className="text-sm text-muted-foreground mt-1">Brand mention proportion across all AI responses</p>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">SoV Distribution</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sovData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={80} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "SoV"]}
            />
            <Bar dataKey="sov" radius={[0, 4, 4, 0]} barSize={24}>
              {sovData.map((entry, i) => (
                <Cell key={entry.name} fill={entry.name === "AcmeCloud" ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length]} fillOpacity={entry.name === "AcmeCloud" ? 1 : 0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Detailed Breakdown</h3>
        <div className="space-y-3">
          {sovData.map((brand, i) => (
            <div key={brand.name} className="flex items-center gap-4" data-testid={`row-sov-${i}`}>
              <span className="w-6 text-xs text-muted-foreground font-mono text-right">{i + 1}</span>
              <span className={`flex-1 text-sm ${brand.name === "AcmeCloud" ? "font-semibold" : ""}`}>{brand.name}</span>
              <div className="w-40 h-2 bg-muted rounded-full">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(brand.sov / (sovData[0]?.sov || 1)) * 100}%`,
                    backgroundColor: brand.name === "AcmeCloud" ? "#22c55e" : "hsl(var(--muted-foreground))",
                  }}
                />
              </div>
              <span className="font-mono text-sm font-medium w-16 text-right">{brand.sov.toFixed(1)}%</span>
              <span className={`text-xs font-medium w-16 text-right ${brand.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {brand.change >= 0 ? "+" : ""}{brand.change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
