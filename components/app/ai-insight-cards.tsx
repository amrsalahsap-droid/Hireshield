"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Brain, Lightbulb, Target, AlertTriangle, Users, Briefcase, Clock, ChevronRight } from "lucide-react";

// Simple Badge component to avoid import issues
const Badge = ({ 
  children, 
  variant = "outline",
  className = "" 
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  className?: string;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Simple Button component to avoid import issues
const Button = ({ 
  children, 
  className = "", 
  variant = "default", 
  size = "default",
  asChild = false,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline" | "destructive";
  size?: "default" | "sm";
  asChild?: boolean;
  [key: string]: any;
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3 text-sm"
  };
  
  if (asChild) {
    return <>{props.children}</>;
  }
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface AIInsight {
  id: string;
  type: "opportunity" | "risk" | "trend" | "recommendation";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  confidence: number; // 0-100
  data?: {
    value?: string | number;
    change?: number;
    trend?: "up" | "down" | "neutral";
  };
  actions?: Array<{
    label: string;
    href: string;
    variant?: "default" | "outline";
  }>;
  timeAgo?: string;
}

interface AIInsightCardsProps {
  insights: AIInsight[];
  maxItems?: number;
}

export function AIInsightCards({ insights, maxItems = 3 }: AIInsightCardsProps) {
  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "opportunity":
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case "risk":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "trend":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "recommendation":
        return <Brain className="w-5 h-5 text-purple-500" />;
      default:
        return <Target className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getImpactBadge = (impact: AIInsight["impact"]) => {
    const variants = {
      high: { variant: "destructive" as const, label: "High Impact" },
      medium: { variant: "outline" as const, label: "Medium Impact" },
      low: { variant: "outline" as const, label: "Low Impact" }
    };
    const config = variants[impact];
    return {
      variant: config.variant,
      children: config.label
    };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const displayInsights = insights.slice(0, maxItems);

  if (displayInsights.length === 0) {
    return (
      <div className="text-center py-8">
        <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground font-display mb-2">
          No AI Insights Available
        </h3>
        <p className="text-muted-foreground font-body">
          AI insights will appear here once there's enough data to analyze.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayInsights.map((insight) => (
        <div
          key={insight.id}
          className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200 hover:border-primary/50"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center">
                {getInsightIcon(insight.type)}
              </div>
              <div>
                <h4 className="font-semibold text-foreground font-display mb-1">
                  {insight.title}
                </h4>
                <div className="flex items-center gap-2">
                  <Badge {...getImpactBadge(insight.impact)} />
                  <span className={`text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                    {insight.confidence}% confidence
                  </span>
                  {insight.timeAgo && (
                    <span className="text-xs text-muted-foreground">
                      {insight.timeAgo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground font-body mb-4 leading-relaxed">
            {insight.description}
          </p>

          {/* Data Display */}
          {insight.data && (
            <div className="bg-muted/30 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {insight.data.trend && getTrendIcon(insight.data.trend)}
                  <span className="text-2xl font-bold text-foreground font-display">
                    {insight.data.value}
                  </span>
                  {insight.data.change && (
                    <span className={`text-sm font-medium ${
                      insight.data.change > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {insight.data.change > 0 ? "+" : ""}{insight.data.change}%
                    </span>
                  )}
                </div>
                {insight.data.trend && (
                  <span className="text-xs text-muted-foreground">
                    vs last period
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {insight.actions && insight.actions.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {insight.actions.slice(0, 2).map((action, index) => (
                  <Button
                    key={index}
                    asChild
                    variant={action.variant || "outline"}
                    size="sm"
                    className="cursor-pointer"
                  >
                    <Link href={action.href} className="flex items-center gap-1">
                      {action.label}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </Button>
                ))}
              </div>
              {insight.actions.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{insight.actions.length - 2} more actions
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
