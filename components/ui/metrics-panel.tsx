import React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

interface MetricItem {
  title: string;
  value: string;
  context?: string;
  subtitle?: string;
  trend?: {
    trend: 'up' | 'down' | 'neutral';
    change: number;
  };
  metricTrend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
    color: string;
  };
  additionalInfo?: string;
  href?: string;
  accent?: string;
}

interface MetricsPanelProps {
  title: string;
  metrics: MetricItem[];
  className?: string;
}

export function MetricsPanel({ title, metrics, className = "" }: MetricsPanelProps) {
  return (
    <div className={`rounded-card border border-border bg-card p-6 ${className}`}>
      {/* Panel Title */}
      <div className="mb-6">
        <h2 className="text-section text-foreground font-display font-semibold">
          {title}
        </h2>
        <div className="h-0.5 bg-border rounded-full mt-2"></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {metrics.map(({ title, value, context, subtitle, trend, metricTrend, additionalInfo, href, accent }, index) => {
          const inner = (
            <Link
              href={href || "#"}
              className={`block rounded-card border p-card h-full flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-primary/50 ${accent || 'border-border'}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-card text-muted-foreground font-body">{title}</p>
                  <Tooltip content={title || "No description available"}>
                    <div className="w-3 h-3 text-muted-foreground cursor-help flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      </svg>
                    </div>
                  </Tooltip>
                </div>
                {trend && (
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 text-muted-foreground/70 flex items-center justify-center">
                      {trend.trend === "up" && <TrendingUp className="w-4 h-4 text-red-500" />}
                      {trend.trend === "down" && <TrendingDown className="w-4 h-4 text-green-500" />}
                      {trend.trend === "neutral" && <Minus className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <span className={`text-xs font-medium font-body ${
                      trend.trend === "up" ? "text-red-500" :
                      trend.trend === "down" ? "text-green-500" :
                      "text-muted-foreground"
                    }`}>
                      {Math.abs(trend.change)}
                    </span>
                  </div>
                )}
              </div>

              {/* Main Value */}
              <div className="flex items-baseline gap-2 my-2">
                <Tooltip content={title || "Click for details"}>
                  <p className="text-metric text-foreground font-display leading-none cursor-help">{value}</p>
                </Tooltip>
                {metricTrend && (
                  <div className="flex items-center gap-1">
                    {metricTrend.direction === "up" && <TrendingUp className={`w-4 h-4 ${metricTrend.color}`} />}
                    {metricTrend.direction === "down" && <TrendingDown className={`w-4 h-4 ${metricTrend.color}`} />}
                    {metricTrend.direction === "neutral" && <Minus className={`w-4 h-4 ${metricTrend.color}`} />}
                    <span className={`text-xs font-medium font-body ${metricTrend.color}`}>
                      {metricTrend.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Context Section */}
              <div className="space-y-1">
                {context && (
                  <p className="text-body-size text-muted-foreground font-body">{context}</p>
                )}
                {subtitle && (
                  <p className="text-body-size text-muted-foreground font-body">{subtitle}</p>
                )}
                {additionalInfo && (
                  <p className="text-body-size text-muted-foreground font-body">{additionalInfo}</p>
                )}
              </div>
            </Link>
          );

          return (
            <div key={index}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
