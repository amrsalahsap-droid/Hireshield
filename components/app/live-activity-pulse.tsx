"use client";

import React, { useState, useEffect } from "react";
import { Activity, Wifi, WifiOff, Users, AlertTriangle, UserPlus, CheckCircle } from "lucide-react";

interface LiveActivityPulseProps {
  isLive: boolean;
  lastUpdate: Date | null;
  activityCount?: number;
  className?: string;
}

export function LiveActivityPulse({ 
  isLive, 
  lastUpdate, 
  activityCount = 0, 
  className = "" 
}: LiveActivityPulseProps) {
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  useEffect(() => {
    if (isLive) {
      // Trigger pulse animation when live status changes
      setPulseAnimation(true);
      const timer = setTimeout(() => setPulseAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLive]);

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getActivityIcon = (activity: string) => {
    if (activity.includes("evaluated")) return <CheckCircle className="w-3 h-3 text-green-500" />;
    if (activity.includes("added")) return <UserPlus className="w-3 h-3 text-blue-500" />;
    if (activity.includes("risk")) return <AlertTriangle className="w-3 h-3 text-orange-500" />;
    return <Activity className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Live Status Indicator */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isLive ? "bg-green-500" : "bg-gray-400"
          }`} />
          {isLive && (
            <div className={`absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping ${
              pulseAnimation ? "animate-pulse" : ""
            }`} />
          )}
        </div>
        <span className={`text-xs font-medium ${
          isLive ? "text-green-600" : "text-gray-500"
        }`}>
          {isLive ? "Live" : "Offline"}
        </span>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-1">
        {isLive ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-gray-400" />
        )}
        <span className="text-xs text-muted-foreground">
          {isLive ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Activity Count */}
      {activityCount > 0 && (
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {activityCount} active
          </span>
        </div>
      )}

      {/* Last Update */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">
          Updated {formatLastUpdate(lastUpdate)}
        </span>
      </div>

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1">
            {recentActivity.slice(0, 3).map((activity, index) => (
              <div key={index} className="flex items-center gap-1">
                {getActivityIcon(activity)}
              </div>
            ))}
            {recentActivity.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{recentActivity.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for live activity monitoring
export function useLiveActivity(pollInterval = 30000) {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  const checkForActivity = async () => {
    try {
      const response = await fetch("/api/activity/live", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLive(true);
        setLastUpdate(new Date(data.timestamp));
        setActivityCount(data.activityCount || 0);
        
        // Update recent activity if new events detected
        if (data.recentEvents && data.recentEvents.length > 0) {
          setRecentActivity(prev => {
            const newEvents = data.recentEvents.map((event: any) => event.description);
            const combined = [...newEvents, ...prev].slice(0, 10);
            return combined;
          });
        }
      } else {
        setIsLive(false);
      }
    } catch (error) {
      console.error("Live activity check failed:", error);
      setIsLive(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkForActivity();

    // Set up polling
    const interval = setInterval(checkForActivity, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return {
    isLive,
    lastUpdate,
    activityCount,
    recentActivity,
    checkForActivity,
  };
}
