import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMetrics } from "@/hooks/use-project-data";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function Ranking() {
  const { data: metrics, isLoading } = useMetrics();

  const rankings = useMemo(() => {
    if (!metrics) return [];
    const dates = Array.from(new Set(metrics.map((m) => m.date))).sort();
    const lastDate = dates[dates.length - 1];
    const weekAgo = dates[Math.max(0, dates.length - 8)];

    const brandMap = new Map<string, { current: number[]; prev: number[] }>();
    metrics.forEach((m) => {
      if (!brandMap.has(m.brandName)) brandMap.set(m.brandName, { current: [], prev: [] });
      const entry = brandMap.get(m.brandName)!;
      if (m.date === lastDate) entry.current.push(m.avgRank || 0);
      if (m.date === weekAgo) entry.prev.push(m.avgRank || 0);
    });

    return Array.from(brandMap.entries())
      .map(([name, data]) => {
        const avgCurrent = data.current.length ? data.current.reduce((a, b) => a + b, 0) / data.current.length : 0;
        const avgPrev = data.prev.length ? data.prev.reduce((a, b) => a + b, 0) / data.prev.length : 0;
        return {
          name,
          rank: avgCurrent,
          change: avgPrev - avgCurrent,
        };
      })
      .sort((a, b) => a.rank - b.rank);
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
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Ranking</h1>
        <p className="text-sm text-muted-foreground mt-1">Average ordinal position in AI response lists</p>
      </div>

      <Card className="p-5">
        <div className="space-y-1">
          {rankings.map((brand, i) => {
            const isTarget = brand.name === "AcmeCloud";
            const medalColors = ["bg-yellow-500/20 text-yellow-400", "bg-gray-400/20 text-gray-300", "bg-amber-600/20 text-amber-500"];
            return (
              <div
                key={brand.name}
                className={`flex items-center gap-4 p-3 rounded-md transition-colors ${isTarget ? "bg-primary/5 border border-primary/20" : ""}`}
                data-testid={`row-ranking-${i}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? medalColors[i] : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
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
    </div>
  );
}
