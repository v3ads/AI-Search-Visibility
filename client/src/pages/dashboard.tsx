import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard, ScoreGauge } from "@/components/metric-card";
import { useMetrics, useProject, useCompetitors } from "@/hooks/use-project-data";
import { Eye, PieChart, Trophy, SmilePlus } from "lucide-react";
import { MODEL_COLORS } from "@/lib/constants";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DailyMetric } from "@shared/schema";

function getLatestMetrics(metrics: DailyMetric[], brandName: string) {
  const latest = metrics.filter((m) => m.brandName === brandName);
  if (latest.length === 0) return null;

  const dates = Array.from(new Set(latest.map((m) => m.date))).sort();
  const lastDate = dates[dates.length - 1];
  const weekAgoIdx = Math.max(0, dates.length - 8);
  const weekAgoDate = dates[weekAgoIdx];

  const current = latest.filter((m) => m.date === lastDate);
  const previous = latest.filter((m) => m.date === weekAgoDate);

  const avg = (arr: DailyMetric[], key: keyof DailyMetric) => {
    const vals = arr.map((m) => Number(m[key]) || 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  return {
    visibility: avg(current, "visibilityPct"),
    visibilityPrev: avg(previous, "visibilityPct"),
    sov: avg(current, "sovPct"),
    sovPrev: avg(previous, "sovPct"),
    rank: avg(current, "avgRank"),
    rankPrev: avg(previous, "avgRank"),
    sentiment: avg(current, "sentimentScore"),
    sentimentPrev: avg(previous, "sentimentScore"),
    brandStrength: avg(current, "brandStrength"),
    brandStrengthPrev: avg(previous, "brandStrength"),
  };
}

function LeaderboardCard({ metrics }: { metrics: DailyMetric[] }) {
  const brands = useMemo(() => {
    const dates = Array.from(new Set(metrics.map((m) => m.date))).sort();
    const lastDate = dates[dates.length - 1];
    const latest = metrics.filter((m) => m.date === lastDate);

    const brandMap = new Map<string, number[]>();
    latest.forEach((m) => {
      const arr = brandMap.get(m.brandName) || [];
      arr.push(m.brandStrength || 0);
      brandMap.set(m.brandName, arr);
    });

    return Array.from(brandMap.entries())
      .map(([name, scores]) => ({
        name,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => b.score - a.score);
  }, [metrics]);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-4">AI Brand Leaderboard</h3>
      <div className="space-y-2">
        {brands.map((brand, i) => (
          <div key={brand.name} className="flex items-center gap-3" data-testid={`row-leaderboard-${i}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </span>
            <span className={`flex-1 text-sm ${brand.name === "AcmeCloud" ? "font-semibold" : ""}`}>{brand.name}</span>
            <span className="font-mono text-sm font-medium">{brand.score}</span>
            <div className="w-20 h-1.5 bg-muted rounded-full">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${brand.score}%`,
                  backgroundColor: brand.name === "AcmeCloud" ? "#22c55e" : "hsl(var(--muted-foreground))",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ModelPerformanceCards({ metrics }: { metrics: DailyMetric[] }) {
  const models = useMemo(() => {
    const dates = Array.from(new Set(metrics.map((m) => m.date))).sort();
    const lastDate = dates[dates.length - 1];
    const acmeLatest = metrics.filter((m) => m.brandName === "AcmeCloud" && m.date === lastDate);

    return acmeLatest.map((m) => ({
      model: m.model,
      visibility: m.visibilityPct || 0,
      sov: m.sovPct || 0,
      sentiment: m.sentimentScore || 0,
    }));
  }, [metrics]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
      {models.map((m) => (
        <Card key={m.model} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MODEL_COLORS[m.model] || "#22c55e" }} />
            <span className="text-xs font-medium truncate">{m.model}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Visibility</span>
              <span className="font-mono font-medium">{m.visibility.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">SoV</span>
              <span className="font-mono font-medium">{m.sov.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sentiment</span>
              <span className="font-mono font-medium">{m.sentiment.toFixed(0)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BrandStrengthChart({ metrics }: { metrics: DailyMetric[] }) {
  const chartData = useMemo(() => {
    const acmeMetrics = metrics.filter((m) => m.brandName === "AcmeCloud");
    const dateMap = new Map<string, number[]>();
    acmeMetrics.forEach((m) => {
      const arr = dateMap.get(m.date) || [];
      arr.push(m.brandStrength || 0);
      dateMap.set(m.date, arr);
    });
    return Array.from(dateMap.entries())
      .map(([date, scores]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [metrics]);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-1">AI Brand Strength Trend</h3>
      <p className="text-xs text-muted-foreground mb-4">Composite score over 30 days</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="brandStrengthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={30} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} fill="url(#brandStrengthGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default function Dashboard() {
  const { data: project, isLoading: projectLoading } = useProject();
  const { data: metrics, isLoading: metricsLoading } = useMetrics();

  if (projectLoading || metricsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project || !metrics) return null;

  const latest = getLatestMetrics(metrics, project.brandName);
  if (!latest) return null;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoring <span className="text-foreground font-medium">{project.brandName}</span> across 5 AI models
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 md:col-span-1 flex flex-col items-center justify-center">
          <ScoreGauge score={latest.brandStrength} label="Brand Strength" />
          <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${latest.brandStrength > latest.brandStrengthPrev ? "text-green-400" : "text-red-400"}`}>
            <span>{latest.brandStrength > latest.brandStrengthPrev ? "+" : ""}{(latest.brandStrength - latest.brandStrengthPrev).toFixed(1)}</span>
          </div>
        </Card>
        <MetricCard
          title="AI Visibility"
          value={`${latest.visibility.toFixed(1)}%`}
          change={latest.visibility - latest.visibilityPrev}
          icon={<Eye className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Share of Voice"
          value={`${latest.sov.toFixed(1)}%`}
          change={latest.sov - latest.sovPrev}
          icon={<PieChart className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Avg. Ranking"
          value={`#${latest.rank.toFixed(1)}`}
          change={-(latest.rank - latest.rankPrev)}
          icon={<Trophy className="w-4 h-4 text-primary" />}
        />
        <MetricCard
          title="Sentiment"
          value={latest.sentiment.toFixed(0)}
          change={latest.sentiment - latest.sentimentPrev}
          icon={<SmilePlus className="w-4 h-4 text-primary" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BrandStrengthChart metrics={metrics} />
        <LeaderboardCard metrics={metrics} />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Per-Model Performance</h3>
        <ModelPerformanceCards metrics={metrics} />
      </div>
    </div>
  );
}
