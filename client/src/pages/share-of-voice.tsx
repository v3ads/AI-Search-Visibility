import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project-data";
import { useMetricsData, useDateRange, DATE_RANGE_OPTIONS, buildTimeSeries, getBrands, brandAvgOnDate, latestDate, prevDate } from "@/hooks/use-analytics";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, AreaChart, Area, Legend } from "recharts";
import { PieChart } from "lucide-react";
const BRAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
export default function ShareOfVoice() {
  const { data: project } = useProject();
  const { days, setDays } = useDateRange(30);
  const { data: metrics, isLoading } = useMetricsData(days);
  const brandName = project?.brandName ?? "";
  const sovData = useMemo(() => {
    if (!metrics || !brandName) return [];
    const brands = getBrands(metrics);
    const ld = latestDate(metrics);
    const pd = prevDate(metrics, 1);
    return brands.map((brand) => {
      const curr = ld ? brandAvgOnDate(metrics, brand, ld, "sovPct") : 0;
      const prev = pd ? brandAvgOnDate(metrics, brand, pd, "sovPct") : 0;
      return { name: brand, sov: Math.round(curr * 10) / 10, change: Math.round((curr - prev) * 10) / 10 };
    }).sort((a, b) => b.sov - a.sov);
  }, [metrics, brandName]);
  const trendData = useMemo(() => { if (!metrics) return []; return buildTimeSeries(metrics, getBrands(metrics), "sovPct"); }, [metrics]);
  const brands = useMemo(() => (metrics ? getBrands(metrics) : []), [metrics]);
  if (isLoading) return (<div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>);
  const noData = !metrics || metrics.length === 0;
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Share of Voice</h1>
          <p className="text-sm text-muted-foreground mt-1">Brand mention proportion across all AI responses</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {DATE_RANGE_OPTIONS.map((opt) => (<Button key={opt.value} variant={days === opt.value ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays(opt.value)}>{opt.label}</Button>))}
        </div>
      </div>
      {noData ? (
        <Card className="p-10 text-center"><PieChart className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">No data yet</p><p className="text-xs text-muted-foreground mt-1">Run a scan to start collecting share of voice data.</p></Card>
      ) : (
        <>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">SoV Distribution (Latest)</h3>
            <ResponsiveContainer width="100%" height={Math.max(200, sovData.length * 52)}>
              <BarChart data={sovData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number) => [`${v.toFixed(1)}%`, "SoV"]} />
                <Bar dataKey="sov" radius={[0, 4, 4, 0]} barSize={24}>
                  {sovData.map((entry, i) => (<Cell key={entry.name} fill={entry.name === brandName ? "#22c55e" : BRAND_COLORS[(i + 1) % BRAND_COLORS.length]} fillOpacity={entry.name === brandName ? 1 : 0.65} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">SoV Trend Over Time</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <defs>{brands.map((brand, i) => (<linearGradient key={brand} id={`sovgrad-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BRAND_COLORS[i % BRAND_COLORS.length]} stopOpacity={0.2} /><stop offset="95%" stopColor={BRAND_COLORS[i % BRAND_COLORS.length]} stopOpacity={0} /></linearGradient>))}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {brands.map((brand, i) => (<Area key={brand} type="monotone" dataKey={brand} stroke={brand === brandName ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length]} strokeWidth={brand === brandName ? 2.5 : 1.5} fill={`url(#sovgrad-${i})`} strokeDasharray={brand === brandName ? undefined : "4 2"} />))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Detailed Breakdown</h3>
            <div className="space-y-3">
              {sovData.map((brand, i) => (
                <div key={brand.name} className="flex items-center gap-4" data-testid={`row-sov-${i}`}>
                  <span className="w-6 text-xs text-muted-foreground font-mono text-right">{i + 1}</span>
                  <span className={`flex-1 text-sm ${brand.name === brandName ? "font-semibold text-primary" : ""}`}>{brand.name}</span>
                  <div className="w-40 h-2 bg-muted rounded-full"><div className="h-2 rounded-full transition-all" style={{ width: `${(brand.sov / (sovData[0]?.sov || 1)) * 100}%`, backgroundColor: brand.name === brandName ? "#22c55e" : "hsl(var(--muted-foreground))" }} /></div>
                  <span className="font-mono text-sm font-medium w-16 text-right">{brand.sov.toFixed(1)}%</span>
                  <span className={`text-xs font-medium w-16 text-right ${brand.change >= 0 ? "text-green-400" : "text-red-400"}`}>{brand.change >= 0 ? "+" : ""}{brand.change.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
