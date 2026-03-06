import React from "react";
import Link from "next/link";
import { 
  FileText, 
  Mic, 
  CheckCircle, 
  UserPlus, 
  Clock,
  MoreHorizontal,
  ShieldAlert
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityFeedItem } from "@/lib/server/activity";

interface ActivityTimelineProps {
  items: ActivityFeedItem[];
  isLoading?: boolean;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  JOB_JD_ANALYZE_COMPLETED: FileText,
  JOB_INTERVIEW_KIT_COMPLETED: Mic,
  CANDIDATE_EVALUATED: CheckCircle,
  CANDIDATE_ADDED: UserPlus,
  HIGH_RISK_ALERT: ShieldAlert,
};

const ACTION_COLORS: Record<string, string> = {
  JOB_JD_ANALYZE_COMPLETED: "text-blue-500",
  JOB_INTERVIEW_KIT_COMPLETED: "text-purple-500", 
  CANDIDATE_EVALUATED: "text-green-500",
  CANDIDATE_ADDED: "text-blue-500",
  HIGH_RISK_ALERT: "text-red-500",
};

const ACTION_BG_COLORS: Record<string, string> = {
  JOB_JD_ANALYZE_COMPLETED: "bg-blue-100 border-blue-200",
  JOB_INTERVIEW_KIT_COMPLETED: "bg-purple-100 border-purple-200", 
  CANDIDATE_EVALUATED: "bg-green-100 border-green-500",
  CANDIDATE_ADDED: "bg-blue-100 border-blue-200",
  HIGH_RISK_ALERT: "bg-red-100 border-red-200",
};

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(isoString).toLocaleDateString();
}

export function ActivityTimeline({ items, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No recent activity yet"
        description="Start creating jobs, adding candidates, and running evaluations to see activity here."
        size="sm"
      />
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
      
      <div className="space-y-6">
        {items.map((item, index) => {
          const IconComponent = ACTION_ICONS[item.action] || MoreHorizontal;
          const iconColor = ACTION_COLORS[item.action] || "text-muted-foreground";
          const bgBorderColor = ACTION_BG_COLORS[item.action] || "bg-muted border-border";
          
          return (
            <div key={item.id} className="flex gap-4 relative">
              {/* Timeline dot */}
              <div className="relative z-10">
                <div className={`w-8 h-8 rounded-full ${bgBorderColor} border-2 flex items-center justify-center ${iconColor}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pb-6">
                {/* Event description */}
                <div className="mb-1">
                  <p className="text-card text-foreground font-body">{item.label}</p>
                </div>
                
                {/* Entity details */}
                {item.entityLabel && (
                  <div className="mb-2">
                    <Link
                      href={item.href}
                      className="text-body-size text-primary hover:text-primary/80 transition-colors"
                    >
                      {item.entityLabel}
                    </Link>
                  </div>
                )}
                
                {/* Timestamp */}
                <div className="flex items-center gap-1 text-meta text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span title={new Date(item.createdAt).toLocaleString()}>
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
