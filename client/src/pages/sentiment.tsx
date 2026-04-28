import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project-data";
import { useMetricsData, useDateRange, DATE_RANGE_OPTIONS, buildTimeSeries, buildModelTimeSeries, getBrands, getModels, MODEL_COLORS, brandAvgOnDate, latestDate, prevDate, avg } from "@/hooks/use-analytics";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from "recharts";
import { SmilePlus, TrendingUp, TrendingDown } from "lucide-react";
const BRAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
function SentimentBadge({ score }: { score: number }) {
  if (score >= 70) return <span className="text-xs font-medium text-green-400">Positive</span>;
  if (score >= 45) return <span className="text-xs font-medium text-amber-400">Neutral</span>;
  return <span className="text-xs font-medium text-red-400">Negative</span>;
}
export default function Sentiment() {
  const { data: project } = useProject();
  const { days, setDays } = useDateRange(30);
  const { data: metrics, isLoading } = useMetricsData(days);
  const brandName = project?.brandName ?? "";
  const brands = useMemo(() => (metrics ? getBrands(metrics) : []), [metrics]);
  const models = useMemo(() => (metrics ? getModels(metrics) : []), [metrics]);
  const trendData = useMemo(() => { if (!metrics) return []; return buildTimeSeries(metrics, brands, "sentimentScore"); }, [metrics, brands]);
  const modelTrend = useMemo(() => { if (!metrics || !brandName) return []; return buildModelTimeSeries(metrics, brandName, "sentimentScore"); }, [metrics, brandName]);
  const latestByBrand = useMemo(() => {
    if (!metrics) return [];
    const ld = latestDate(metrics);
    if (!ld) return [];
    return brands.map((brand) => {
      const curr = brandAvgOnDate(metrics, brand, ld, "sentimentScore");
      const pd = prevDate(metrics, 1);
      const prev = pd ? brandAvgOnDate(metrics, brand, pd, "sentimentScore") : 0;
      return { name: brand, score: Math.round(curr * 10) / 10, change: Math.round((curr - prev) * 10) / 10 };
    }).sort((a, b) => b.score - a.score);
  }, [metrics, brands]);
  const myScore = useMemo(() => latestByBrand.find((b) => b.name === brandName)?.score ?? 0, [latestByBrand, brandName]);
  const myChange = useMemo(() => latestByBrand.find((b) => b.name === brandName)?.change ?? 0, [latestByBrand, brandName]);
  if (isLoading) return (<div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>);
  const noData = !metrics || metrics.length === 0;
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Sentiment Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">How AI models describe and characterize your brand</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {DATE_RANGE_OPTIONS.map((opt) => (<Button key={opt.value} variant={days === opt.value ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays(opt.value)}>{opt.label}</Button>))}
        </div>
      </div>
      {noData ? (
        <Card className="p-10 text-center"><SmilePlus className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">No data yet</p><p className="text-xs text-muted-foreground mt-1">Run a scan to start collecting sentiment data.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Sentiment</p>
              <p className="text-3xl font-bold font-mono mt-1">{myScore.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span></p>
              <div className="flex items-center gap-2 mt-1">
                <SentimentBadge score={myScore} />
                <span className={`text-xs ${myChange >= 0 ? "text-green-400" : "text-red-400"}`}>{myChange >= 0 ? "+" : ""}{myChange.toFixed(1)} vs prev</span>
              </div>
            </Card>
            {latestByBrand.filter((b) => b.name !== brandName).slice(0, 2).map((b) => (
              <Card key={b.name} className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{b.name}</p>
                <p className="text-3xl font-bold font-mono mt-1">{b.score.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span></p>
                <div className="flex items-center gap-2 mt-1">
                  <SentimentBadge score={b.score} />
                  <span className={`text-xs ${b.change >= 0 ? "text-green-400" : "text-red-400"}`}>{b.change >= 0 ? "+" : ""}{b.change.toFixed(1)}</span>
                </div>
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Sentiment Trend — All Brands</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number, name: string) => [v.toFixed(1), name]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {brands.map((brand, i) => (<Line key={brand} type="monotone" dataKey={brand} stroke={brand === brandName ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length]} strokeWidth={brand === brandName ? 2.5 : 1.5} dot={false} strokeDasharray={brand === brandName ? undefined : "4 2"} />))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Sentiment by AI Model — {brandName}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={modelTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number, name: string) => [v.toFixed(1), name]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {models.map((model) => (<Line key={model} type="monotone" dataKey={model} stroke={MODEL_COLORS[model] ?? "#22c55e"} strokeWidth={2} dot={false} />))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Latest Sentiment Comparison</h3>
            <ResponsiveContainer width="100%" height={Math.max(180, latestByBrand.length * 48)}>
              <BarChart data={latestByBrand} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number) => [v.toFixed(1), "Sentiment"]} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={22}>
                  {latestByBrand.map((entry, i) => (<Cell key={entry.name} fill={entry.name === brandName ? "#22c55e" : BRAND_COLORS[(i + 1) % BRAND_COLORS.length]} fillOpacity={entry.name === brandName ? 1 : 0.65} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
