import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project-data";
import { useMetricsData, useDateRange, DATE_RANGE_OPTIONS, buildTimeSeries, getBrands, brandAvgOnDate, latestDate, prevDate } from "@/hooks/use-analytics";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
const BRAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
export default function Ranking() {
  const { data: project } = useProject();
  const { days, setDays } = useDateRange(30);
  const { data: metrics, isLoading } = useMetricsData(days);
  const brandName = project?.brandName ?? "";
  const rankings = useMemo(() => {
    if (!metrics || !brandName) return [];
    const brands = getBrands(metrics);
    const ld = latestDate(metrics);
    const pd = prevDate(metrics, 1);
    return brands.map((brand) => {
      const curr = ld ? brandAvgOnDate(metrics, brand, ld, "avgRank") : 0;
      const prev = pd ? brandAvgOnDate(metrics, brand, pd, "avgRank") : 0;
      return { name: brand, rank: Math.round(curr * 10) / 10, change: Math.round((prev - curr) * 10) / 10 };
    }).filter((b) => b.rank > 0).sort((a, b) => a.rank - b.rank);
  }, [metrics, brandName]);
  const trendData = useMemo(() => { if (!metrics) return []; return buildTimeSeries(metrics, getBrands(metrics), "avgRank"); }, [metrics]);
  const brands = useMemo(() => (metrics ? getBrands(metrics) : []), [metrics]);
  if (isLoading) return (<div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>);
  const noData = !metrics || metrics.length === 0;
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Ranking</h1>
          <p className="text-sm text-muted-foreground mt-1">Average ordinal position in AI response lists</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {DATE_RANGE_OPTIONS.map((opt) => (<Button key={opt.value} variant={days === opt.value ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays(opt.value)}>{opt.label}</Button>))}
        </div>
      </div>
      {noData ? (
        <Card className="p-10 text-center"><Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">No data yet</p><p className="text-xs text-muted-foreground mt-1">Run a scan to start collecting ranking data.</p></Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="space-y-1">
              {rankings.map((brand, i) => {
                const isTarget = brand.name === brandName;
                const medalColors = ["bg-yellow-500/20 text-yellow-400", "bg-gray-400/20 text-gray-300", "bg-amber-600/20 text-amber-500"];
                return (
                  <div key={brand.name} className={`flex items-center gap-4 p-3 rounded-md transition-colors ${isTarget ? "bg-primary/5 border border-primary/20" : ""}`} data-testid={`row-ranking-${i}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? medalColors[i] : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
                    <div className="flex-1">
                      <span className={`text-sm ${isTarget ? "font-semibold" : ""}`}>{brand.name}</span>
                      {isTarget && <Badge variant="secondary" className="ml-2 text-[10px]">Your Brand</Badge>}
                    </div>
                    <span className="font-mono text-lg font-bold w-16 text-right">#{brand.rank.toFixed(1)}</span>
                    <div className={`flex items-center gap-1 text-xs font-medium w-20 justify-end ${brand.change > 0 ? "text-green-400" : brand.change < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {brand.change > 0 ? <TrendingUp className="w-3 h-3" /> : brand.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      <span>{brand.change > 0 ? "+" : ""}{brand.change.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Ranking Trend Over Time</h3>
            <p className="text-xs text-muted-foreground mb-3">Lower is better — position #1 means the brand is mentioned first</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis reversed tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number, name: string) => [`#${v.toFixed(1)}`, name]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {brands.map((brand, i) => (<Line key={brand} type="monotone" dataKey={brand} stroke={brand === brandName ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length]} strokeWidth={brand === brandName ? 2.5 : 1.5} dot={false} strokeDasharray={brand === brandName ? undefined : "4 2"} />))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
