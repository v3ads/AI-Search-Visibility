import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project-data";
import { useMetricsData, useDateRange, DATE_RANGE_OPTIONS, buildTimeSeries, buildModelTimeSeries, getBrands, getModels, MODEL_COLORS, brandAvgOnDate, latestDate, prevDate } from "@/hooks/use-analytics";
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Shield, TrendingUp, TrendingDown } from "lucide-react";
import { ScoreGauge } from "@/components/metric-card";
const BRAND_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
export default function BrandStrength() {
  const { data: project } = useProject();
  const { days, setDays } = useDateRange(30);
  const { data: metrics, isLoading } = useMetricsData(days);
  const brandName = project?.brandName ?? "";
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const allBrands = useMemo(() => (metrics ? getBrands(metrics) : []), [metrics]);
  const activeBrands = selectedBrands.length > 0 ? selectedBrands : allBrands;
  const trendData = useMemo(() => { if (!metrics) return []; return buildTimeSeries(metrics, activeBrands, "brandStrength"); }, [metrics, activeBrands]);
  const latestScores = useMemo(() => {
    if (!metrics || !brandName) return [];
    const ld = latestDate(metrics);
    if (!ld) return [];
    return allBrands.map((brand) => ({ name: brand, score: brandAvgOnDate(metrics, brand, ld, "brandStrength") })).sort((a, b) => b.score - a.score);
  }, [metrics, brandName, allBrands]);
  const myScore = useMemo(() => latestScores.find((b) => b.name === brandName)?.score ?? 0, [latestScores, brandName]);
  const myPrev = useMemo(() => {
    if (!metrics || !brandName) return 0;
    const pd = prevDate(metrics, 1);
    return pd ? brandAvgOnDate(metrics, brandName, pd, "brandStrength") : 0;
  }, [metrics, brandName]);
  const toggleBrand = (brand: string) => setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  if (isLoading) return (<div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>);
  const noData = !metrics || metrics.length === 0;
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Brand Strength</h1>
          <p className="text-sm text-muted-foreground mt-1">Composite score combining visibility, SoV, ranking, and sentiment</p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {DATE_RANGE_OPTIONS.map((opt) => (<Button key={opt.value} variant={days === opt.value ? "default" : "ghost"} size="sm" className="h-7 text-xs px-2" onClick={() => setDays(opt.value)}>{opt.label}</Button>))}
        </div>
      </div>
      {noData ? (
        <Card className="p-10 text-center"><Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-sm font-medium">No data yet</p><p className="text-xs text-muted-foreground mt-1">Run a scan to start collecting brand strength data.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 flex flex-col items-center justify-center">
              <ScoreGauge score={myScore} label={brandName} />
              <div className={`flex items-center gap-1 text-xs mt-2 ${myScore >= myPrev ? "text-green-400" : "text-red-400"}`}>
                {myScore >= myPrev ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{myScore >= myPrev ? "+" : ""}{(myScore - myPrev).toFixed(1)} vs prev period</span>
              </div>
            </Card>
            <Card className="p-5 col-span-2">
              <h3 className="text-sm font-semibold mb-3">Brand Rankings</h3>
              <div className="space-y-2">
                {latestScores.map((b, i) => (
                  <div key={b.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className={`text-sm flex-1 ${b.name === brandName ? "font-semibold text-primary" : ""}`}>{b.name}</span>
                    <div className="w-32 h-1.5 bg-muted rounded-full"><div className="h-1.5 rounded-full" style={{ width: `${b.score}%`, backgroundColor: b.name === brandName ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length] }} /></div>
                    <span className="font-mono text-sm w-10 text-right">{b.score.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Compare:</span>
            {allBrands.map((brand, i) => (
              <Button key={brand} variant={activeBrands.includes(brand) ? "default" : "outline"} size="sm" className="h-7 text-xs"
                onClick={() => toggleBrand(brand)}
                style={activeBrands.includes(brand) ? { backgroundColor: brand === brandName ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length], borderColor: "transparent" } : {}}
              >{brand}</Button>
            ))}
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Brand Strength Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} formatter={(v: number, name: string) => [v.toFixed(1), name]} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                {activeBrands.map((brand, i) => (<Line key={brand} type="monotone" dataKey={brand} stroke={brand === brandName ? "#22c55e" : BRAND_COLORS[i % BRAND_COLORS.length]} strokeWidth={brand === brandName ? 2.5 : 1.5} dot={false} strokeDasharray={brand === brandName ? undefined : "4 2"} />))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
