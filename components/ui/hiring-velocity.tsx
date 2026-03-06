import React from "react";
import { Clock, TrendingUp, Calendar, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface VelocityMetric {
  label: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}

interface HiringVelocityProps {
  metrics: VelocityMetric[];
  className?: string;
}

export function HiringVelocity({ metrics, className }: HiringVelocityProps) {
  return (
    <div className={cn("bg-card shadow-card rounded-xl border border-border p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-foreground font-display">Hiring Velocity</h3>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          
          return (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground font-body text-sm">
                    {metric.label}
                  </p>
                  <p className="text-muted-foreground font-body text-xs mt-1">
                    {metric.description}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xl font-bold text-foreground font-display">
                  {metric.value}
                </div>
                {metric.trend && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium mt-1",
                    metric.trend === "up" ? "text-green-600" : 
                    metric.trend === "down" ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {metric.trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {metric.trend === "down" && <TrendingUp className="w-3 h-3 rotate-180" />}
                    {metric.trend === "neutral" && <div className="w-3 h-3 rounded-full bg-current" />}
                    <span>
                      {metric.trend === "up" ? "Faster" : 
                       metric.trend === "down" ? "Slower" : "Stable"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground font-body">Average processing time</span>
          </div>
          <span className="text-muted-foreground font-body">
            Based on recent evaluations
          </span>
        </div>
      </div>
    </div>
  );
}
