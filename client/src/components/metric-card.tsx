import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, change, subtitle, icon }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-1">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold font-mono tracking-tight" data-testid={`text-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          )}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-2 rounded-md bg-primary/10">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface ScoreCardProps {
  score: number;
  label: string;
  size?: "sm" | "lg";
}

export function ScoreGauge({ score, label, size = "lg" }: ScoreCardProps) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const dim = size === "lg" ? 120 : 80;
  const strokeWidth = size === "lg" ? 8 : 6;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <circle
            cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke={color}
            strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference - progress}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold font-mono ${size === "lg" ? "text-3xl" : "text-lg"}`} style={{ color }}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}
