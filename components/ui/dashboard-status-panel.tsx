import React from "react";
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface StatusItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

interface DashboardStatusPanelProps {
  highRiskCount: number;
  pendingCount: number;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DashboardStatusPanel({ 
  highRiskCount, 
  pendingCount, 
  lastUpdated, 
  onRefresh, 
  isRefreshing 
}: DashboardStatusPanelProps) {
  // Determine overall status
  const getOverallStatus = () => {
    if (highRiskCount > 0) {
      return {
        icon: <AlertTriangle className="w-5 h-5" />,
        title: "Critical Issues",
        color: "bg-red-50 border-red-200 text-red-700",
        iconColor: "text-red-500",
        state: "critical" as const,
        statusLevel: "high-risk" as const
      };
    }
    if (pendingCount > 0) {
      return {
        icon: <Clock className="w-5 h-5" />,
        title: "Attention Required", 
        color: "bg-amber-50 border-amber-200 text-amber-700",
        iconColor: "text-amber-500",
        state: "warning" as const,
        statusLevel: "medium-risk" as const
      };
    }
    return {
      icon: <CheckCircle className="w-5 h-5" />,
      title: "All Systems Healthy",
      color: "bg-green-50 border-green-200 text-green-700",
      iconColor: "text-green-500", 
      state: "healthy" as const,
      statusLevel: "healthy" as const
    };
  };

  const status = getOverallStatus();

  const statusItems: StatusItem[] = [
    {
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      label: "High Risk",
      value: `${highRiskCount} candidate${highRiskCount === 1 ? '' : 's'}`,
      color: highRiskCount > 0 ? "text-red-600" : "text-muted-foreground"
    },
    {
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      label: "Pending", 
      value: `${pendingCount} evaluation${pendingCount === 1 ? '' : 's'}`,
      color: pendingCount > 0 ? "text-amber-600" : "text-muted-foreground"
    }
  ];

  const formatDataFreshness = (lastUpdated: string) => {
    const now = Date.now();
    const updated = new Date(lastUpdated).getTime();
    const diff = now - updated;
    const mins = Math.floor(diff / 60_000);
    
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  return (
    <div className={`rounded-card border p-6 ${status.color} transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className={`${status.iconColor} p-2 rounded-full bg-background flex-shrink-0`}>
            {status.icon}
          </div>
          
          {/* Title and Message */}
          <div className="flex flex-col gap-4">
            <h3 className="text-section text-foreground font-display font-semibold">
              {status.title}
            </h3>
            <p className="text-body-size text-muted-foreground font-body">
              Last updated: {formatDataFreshness(lastUpdated)}
            </p>
          </div>
        </div>
        
        {/* Status Badge and Refresh */}
        <div className="flex items-center gap-3">
          <StatusBadge status={status.statusLevel} />
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-background/80 hover:bg-background border border-border rounded-button transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Click to refresh data"
          >
            <AlertCircle className={`w-4 h-4 text-muted-foreground group-hover:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium font-body">
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
        </div>
      </div>

      {/* Status Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {statusItems.map((item, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
            <div className="flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body uppercase tracking-wide">
                {item.label}
              </p>
              <p className={`text-card text-foreground font-display font-semibold ${item.color}`}>
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* State Indicator Bar */}
      <div className={`mt-4 h-1 rounded-full ${status.state === 'critical' ? 'bg-red-500' : status.state === 'warning' ? 'bg-amber-500' : 'bg-green-500'}`} />
    </div>
  );
}
