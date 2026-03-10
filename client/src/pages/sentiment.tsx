import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreGauge } from "@/components/metric-card";
import { useMetrics } from "@/hooks/use-project-data";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AlertTriangle } from "lucide-react";

const CATEGORIES = ["Product Quality", "Ease of Use", "Pricing", "Support", "Security"];

export default function Sentiment() {
  const { data: metrics, isLoading } = useMetrics();

  const sentimentData = useMemo(() => {
    if (!metrics) return { overall: 0, change: 0, radarData: [], riskAlerts: [] };

    const dates = Array.from(new Set(metrics.map((m) => m.date))).sort();
    const lastDate = dates[dates.length - 1];
    const weekAgo = dates[Math.max(0, dates.length - 8)];

    const acmeCurrent = metrics.filter((m) => m.brandName === "AcmeCloud" && m.date === lastDate);
    const acmePrev = metrics.filter((m) => m.brandName === "AcmeCloud" && m.date === weekAgo);

    const avg = (arr: typeof acmeCurrent) => arr.length ? arr.reduce((a, b) => a + (b.sentimentScore || 0), 0) / arr.length : 0;

    const overall = avg(acmeCurrent);
    const change = overall - avg(acmePrev);

    const radarData = CATEGORIES.map((cat, i) => {
      const base = overall + (i - 2) * 5 + Math.random() * 10 - 5;
      const awsBase = 68 + (i - 2) * 3 + Math.random() * 8 - 4;
      return {
        category: cat,
        AcmeCloud: Math.min(100, Math.max(0, Math.round(base))),
        AWS: Math.min(100, Math.max(0, Math.round(awsBase))),
      };
    });

    const riskAlerts: { brand: string; rank: number; sentiment: number }[] = [];
    const brands = Array.from(new Set(metrics.map((m) => m.brandName)));
    brands.forEach((brand) => {
      const current = metrics.filter((m) => m.brandName === brand && m.date === lastDate);
      const avgRank = current.length ? current.reduce((a, b) => a + (b.avgRank || 0), 0) / current.length : 10;
      const avgSent = current.length ? current.reduce((a, b) => a + (b.sentimentScore || 0), 0) / current.length : 50;
      if (avgRank <= 3 && avgSent < 50) {
        riskAlerts.push({ brand, rank: avgRank, sentiment: avgSent });
      }
    });

    return { overall, change, radarData, riskAlerts };
  }, [metrics]);

  const trendData = useMemo(() => {
    if (!metrics) return [];
    const acme = metrics.filter((m) => m.brandName === "AcmeCloud");
    const dateMap = new Map<string, number[]>();
    acme.forEach((m) => {
      if (!dateMap.has(m.date)) dateMap.set(m.date, []);
      dateMap.get(m.date)!.push(m.sentimentScore || 0);
    });
    return Array.from(dateMap.entries()).map(([date, scores]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sentiment: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
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
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Sentiment Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Emotional tone of AI-generated language about your brand</p>
      </div>

      {sentimentData.riskAlerts.length > 0 && (
        <Card className="p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Risk Alert: High Ranking + Negative Sentiment</p>
              {sentimentData.riskAlerts.map((a) => (
                <p key={a.brand} className="text-xs text-muted-foreground mt-1">
                  {a.brand} is ranked #{a.rank.toFixed(1)} but has a sentiment score of {a.sentiment.toFixed(0)}/100
                </p>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col items-center justify-center">
          <ScoreGauge score={sentimentData.overall} label="Overall Sentiment" />
          <p className={`text-xs font-medium mt-2 ${sentimentData.change >= 0 ? "text-green-400" : "text-red-400"}`}>
            {sentimentData.change >= 0 ? "+" : ""}{sentimentData.change.toFixed(1)} vs last week
          </p>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Sentiment by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={sentimentData.radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Radar name="AcmeCloud" dataKey="AcmeCloud" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="AWS" dataKey="AWS" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-1">Sentiment Trend</h3>
        <p className="text-xs text-muted-foreground mb-4">30-day sentiment score average</p>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
            <Line type="monotone" dataKey="sentiment" stroke="#22c55e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
