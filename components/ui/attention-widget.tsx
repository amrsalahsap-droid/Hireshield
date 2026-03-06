import React from "react";
import Link from "next/link";
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  Mic,
  CheckCircle,
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AttentionItem {
  id: string;
  type: "pending_evaluation" | "awaiting_transcript" | "awaiting_interview";
  title: string;
  description: string;
  count: number;
  href: string;
  priority: "high" | "medium" | "low";
}

interface AttentionWidgetProps {
  items: AttentionItem[];
  className?: string;
}

const TYPE_CONFIG = {
  pending_evaluation: {
    icon: AlertTriangle,
    color: "text-risk-high",
    bgColor: "bg-risk-high-bg/10 border-risk-high-bg/30",
    hoverBg: "hover:bg-risk-high-bg/20"
  },
  awaiting_transcript: {
    icon: Mic,
    color: "text-warning", 
    bgColor: "bg-warning/10 border-warning/30",
    hoverBg: "hover:bg-warning/20"
  },
  awaiting_interview: {
    icon: Clock,
    color: "text-investigate",
    bgColor: "bg-investigate/10 border-investigate/30", 
    hoverBg: "hover:bg-investigate/20"
  }
};

const PRIORITY_ORDER = {
  high: 0,
  medium: 1, 
  low: 2
};

export function AttentionWidget({ items, className }: AttentionWidgetProps) {
  // Sort by priority, then by count (descending)
  const sortedItems = [...items].sort((a, b) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.count - a.count;
  });

  if (items.length === 0) {
    return (
      <div className={cn("bg-card shadow-card rounded-xl border border-border p-6", className)}>
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-medium text-foreground font-display">Attention Required</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground font-body text-sm">All caught up! No items require attention.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card shadow-card rounded-xl border border-border p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-risk-high" />
        <h3 className="text-lg font-medium text-foreground font-display">Attention Required</h3>
        <span className="bg-risk-high-bg/20 text-risk-high text-xs font-semibold px-2 py-1 rounded-full font-body">
          {items.reduce((sum, item) => sum + item.count, 0)} items
        </span>
      </div>

      <div className="space-y-3">
        {sortedItems.map((item) => {
          const config = TYPE_CONFIG[item.type];
          const IconComponent = config.icon;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-colors",
                config.bgColor,
                config.hoverBg,
                "group"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bgColor)}>
                  <IconComponent className={cn("w-5 h-5", config.color)} />
                </div>
                <div>
                  <p className="font-medium text-foreground font-body text-sm group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-muted-foreground font-body text-xs mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={cn("font-bold font-display text-lg", config.color)}>
                  {item.count}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground font-body">
          Priority items are shown first. Click any item to take action.
        </p>
      </div>
    </div>
  );
}
