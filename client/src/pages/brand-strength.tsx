import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreGauge } from "@/components/metric-card";
import { useMetrics } from "@/hooks/use-project-data";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const BRAND_LINE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function BrandStrength() {
  const { data: metrics, isLoading } = useMetrics();
  const [selectedBrands, setSelectedBrands] = useState<string[]>(["AcmeCloud", "AWS", "Google Cloud"]);

  const allBrands = useMemo(() => {
    if (!metrics) return [];
    const seen = new Set<string>();
    return metrics.filter((m) => {
      if (seen.has(m.brandName)) return false;
      seen.add(m.brandName);
      return true;
    }).map((m) => m.brandName);
  }, [metrics]);

  const chartData = useMemo(() => {
    if (!metrics) return [];
    const selectedSet = new Set(selectedBrands);
    const dateMap = new Map<string, Record<string, number>>();

    metrics.forEach((m) => {
      if (!selectedSet.has(m.brandName)) return;
      if (!dateMap.has(m.date)) dateMap.set(m.date, {});
      const obj = dateMap.get(m.date)!;
      if (!obj[m.brandName]) obj[m.brandName] = 0;
      obj[`${m.brandName}_count`] = (obj[`${m.brandName}_count`] || 0) + 1;
      obj[m.brandName] += m.brandStrength || 0;
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => {
        const entry: Record<string, any> = {
          date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
        selectedBrands.forEach((brand) => {
          const count = data[`${brand}_count`] || 1;
          entry[brand] = Math.round((data[brand] || 0) / count * 10) / 10;
        });
        return entry;
      });
  }, [metrics, selectedBrands]);

  const latestScores = useMemo(() => {
    if (!metrics) return [];
    const dateSet = new Set<string>();
    metrics.forEach((m) => dateSet.add(m.date));
    const dates = Array.from(dateSet).sort();
    const lastDate = dates[dates.length - 1];

    const brandMap = new Map<string, number[]>();
    metrics.filter((m) => m.date === lastDate).forEach((m) => {
      if (!brandMap.has(m.brandName)) brandMap.set(m.brandName, []);
      brandMap.get(m.brandName)!.push(m.brandStrength || 0);
    });

    return Array.from(brandMap.entries())
      .map(([name, scores]) => ({
        name,
        score: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.score - a.score);
  }, [metrics]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

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
        <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Brand Strength</h1>
        <p className="text-sm text-muted-foreground mt-1">Composite score: Visibility (30%) + SoV (25%) + Ranking (25%) + Sentiment (20%)</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {latestScores.slice(0, 6).map((b) => (
          <Card key={b.name} className="p-4 flex flex-col items-center">
            <ScoreGauge score={b.score} label={b.name} size="sm" />
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-1 mb-4 flex-wrap">
          <h3 className="text-sm font-semibold">Strength Comparison</h3>
          <div className="flex gap-2 flex-wrap">
            {allBrands.map((brand) => (
              <button
                key={brand}
                onClick={() => toggleBrand(brand)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${selectedBrands.includes(brand) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                data-testid={`button-toggle-brand-${brand.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            {selectedBrands.map((brand, i) => (
              <Line key={brand} type="monotone" dataKey={brand} stroke={BRAND_LINE_COLORS[i % BRAND_LINE_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
