import React from "react";
import { ShieldAlert, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskData {
  low: number;
  medium: number;
  high: number;
}

interface RiskDistributionProps {
  data: RiskData;
  className?: string;
}

export function RiskDistribution({ data, className }: RiskDistributionProps) {
  const total = data.low + data.medium + data.high;
  
  if (total === 0) {
    return (
      <div className={cn("bg-card shadow-card rounded-card border border-border p-card", className)}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-section text-foreground font-display">Risk Distribution</h3>
        </div>
        <div className="text-center py-8">
          <ShieldAlert className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-body-size text-muted-foreground font-body text-center">No candidate risk data available</p>
          <p className="text-meta text-muted-foreground font-body text-center mt-2">Complete evaluations to see risk distribution</p>
        </div>
      </div>
    );
  }

  // Calculate percentages
  const lowPercent = Math.round((data.low / total) * 100);
  const mediumPercent = Math.round((data.medium / total) * 100);
  const highPercent = Math.round((data.high / total) * 100);

  // Create donut segments
  const createDonutSegments = () => {
    const segments: Array<{
      path: string;
      color: string;
      name: string;
      value: number;
      percentage: number;
    }> = [];
    let currentAngle = -90; // Start from top
    
    const colors = [
      { name: 'low', color: 'rgb(34, 197, 94)' }, // green-500
      { name: 'medium', color: 'rgb(251, 146, 60)' }, // amber-400
      { name: 'high', color: 'rgb(239, 68, 68)' }, // red-500
    ];
    
    const values = [data.low, data.medium, data.high];
    
    colors.forEach((color, index) => {
      const value = values[index];
      if (value === 0) return;
      
      const percentage = (value / total) * 100;
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const x1 = 87.5 + 56 * Math.cos((startAngle * Math.PI) / 180);
      const y1 = 87.5 + 56 * Math.sin((startAngle * Math.PI) / 180);
      const x2 = 87.5 + 56 * Math.cos((endAngle * Math.PI) / 180);
      const y2 = 87.5 + 56 * Math.sin((endAngle * Math.PI) / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = [
        `M 87.5 87.5`,
        `L ${x1} ${y1}`,
        `A 56 56 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      segments.push({
        path: pathData,
        color: color.color,
        name: color.name,
        value,
        percentage
      });
      
      currentAngle = endAngle;
    });
    
    return segments;
  };

  const segments = createDonutSegments();

  const riskItems = [
    { level: 'Low', count: data.low, percent: lowPercent, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { level: 'Medium', count: data.medium, percent: mediumPercent, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
    { level: 'High', count: data.high, percent: highPercent, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  ];

  // Determine overall risk assessment
  let riskAssessment = 'Low Risk';
  let riskColor = 'text-green-500';
  let riskBgColor = 'bg-green-500/10';
  if (highPercent > 40) {
    riskAssessment = 'High Risk';
    riskColor = 'text-red-500';
    riskBgColor = 'bg-red-500/10';
  } else if (highPercent > 20 || mediumPercent > 50) {
    riskAssessment = 'Medium Risk';
    riskColor = 'text-amber-400';
    riskBgColor = 'bg-amber-400/10';
  }

  return (
    <div className={cn("bg-card shadow-card rounded-card border border-border p-card", className)}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-section text-foreground font-display">Risk Distribution</h3>
        <span className={cn("text-xs font-semibold px-2 py-1 rounded-full font-display", riskColor, riskBgColor)}>
          {riskAssessment}
        </span>
      </div>

      {/* Main Content: Chart + Legend */}
      <div className="flex items-center gap-2 mb-6">
        {/* Donut Chart - Left */}
        <div className="relative flex-shrink-0">
          <svg width="175" height="175" className="transform -rotate-90">
            {segments.map((segment, index) => (
              <path
                key={segment.name}
                d={segment.path}
                fill={segment.color}
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
            {/* Inner circle for donut effect */}
            <circle cx="87.5" cy="87.5" r="37.5" fill="hsl(var(--card))" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-metric text-foreground font-display">{total}</p>
              <p className="text-meta text-muted-foreground font-body">candidates</p>
            </div>
          </div>
        </div>

        {/* Legend - Right */}
        <div className="flex-1 flex flex-col justify-center space-y-3 -ml-4">
          {riskItems.map((item) => (
            <div key={item.level} className="flex items-center" style={{ gridTemplateColumns: '16px 1fr auto' }}>
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", item.bgColor, "border-2", item.color.replace('text', 'border'))} />
                <span className="text-card text-foreground font-body">{item.level}</span>
              </div>
              <div className="text-right ml-8">
                <span className="text-card text-foreground font-display">{item.count}</span>
                <span className="text-meta text-muted-foreground font-body ml-1">({item.percent}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary - Below */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-body-size text-muted-foreground font-body">Overall hiring quality</span>
          </div>
          <span className={cn("font-medium font-body", riskColor)}>
            {riskAssessment}
          </span>
        </div>
      </div>
    </div>
  );
}
