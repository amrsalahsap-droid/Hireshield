"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, TrendingUp, TrendingDown, Brain, Target, Clock, ChevronRight, Info } from "lucide-react";

interface InsightCardProps {
  type: "risk" | "opportunity" | "trend" | "warning" | "info";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  data?: {
    metric?: string;
    value?: number | string;
    threshold?: number;
    actual?: number;
    trend?: "up" | "down" | "neutral";
  };
  actions?: Array<{
    label: string;
    href: string;
    variant?: "primary" | "secondary";
  }>;
  timeAgo?: string;
  isDismissible?: boolean;
  onDismiss?: () => void;
}

export function InsightCard({ 
  type, 
  title, 
  description, 
  severity, 
  data, 
  actions, 
  timeAgo, 
  isDismissible = false, 
  onDismiss 
}: InsightCardProps) {
  const getInsightIcon = () => {
    switch (type) {
      case "risk":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "opportunity":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "trend":
        return <Brain className="w-5 h-5 text-blue-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-purple-500" />;
      default:
        return <Target className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case "high":
        return "border-l-red-500 bg-red-50/50";
      case "medium":
        return "border-l-yellow-500 bg-yellow-50/50";
      case "low":
        return "border-l-blue-500 bg-blue-50/50";
      default:
        return "border-l-gray-500 bg-gray-50/50";
    }
  };

  const getSeverityBadge = () => {
    const variants = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200"
    };
    return variants[severity];
  };

  const getTrendIcon = (trend?: "up" | "down" | "neutral") => {
    if (!trend) return null;
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <div className={`border-l-4 border border-border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getSeverityColor()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
            {getInsightIcon()}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground font-display text-sm mb-1">
              {title}
            </h4>
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${getSeverityBadge()}`}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)} {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              {timeAgo && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </span>
              )}
            </div>
          </div>
        </div>
        {isDismissible && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground font-body mb-3 leading-relaxed">
        {description}
      </p>

      {/* Data Display */}
      {data && (
        <div className="bg-white/50 rounded-lg p-3 mb-3 border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{data.metric}</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground font-display">
                  {data.value}
                </span>
                {data.threshold && (
                  <span className="text-xs text-muted-foreground">
                    (threshold: {data.threshold})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(data.trend)}
              {data.actual !== undefined && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="text-sm font-medium text-foreground">{data.actual}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex gap-2">
            {actions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  action.variant === "primary"
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {action.label}
                <ChevronRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
