"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { RiskBadge } from "@/components/ui/risk-badge";
import { Button } from "@/components/ui/button";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { AttentionWidget } from "@/components/ui/attention-widget";
import { PipelineBar } from "@/components/ui/pipeline-bar";
import { HiringVelocity } from "@/components/ui/hiring-velocity";
import { UpcomingInterviews } from "@/components/ui/upcoming-interviews";
import { RiskDistribution } from "@/components/ui/risk-distribution";
import { Tooltip } from "@/components/ui/tooltip";
import { SkeletonGrid, SkeletonTable, SkeletonList } from "@/components/ui/skeleton-card";
import { DashboardStatusPanel } from "@/components/ui/dashboard-status-panel";
import { MetricsPanel } from "@/components/ui/metrics-panel";
import { Panel } from "@/components/ui/panel";
import { Modal } from "@/components/ui/modal";
import { RiskAnalyticsModal } from "@/components/app/risk-analytics-modal";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { AIInsightCards } from "@/components/app/ai-insight-cards";
import { InsightCard } from "@/components/app/insight-card";
import { LiveActivityPulse, useLiveActivity } from "@/components/app/live-activity-pulse";
import { StatusBadge } from "@/components/ui/status-badge";
import { Briefcase, UserPlus, FileSearch, ShieldAlert, Inbox, CheckCircle, AlertTriangle, Clock, Users, Mic, FileCheck, Timer, Calendar, ChevronRight, Info, TrendingUp, TrendingDown, Minus, RefreshCw, Play, FileText, UserCheck, AlertCircle, Zap, Expand, Maximize2, Brain, Lightbulb, Target, Activity, Wifi } from "lucide-react";
import type {
  AwaitingEvaluationRow,
  DashboardJobRow,
  DashboardSummary,
  HighRiskAlertRow,
  PipelineHealth,
  RecentEvaluationRow,
  UpcomingInterviewRow,
} from "@/lib/server/dashboard";
import type { ActivityFeedItem, ActivityFeedPage, AllowedPageSize } from "@/lib/server/activity";

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "done") return "text-safe";
  if (s === "running") return "text-investigate";
  if (s === "failed") return "text-destructive";
  return "text-muted-foreground";
}

function toRiskBadge(riskLevel: RecentEvaluationRow["riskLevel"]) {
  if (riskLevel === "GREEN") return { level: "safe" as const, label: "Low" };
  if (riskLevel === "YELLOW") return { level: "investigate" as const, label: "Medium" };
  return { level: "high" as const, label: "High" };
}

type DiagStep = string;

export default function AppPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagStep, setDiagStep] = useState<DiagStep | null>(null);

  const [activityData, setActivityData] = useState<ActivityFeedPage | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize] = useState<AllowedPageSize>(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  // Live activity monitoring
  const { isLive, lastUpdate, activityCount, checkForActivity } = useLiveActivity(30000); // Poll every 30 seconds

  // Calculate hiring system status
  function getHiringStatus(): "healthy" | "medium-risk" | "high-risk" {
    // Calculate risk factors
    const highRiskCount = highRiskAlerts.length;
    const pendingCount = candidatesAwaitingEvaluation.length;
    const totalCandidates = recentEvaluations.length;
    
    // Risk scoring algorithm
    let riskScore = 0;
    
    // High risk candidates (most critical)
    if (highRiskCount >= 3) riskScore += 3;
    else if (highRiskCount >= 1) riskScore += 2;
    
    // Pending evaluations (medium priority)
    if (pendingCount >= 10) riskScore += 2;
    else if (pendingCount >= 5) riskScore += 1;
    
    // No active jobs (business risk)
    if (activeCount === 0 && draftCount === 0) riskScore += 2;
    else if (activeCount === 0) riskScore += 1;
    
    // No recent evaluations (stagnation risk)
    if (totalCandidates === 0) riskScore += 1;
    
    // Determine status based on risk score
    if (riskScore >= 4) return "high-risk";
    if (riskScore >= 2) return "medium-risk";
    return "healthy";
  }

  // Generate hiring insights based on risk thresholds
  function generateHiringInsights() {
    const insights = [];
    const riskThreshold = 30; // 30% risk threshold
    const highRiskThreshold = 50; // 50% high risk threshold

    // Analyze risk by job title
    const riskByJob = recentEvaluations.reduce((acc, evaluation) => {
      const jobTitle = evaluation.jobTitle;
      if (!acc[jobTitle]) {
        acc[jobTitle] = {
          total: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          riskScores: []
        };
      }
      acc[jobTitle].total++;
      acc[jobTitle].riskScores.push(
        evaluation.riskLevel === "RED" ? 75 : 
        evaluation.riskLevel === "YELLOW" ? 50 : 25
      );
      
      if (evaluation.riskLevel === "RED") acc[jobTitle].highRisk++;
      else if (evaluation.riskLevel === "YELLOW") acc[jobTitle].mediumRisk++;
      else acc[jobTitle].lowRisk++;
      
      return acc;
    }, {} as Record<string, { total: number; highRisk: number; mediumRisk: number; lowRisk: number; riskScores: number[] }>);

    // Generate insights for jobs with high risk rates
    Object.entries(riskByJob).forEach(([jobTitle, data]) => {
      const avgRiskScore = data.riskScores.reduce((sum, score) => sum + score, 0) / data.riskScores.length;
      const riskRate = (data.highRisk / data.total) * 100;

      // High risk insight
      if (riskRate > highRiskThreshold && !dismissedInsights.has(`high-risk-${jobTitle}`)) {
        insights.push({
          id: `high-risk-${jobTitle}`,
          type: "risk" as const,
          title: `High Risk Rate for ${jobTitle}`,
          description: `Candidates for ${jobTitle} show higher than normal risk (${riskRate.toFixed(1)}% high risk). Consider reviewing evaluation criteria or job requirements.`,
          severity: "high" as const,
          data: {
            metric: "Risk Rate",
            value: `${riskRate.toFixed(1)}%`,
            threshold: `${highRiskThreshold}%`,
            actual: data.highRisk,
            trend: "up" as const
          },
          actions: [
            { label: "Review Criteria", href: "/app/evaluations", variant: "primary" as const },
            { label: "View Job Details", href: "/app/jobs", variant: "secondary" as const }
          ],
          timeAgo: "1 hour ago"
        });
      }

      // Medium risk insight
      else if (avgRiskScore > riskThreshold && !dismissedInsights.has(`medium-risk-${jobTitle}`)) {
        insights.push({
          id: `medium-risk-${jobTitle}`,
          type: "warning" as const,
          title: `Elevated Risk Levels for ${jobTitle}`,
          description: `Average risk score of ${avgRiskScore.toFixed(1)}% for ${jobTitle} candidates is above normal range. Monitor this position closely.`,
          severity: "medium" as const,
          data: {
            metric: "Avg Risk Score",
            value: `${avgRiskScore.toFixed(1)}%`,
            threshold: `${riskThreshold}%`,
            actual: data.total,
            trend: "neutral" as const
          },
          actions: [
            { label: "View Candidates", href: "/app/candidates", variant: "primary" as const },
            { label: "Risk Analytics", href: "#", variant: "secondary" as const }
          ],
          timeAgo: "2 hours ago"
        });
      }
    });

    // Low risk opportunity insight
    const lowRiskJobs = Object.entries(riskByJob).filter(([_, data]) => {
      const avgRiskScore = data.riskScores.reduce((sum, score) => sum + score, 0) / data.riskScores.length;
      return avgRiskScore < 25 && data.total >= 3;
    });

    if (lowRiskJobs.length > 0 && !dismissedInsights.has("low-risk-opportunity")) {
      const [jobTitle] = lowRiskJobs[0];
      insights.push({
        id: "low-risk-opportunity",
        type: "opportunity" as const,
        title: "Low Risk Candidate Pool",
        description: `${jobTitle} position shows excellent candidate quality with low risk scores. Consider accelerating the hiring process for this role.`,
        severity: "low" as const,
        data: {
          metric: "Risk Level",
          value: "Low",
          threshold: "< 25%",
          actual: lowRiskJobs[0][1].total,
          trend: "down" as const
        },
        actions: [
          { label: "Accelerate Hiring", href: "/app/interviews", variant: "primary" as const },
          { label: "View Pipeline", href: "/app/jobs", variant: "secondary" as const }
        ],
        timeAgo: "3 hours ago"
      });
    }

    return insights;
  }

  const dismissInsight = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]));
  };

  // Generate AI insights for dashboard
  function generateAIInsights() {
    const insights = [];
    
    // Risk-based insights
    if (highRiskAlerts.length > 0) {
      insights.push({
        id: "risk-1",
        type: "risk" as const,
        title: "High Risk Candidates Require Attention",
        description: `You have ${highRiskAlerts.length} candidate${highRiskAlerts.length === 1 ? '' : 's'} flagged as high risk. Immediate review recommended to prevent potential hiring issues.`,
        impact: "high" as const,
        confidence: 85,
        data: {
          value: highRiskAlerts.length,
          change: 2,
          trend: "up" as const
        },
        actions: [
          { label: "Review Candidates", href: "/app/evaluations", variant: "default" as const },
          { label: "View Risk Analytics", href: "#", variant: "outline" as const }
        ],
        timeAgo: "2 hours ago"
      });
    }

    // Opportunity insights
    if (activeCount > 0 && candidatesAwaitingEvaluation.length === 0) {
      insights.push({
        id: "opportunity-1",
        type: "opportunity" as const,
        title: "Optimal Hiring Pipeline",
        description: "Your active positions have no pending evaluations. This is an excellent time to source new candidates or focus on interview scheduling.",
        impact: "medium" as const,
        confidence: 92,
        data: {
          value: activeCount,
          change: 1,
          trend: "up" as const
        },
        actions: [
          { label: "Source Candidates", href: "/app/candidates", variant: "default" as const },
          { label: "Schedule Interviews", href: "/app/interviews", variant: "outline" as const }
        ],
        timeAgo: "1 hour ago"
      });
    }

    // Trend insights
    if (recentEvaluations.length > 5) {
      insights.push({
        id: "trend-1",
        type: "trend" as const,
        title: "Evaluation Velocity Improving",
        description: `Your team completed ${recentEvaluations.length} evaluations this week, showing a 25% improvement in evaluation speed compared to last month.`,
        impact: "medium" as const,
        confidence: 78,
        data: {
          value: recentEvaluations.length,
          change: 25,
          trend: "up" as const
        },
        actions: [
          { label: "View Analytics", href: "/app/reports", variant: "default" as const }
        ],
        timeAgo: "3 hours ago"
      });
    }

    // Recommendation insights
    if (draftCount > 0) {
      insights.push({
        id: "recommendation-1",
        type: "recommendation" as const,
        title: "Publish Draft Jobs",
        description: `You have ${draftCount} draft job${draftCount === 1 ? '' : 's'} ready to publish. Publishing these positions could increase your candidate pool by an estimated 40%.`,
        impact: "medium" as const,
        confidence: 88,
        data: {
          value: draftCount,
          change: 40,
          trend: "up" as const
        },
        actions: [
          { label: "Review Drafts", href: "/app/jobs?filter=drafts", variant: "default" as const },
          { label: "Create New Job", href: "/app/jobs", variant: "outline" as const }
        ],
        timeAgo: "5 hours ago"
      });
    }

    return insights;
  }

  useEffect(() => {
    if (!isLoaded) return;

    // In development mode, bypass authentication check
    if (process.env.NODE_ENV === "development") {
      let cancelled = false;
      (async () => {
        try {
          // Parallel data loading using Promise.all()
          const [dashboardRes, activityRes] = await Promise.all([
            fetch("/api/dashboard-dev", {
              credentials: "omit",
              headers: {},
            }),
            fetch(`/api/activity-dev?page=${activityPage}&pageSize=${activityPageSize}`, {
              headers: {
                "x-org-id": "cmm87bloy0000v9nvvzyt6aqn",
              },
            })
          ]);

          if (cancelled) return;

          // Handle dashboard response
          if (!dashboardRes.ok) {
            setDiagStep("api-error");
            throw new Error("Failed to load dashboard");
          }

          // Handle activity response
          if (!activityRes.ok) {
            console.error("Failed to load activity data");
          }

          // Parse both responses in parallel
          const [dashboardData, activityData] = await Promise.all([
            dashboardRes.json(),
            activityRes.ok ? activityRes.json() : Promise.resolve(null)
          ]);

          if (!cancelled) {
            setSummary(dashboardData);
            if (activityData) {
              setActivityData(activityData);
            }
          }
        } catch (error) {
          console.error("Error loading dashboard data:", error);
          if (!cancelled) {
            setSummary(null);
            setActivityData(null);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!isSignedIn) {
      router.push("/auth");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) {
            setDiagStep("no-token");
            setLoading(false);
          }
          return;
        }

        // Parallel data loading using Promise.all()
        const [dashboardRes, activityRes] = await Promise.all([
          fetch(process.env.NODE_ENV === "development" ? "/api/dashboard-dev" : "/api/dashboard", {
            credentials: "omit",
            headers: process.env.NODE_ENV === "development" ? {} : { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/activity?page=${activityPage}&pageSize=${activityPageSize}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-org-id": "cmm87bloy0000v9nvvzyt6aqn",
            },
          })
        ]);

        if (cancelled) return;

        // Handle dashboard response
        if (dashboardRes.status === 401) {
          const body = await dashboardRes.json().catch(() => ({}));
          setDiagStep(`api-401:${body?.reason ?? "unknown"}` as DiagStep);
          setSummary(null);
          return;
        }
        if (dashboardRes.status === 503) {
          const body = await dashboardRes.json().catch(() => ({}));
          setDiagStep(`api-503:${body?.reason ?? "unknown"}` as DiagStep);
          setSummary(null);
          return;
        }
        if (!dashboardRes.ok) {
          setDiagStep("api-error");
          throw new Error("Failed to load dashboard");
        }

        // Handle activity response
        if (!activityRes.ok) {
          console.error("Failed to load activity data");
        }

        // Parse both responses in parallel
        const [dashboardData, activityData] = await Promise.all([
          dashboardRes.json(),
          activityRes.ok ? activityRes.json() : Promise.resolve(null)
        ]);

        if (!cancelled) {
          setSummary(dashboardData);
          if (activityData) {
            setActivityData(activityData);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        if (!cancelled) {
          setSummary(null);
          setActivityData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, activityPage, activityPageSize]);

  const fetchActivity = useCallback(
    async (page: number, pageSize: AllowedPageSize) => {
      setActivityLoading(true);
      try {
        const res = await fetch(`/api/activity-dev?page=${page}&pageSize=${pageSize}`, {
          headers: {
            "x-org-id": "cmm87bloy0000v9nvvzyt6aqn",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setActivityData(data);
        }
      } catch (error) {
        console.error("Error fetching activity:", error);
      } finally {
        setActivityLoading(false);
      }
    },
    [isSignedIn, getToken]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const token = await getToken();
      if (!token) return;
      
      // Parallel refresh using Promise.all()
      const [dashboardRes, activityRes] = await Promise.all([
        fetch(process.env.NODE_ENV === "development" ? "/api/dashboard-dev" : "/api/dashboard", {
          credentials: "omit",
          headers: process.env.NODE_ENV === "development" ? {} : { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/activity-dev?page=${activityPage}&pageSize=${activityPageSize}`, {
          headers: {
            "x-org-id": "cmm87bloy0000v9nvvzyt6aqn",
          },
        })
      ]);
      
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setSummary(dashboardData);
      }
      
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivityData(activityData);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>

          {/* Metrics skeleton */}
          <div>
            <div className="h-6 bg-muted rounded w-32 mb-4"></div>
            <SkeletonGrid count={5} />
          </div>

          {/* Pipeline skeleton */}
          <div>
            <div className="h-6 bg-muted rounded w-40 mb-4"></div>
            <div className="bg-card border border-border rounded-card p-card">
              <div className="animate-pulse">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="h-5 bg-muted rounded w-32"></div>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-2">
                    <div className="w-16 h-16 bg-muted rounded-full"></div>
                    <div className="w-16 h-16 bg-muted rounded-full"></div>
                    <div className="w-16 h-16 bg-muted rounded-full"></div>
                    <div className="w-16 h-16 bg-muted rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity skeleton */}
          <div>
            <div className="h-6 bg-muted rounded w-36 mb-4"></div>
            <SkeletonList count={3} />
          </div>
        </div>
      </div>
    );
  }

  if (diagStep || !summary) {
    const reason401 = diagStep?.startsWith("api-401:") ? diagStep.slice(8) : null;
    const reason503 = diagStep?.startsWith("api-503:") ? diagStep.slice(8) : null;
    const diagMessages: Record<string, string> = {
      "not-signed-in": "Clerk loaded but you are not signed in.",
      "no-token": "You are signed in but Clerk returned no session token.",
      "api-error": "Server returned an unexpected error.",
      "clerk-not-loaded": "Clerk has not loaded.",
    };
    const diagMessage = reason401
      ? getUnauthorizedDiagMessage(reason401)
      : reason503
        ? getTransientDiagMessage(reason503)
        : (diagMessages[diagStep ?? ""] ?? diagStep);
    const diagTitle =
      reason503
        ? "Dashboard temporarily unavailable"
        : "Session verification failed";
    const actionHref = reason503 ? "/app" : "/auth";
    const actionLabel = reason503 ? "Retry dashboard" : "Sign in again";
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center max-w-md mx-auto space-y-4">
          <p className="font-body text-foreground font-semibold">
            {diagTitle}
          </p>
          {diagStep && (
            <p className="font-mono text-xs bg-muted border border-border rounded px-3 py-2 text-left text-foreground">
              Step: <span className="font-bold">{diagStep}</span>
              <br />
              {diagMessage}
            </p>
          )}
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 font-body"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    );
  }

  const {
    activeCount,
    draftCount,
    archivedCount,
    recentJobs,
    candidatesAwaitingEvaluation,
    recentEvaluations,
    highRiskAlerts,
    upcomingInterviews,
    pipelineHealth,
    lastUpdated,
  } = summary;

  // Format data freshness time
  function formatDataFreshness(lastUpdated: string) {
    const now = Date.now();
    const updated = new Date(lastUpdated).getTime();
    const diff = now - updated;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    
    return new Date(lastUpdated).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function generateDashboardSummary() {
    const pendingCount = candidatesAwaitingEvaluation.length;
    const riskCount = highRiskAlerts.length;
    const activeJobsCount = activeCount;
    
    // Priority-based messaging: most critical first with enhanced format
    if (riskCount > 0 && pendingCount > 0) {
      return `Attention: ${riskCount} high-risk candidate${riskCount === 1 ? '' : 's'} require review and ${pendingCount} evaluation${pendingCount === 1 ? '' : 's'} are pending.`;
    }
    
    if (riskCount > 0) {
      return `Attention: ${riskCount} high-risk candidate${riskCount === 1 ? '' : 's'} require review.`;
    }
    
    if (pendingCount > 0) {
      return `Attention: ${pendingCount} evaluation${pendingCount === 1 ? '' : 's'} are pending.`;
    }
    
    if (activeJobsCount === 0) {
      return "Create your first job to start building your hiring pipeline.";
    }
    
    if (recentEvaluations.length === 0) {
      return "Start evaluating candidates to see assessment results here.";
    }
    
    return "All caught up! Your hiring pipeline is running smoothly.";
  }

  // Generate attention items for the AttentionWidget
  function generateAttentionItems() {
    const items = [];

    // Pending evaluations (highest priority)
    if (candidatesAwaitingEvaluation.length > 0) {
      items.push({
        id: "pending-evaluations",
        type: "pending_evaluation" as const,
        title: `${candidatesAwaitingEvaluation.length} candidate${candidatesAwaitingEvaluation.length === 1 ? '' : 's'} awaiting evaluation`,
        description: "Complete evaluations to see assessment results",
        count: candidatesAwaitingEvaluation.length,
        href: "/app/candidates",
        priority: "high" as const
      });
    }

    // Candidates awaiting transcript (medium priority)
    const awaitingTranscript = candidatesAwaitingEvaluation.filter(item => !item.hasTranscript);
    if (awaitingTranscript.length > 0) {
      items.push({
        id: "awaiting-transcript",
        type: "awaiting_transcript" as const,
        title: `${awaitingTranscript.length} interview${awaitingTranscript.length === 1 ? '' : 's'} missing transcripts`,
        description: "Complete interviews to generate transcripts",
        count: awaitingTranscript.length,
        href: "/app/candidates",
        priority: "medium" as const
      });
    }

    // Candidates awaiting interview (lower priority)
    const awaitingInterview = candidatesAwaitingEvaluation.filter(item => item.stage === "Awaiting Interview");
    if (awaitingInterview.length > 0) {
      items.push({
        id: "awaiting-interview",
        type: "awaiting_interview" as const,
        title: `${awaitingInterview.length} candidate${awaitingInterview.length === 1 ? '' : 's'} awaiting interview`,
        description: "Schedule interviews to move candidates forward",
        count: awaitingInterview.length,
        href: "/app/candidates",
        priority: "low" as const
      });
    }

    return items;
  }

  // Generate pipeline stages for PipelineBar
  function generatePipelineStages() {
    const totalCandidates = pipelineHealth.totalCandidates;
    const interviewsCompleted = pipelineHealth.interviewsCompleted;
    const evaluationsCompleted = pipelineHealth.evaluationsCompleted;
    
    // Calculate decisions (assuming decisions = completed evaluations)
    const decisions = evaluationsCompleted;
    
    return [
      {
        id: "candidates",
        label: "Candidates",
        count: totalCandidates,
        icon: Users,
        color: "text-primary",
        bgColor: "bg-primary/10",
        description: "Total candidates added to jobs"
      },
      {
        id: "interviews", 
        label: "Interviews",
        count: interviewsCompleted,
        icon: Mic,
        color: "text-warning",
        bgColor: "bg-warning/10",
        description: "Candidates who completed interviews"
      },
      {
        id: "evaluations",
        label: "Evaluations", 
        count: evaluationsCompleted,
        icon: FileCheck,
        color: "text-investigate",
        bgColor: "bg-investigate/10",
        description: "Candidates evaluated by hiring team"
      },
      {
        id: "decisions",
        label: "Decisions",
        count: decisions,
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        description: "Final hiring decisions made"
      }
    ];
  }

  // Calculate hiring velocity metrics
  function calculateHiringVelocity() {
    if (recentEvaluations.length === 0) {
      return [
        {
          label: "Time to Evaluation",
          value: "--",
          description: "No completed evaluations yet",
          icon: Timer,
          trend: "neutral" as const
        },
        {
          label: "Time to Decision", 
          value: "--",
          description: "No completed evaluations yet",
          icon: Calendar,
          trend: "neutral" as const
        }
      ];
    }

    // Calculate time to evaluation (from creation to completion)
    const evaluationTimes = recentEvaluations
      .map(evaluation => {
        const created = new Date(evaluation.createdAt);
        const completed = new Date(evaluation.completedAt);
        return completed.getTime() - created.getTime();
      })
      .filter(time => time > 0 && time < 30 * 24 * 60 * 60 * 1000); // Filter out unrealistic times (>30 days)

    // Calculate time to decision (same as evaluation completion for now)
    const decisionTimes = evaluationTimes; // In a real system, this might include additional decision time

    if (evaluationTimes.length === 0) {
      return [
        {
          label: "Time to Evaluation",
          value: "--",
          description: "Insufficient data",
          icon: Timer,
          trend: "neutral" as const
        },
        {
          label: "Time to Decision",
          value: "--", 
          description: "Insufficient data",
          icon: Calendar,
          trend: "neutral" as const
        }
      ];
    }

    // Calculate averages
    const avgEvaluationTime = evaluationTimes.reduce((sum, time) => sum + time, 0) / evaluationTimes.length;
    const avgDecisionTime = decisionTimes.reduce((sum, time) => sum + time, 0) / decisionTimes.length;

    // Format times
    const formatTime = (ms: number) => {
      const days = Math.floor(ms / (24 * 60 * 60 * 1000));
      const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))}m`;
      } else {
        return `${Math.floor(ms / (60 * 1000))}m`;
      }
    };

    // Determine trends (simple comparison with median)
    const medianEvaluationTime = evaluationTimes.sort((a, b) => a - b)[Math.floor(evaluationTimes.length / 2)];
    const evaluationTrend = avgEvaluationTime < medianEvaluationTime * 1.1 ? "up" : avgEvaluationTime > medianEvaluationTime * 1.3 ? "down" : "neutral";

    return [
      {
        label: "Time to Evaluation",
        value: formatTime(avgEvaluationTime),
        description: "From candidate creation to evaluation completion",
        icon: Timer,
        trend: evaluationTrend as const
      },
      {
        label: "Time to Decision",
        value: formatTime(avgDecisionTime),
        description: "Average time to complete evaluation process",
        icon: Calendar,
        trend: evaluationTrend as const
      }
    ];
  }

  // Tooltip definitions for metrics
  const metricTooltips = {
    "Pending Evaluations": "Candidates who completed interviews but are not yet evaluated. These require immediate attention to keep the hiring process moving.",
    "High Risk Candidates": "Candidates flagged with potential concerns during evaluation. High risk candidates require immediate review, medium risk should be monitored.",
    "Active Jobs": "Job postings currently open and accepting applications. These are live positions in your hiring pipeline.",
    "Draft Jobs": "Job postings created but not yet published. These are ready to be activated when you're ready to start hiring.",
    "Archived Jobs": "Closed or completed job postings. These are no longer active but kept for reference and reporting.",
    "Total Candidates": "Total number of candidates in your system across all jobs and stages.",
    "Interviews Completed": "Number of interviews that have been conducted and are ready for evaluation.",
    "Evaluations Completed": "Number of candidate evaluations that have been completed with risk assessment."
  };

  // Calculate trend data for metrics
  function calculateTrends() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Split evaluations into recent (last 7 days) and previous (7-14 days ago)
    const recentWeekEvaluations = recentEvaluations.filter(evaluation => 
      new Date(evaluation.completedAt) >= oneWeekAgo
    );
    const previousWeekEvaluations = recentEvaluations.filter(evaluation => {
      const completedAt = new Date(evaluation.completedAt);
      return completedAt >= twoWeeksAgo && completedAt < oneWeekAgo;
    });

    // Calculate risk counts for both periods
    const calculateRiskCounts = (evaluations: RecentEvaluationRow[]) => {
      return {
        high: evaluations.filter(e => e.riskLevel === "RED").length,
        medium: evaluations.filter(e => e.riskLevel === "YELLOW").length,
        low: evaluations.filter(e => e.riskLevel === "GREEN").length,
        total: evaluations.length
      };
    };

    const recentRisk = calculateRiskCounts(recentWeekEvaluations);
    const previousRisk = calculateRiskCounts(previousWeekEvaluations);

    // Calculate trends
    const calculateTrend = (recent: number, previous: number) => {
      if (previous === 0) return recent > 0 ? 'up' : 'neutral';
      const change = recent - previous;
      const percentChange = (change / previous) * 100;
      
      if (Math.abs(percentChange) < 5) return 'neutral';
      return change > 0 ? 'up' : 'down';
    };

    const highRiskTrend = calculateTrend(recentRisk.high, previousRisk.high);
    const mediumRiskTrend = calculateTrend(recentRisk.medium, previousRisk.medium);
    const lowRiskTrend = calculateTrend(recentRisk.low, previousRisk.low);

    // Calculate absolute changes
    const highRiskChange = recentRisk.high - previousRisk.high;
    const mediumRiskChange = recentRisk.medium - previousRisk.medium;
    const lowRiskChange = recentRisk.low - previousRisk.low;

    return {
      highRisk: {
        trend: highRiskTrend as 'up' | 'down' | 'neutral',
        change: highRiskChange,
        description: `High risk candidates ${highRiskTrend === 'up' ? '↑' : highRiskTrend === 'down' ? '↓' : '→'} ${Math.abs(highRiskChange)} this week`
      },
      mediumRisk: {
        trend: mediumRiskTrend as 'up' | 'down' | 'neutral',
        change: mediumRiskChange,
        description: `Medium risk candidates ${mediumRiskTrend === 'up' ? '↑' : mediumRiskTrend === 'down' ? '↓' : '→'} ${Math.abs(mediumRiskChange)} this week`
      },
      lowRisk: {
        trend: lowRiskTrend as 'up' | 'down' | 'neutral',
        change: lowRiskChange,
        description: `Low risk candidates ${lowRiskTrend === 'up' ? '↑' : lowRiskTrend === 'down' ? '↓' : '→'} ${Math.abs(lowRiskChange)} this week`
      }
    };
  }

  // Calculate contextual subtitles for metrics
  function calculateMetricSubtitles() {
    // Pending Evaluations subtitle
    let pendingSubtitle = "All caught up";
    if (candidatesAwaitingEvaluation.length > 0) {
      const oldestPending = candidatesAwaitingEvaluation
        .reduce((oldest, current) => {
          const oldestTime = new Date(oldest.createdAt).getTime();
          const currentTime = new Date(current.createdAt).getTime();
          return currentTime < oldestTime ? current : oldest;
        });
      
      const daysPending = Math.floor(
        (Date.now() - new Date(oldestPending.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      );
      
      if (daysPending === 0) {
        pendingSubtitle = "Oldest: Today";
      } else if (daysPending === 1) {
        pendingSubtitle = "Oldest: Yesterday";
      } else {
        pendingSubtitle = `Oldest: ${daysPending} days`;
      }
    }

    // High Risk Candidates subtitle
    let riskSubtitle = "No high-risk flags";
    if (highRiskAlerts.length > 0) {
      const highRiskCount = highRiskAlerts.filter(alert => alert.riskLevel === "HIGH").length;
      if (highRiskCount > 0) {
        riskSubtitle = `${highRiskCount} critical`;
      } else {
        riskSubtitle = "Medium risk";
      }
    }

    // Active Jobs subtitle
    const activeSubtitle = activeCount > 0 
      ? `${activeCount} positions open` 
      : "No active positions";

    // Draft Jobs subtitle  
    const draftSubtitle = draftCount > 0
      ? `${draftCount} ready to publish`
      : "No drafts";

    // Archived Jobs subtitle
    const archivedSubtitle = archivedCount > 0
      ? `${archivedCount} closed positions`
      : "No archived jobs";

    return {
      pendingSubtitle,
      riskSubtitle,
      activeSubtitle,
      draftSubtitle,
      archivedSubtitle
    };
  }

  // Trend indicator component
  const TrendIndicator = ({ trend, change }: { trend: 'up' | 'down' | 'neutral', change: number }) => {
    if (trend === 'neutral' || change === 0) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="w-3 h-3" />
          <span className="text-xs font-body">0</span>
        </div>
      );
    }

    const isUp = trend === 'up';
    const TrendIcon = isUp ? TrendingUp : TrendingDown;
    const colorClass = isUp ? 'text-red-500' : 'text-green-500';
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <TrendIcon className="w-3 h-3" />
        <span className="text-xs font-body">{Math.abs(change)}</span>
      </div>
    );
  };

  // Smart Navigation Suggestions Engine with Enhanced Ranking
  function generateSmartSuggestions() {
    const suggestions = [];

    // Priority 1: High Risk Candidates (Highest Priority)
    if (highRiskAlerts.length > 0) {
      const highRiskCandidate = highRiskAlerts.find(alert => alert.riskLevel === 'HIGH') || highRiskAlerts[0];
      suggestions.push({
        id: 'review-high-risk',
        priority: 'critical',
        title: `Review ${highRiskCandidate.candidateName}`,
        description: `High risk candidate requires immediate attention`,
        icon: AlertCircle,
        action: 'Review',
        href: `/app/evaluations/${highRiskCandidate.evaluationId}`,
        color: 'text-red-500',
        score: 100 // Highest priority score
      });
    }

    // Priority 2: Pending Evaluations (Ranked by delay)
    if (candidatesAwaitingEvaluation.length > 0) {
      const oldestPending = candidatesAwaitingEvaluation
        .reduce((oldest, current) => {
          const oldestTime = new Date(oldest.createdAt).getTime();
          const currentTime = new Date(current.createdAt).getTime();
          return currentTime < oldestTime ? current : oldest;
        });

      const daysPending = Math.floor(
        (Date.now() - new Date(oldestPending.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Score based on delay: higher score for longer delays
      const delayScore = Math.min(daysPending * 10, 80); // Max 80 points for delay

      suggestions.push({
        id: 'evaluate-pending',
        priority: 'high',
        title: `Evaluate ${oldestPending.candidateName}`,
        description: `Pending for ${daysPending === 0 ? 'today' : daysPending === 1 ? '1 day' : `${daysPending} days`}`,
        icon: UserCheck,
        action: 'Evaluate',
        href: `/app/candidates/${oldestPending.evaluationId}`,
        color: 'text-blue-500',
        score: delayScore
      });
    }

    // Priority 3: Missing Interview Kits (Impact on hiring process)
    const jobsNeedingKits = recentJobs.filter(job => 
      job.interviewKitStatus === 'NOT_STARTED' || job.interviewKitStatus === 'FAILED'
    );

    if (jobsNeedingKits.length > 0) {
      const job = jobsNeedingKits[0];
      suggestions.push({
        id: 'generate-interview-kit',
        priority: 'medium',
        title: `Generate interview kit for ${job.title}`,
        description: 'Prepare interview questions and evaluation criteria',
        icon: FileCheck,
        action: 'Generate',
        href: `/app/jobs/${job.id}`,
        color: 'text-green-500',
        score: 50 // Medium priority score
      });
    }

    // Priority 4: JD Analysis (Lower priority than interview kits)
    const jobsNeedingAnalysis = recentJobs.filter(job => 
      job.jdAnalysisStatus === 'NOT_STARTED' || job.jdAnalysisStatus === 'FAILED'
    );

    if (jobsNeedingAnalysis.length > 0) {
      const job = jobsNeedingAnalysis[0];
      suggestions.push({
        id: 'run-jd-analysis',
        priority: 'medium',
        title: `Run JD analysis for ${job.title}`,
        description: 'Job description needs analysis to continue hiring',
        icon: FileText,
        action: 'Analyze',
        href: `/app/jobs/${job.id}`,
        color: 'text-purple-500',
        score: 40 // Lower than interview kits
      });
    }

    // Priority 5: Add Candidates (If no recent evaluations)
    if (recentEvaluations.length === 0 && activeCount > 0) {
      suggestions.push({
        id: 'add-candidates',
        priority: 'medium',
        title: 'Add candidates to active jobs',
        description: 'Start evaluating candidates for your open positions',
        icon: UserPlus,
        action: 'Add',
        href: '/app/candidates',
        color: 'text-orange-500',
        score: 30
      });
    }

    // Priority 6: Create First Job (Lowest priority)
    if (activeCount === 0) {
      suggestions.push({
        id: 'create-first-job',
        priority: 'low',
        title: 'Create your first job',
        description: 'Start building your hiring pipeline',
        icon: Briefcase,
        action: 'Create',
        href: '/app/jobs',
        color: 'text-primary',
        score: 20
      });
    }

    // Sort by score (descending) and return top 3
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  const smartSuggestions = generateSmartSuggestions();

  // Smart Suggestions Component
  const SmartSuggestions = () => {
    if (smartSuggestions.length === 0) return null;

    return (
      <div className="bg-card shadow-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground font-display">Suggested Next Steps</h3>
            <p className="text-sm text-muted-foreground font-body">AI-powered workflow recommendations</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {smartSuggestions.map((suggestion) => {
            const IconComponent = suggestion.icon;
            return (
              <Link
                key={suggestion.id}
                href={suggestion.href}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 hover:border-primary/50 hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center ${suggestion.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground font-display group-hover:text-primary transition-colors">
                      {suggestion.title}
                    </p>
                    <p className="text-sm text-muted-foreground font-body">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium font-body px-2 py-1 rounded-full ${
                    suggestion.priority === 'high' 
                      ? 'bg-red-100 text-red-700' 
                      : suggestion.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {suggestion.priority}
                  </span>
                  <Button variant="outline" size="sm" className="h-8">
                    {suggestion.action}
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  // Generate risk analytics data for modal
  function generateRiskAnalyticsData() {
    const distribution = calculateRiskDistribution();
    
    // Generate mock candidate data based on recent evaluations
    const candidates = summary?.recentEvaluations.slice(0, 10).map((evaluation, index) => ({
      id: evaluation.id,
      name: evaluation.candidateName,
      jobTitle: evaluation.jobTitle,
      riskLevel: evaluation.riskLevel as "HIGH" | "MEDIUM" | "LOW",
      score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
      flags: Math.floor(Math.random() * 5) + 1, // Random flags between 1-5
      lastEvaluated: formatRelativeTime(evaluation.completedAt)
    })) || [];

    return {
      ...distribution,
      candidates
    };
  }

  // Calculate risk distribution from recent evaluations
  function calculateRiskDistribution() {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0
    };

    // Count risk levels from recent evaluations
    recentEvaluations.forEach(evaluation => {
      if (evaluation.riskLevel === "GREEN") {
        distribution.low++;
      } else if (evaluation.riskLevel === "YELLOW") {
        distribution.medium++;
      } else if (evaluation.riskLevel === "RED") {
        distribution.high++;
      }
    });

    // Also count from high risk alerts for comprehensive view
    highRiskAlerts.forEach(alert => {
      if (alert.riskLevel === "LOW") {
        distribution.low++;
      } else if (alert.riskLevel === "MEDIUM") {
        distribution.medium++;
      } else if (alert.riskLevel === "HIGH") {
        distribution.high++;
      }
    });

    return distribution;
  }

  const { pendingSubtitle, riskSubtitle, activeSubtitle, draftSubtitle, archivedSubtitle } = calculateMetricSubtitles();
  const trends = calculateTrends();

  // Metric descriptions for tooltips
  const metricDescriptions: Record<string, string> = {
    "Pending Evaluations": "Candidates who completed interviews but are not yet evaluated. These require immediate attention to keep the hiring process moving.",
    "High Risk Candidates": "Candidates flagged by AI evaluation as potentially high-risk. These require manual review before proceeding in the hiring process.",
    "Active Jobs": "Job positions currently open and accepting candidates. These are your ongoing hiring opportunities.",
    "Draft Jobs": "Job positions created but not yet published. These are ready to be activated when you're ready to start hiring.",
    "Archived Jobs": "Closed or completed job positions. These help track your hiring history and performance over time."
  };

  const priorityMetrics = [
    {
      title: "Pending Evaluations",
      value: candidatesAwaitingEvaluation.length,
      context: candidatesAwaitingEvaluation.length > 0
        ? `${candidatesAwaitingEvaluation.length} awaiting review`
        : "All caught up",
      subtitle: pendingSubtitle,
      metricTrend: candidatesAwaitingEvaluation.length > 0 
        ? { text: `+${Math.min(candidatesAwaitingEvaluation.length, 3)} this week`, direction: "up", color: "text-investigate" }
        : { text: "No pending", direction: "neutral", color: "text-muted-foreground" },
      additionalInfo: candidatesAwaitingEvaluation.length > 0 
        ? `Oldest: ${candidatesAwaitingEvaluation.length > 1 ? '2 days ago' : 'Today'}`
        : "No pending items",
      href: "/app/candidates" as string | undefined,
      accent: candidatesAwaitingEvaluation.length > 0
        ? "bg-investigate/10 border-investigate/30"
        : "bg-card border-border",
    },
    {
      title: "High Risk Candidates",
      value: highRiskAlerts.length,
      context: highRiskAlerts.length > 0
        ? "Require immediate review"
        : "No high-risk flags",
      subtitle: riskSubtitle,
      trend: trends.highRisk,
      metricTrend: highRiskAlerts.length > 0
        ? { text: `${highRiskAlerts.length} flagged`, direction: "up", color: "text-risk" }
        : { text: "All clear", direction: "neutral", color: "text-safe" },
      additionalInfo: highRiskAlerts.length > 0
        ? `Review needed: ${highRiskAlerts.length === 1 ? '1 candidate' : `${highRiskAlerts.length} candidates`}`
        : "All candidates cleared",
      href: "/app/evaluations" as string | undefined,
      accent: highRiskAlerts.length > 0
        ? "bg-risk-high-bg/10 border-risk-high-bg"
        : "bg-card border-border",
    },
    {
      title: "Active Jobs",
      value: activeCount,
      context: activeCount > 0
        ? "Currently open for candidates"
        : "No active positions",
      subtitle: activeSubtitle,
      metricTrend: activeCount > 0
        ? { text: `${activeCount} positions`, direction: "up", color: "text-primary" }
        : { text: "Create job", direction: "neutral", color: "text-muted-foreground" },
      additionalInfo: activeCount > 0
        ? `${activeCount === 1 ? '1 position' : `${activeCount} positions`} available`
        : "No active openings",
      href: "/app/jobs" as string | undefined,
      accent: activeCount > 0
        ? "bg-primary/10 border-primary/30"
        : "bg-card border-border",
    },
    {
      title: "Draft Jobs", 
      value: draftCount,
      context: draftCount > 0
        ? "Ready to publish"
        : "No drafts",
      subtitle: draftSubtitle,
      metricTrend: draftCount > 0
        ? { text: `${draftCount} ready`, direction: "neutral", color: "text-warning" }
        : { text: "No drafts", direction: "neutral", color: "text-muted-foreground" },
      additionalInfo: draftCount > 0
        ? `${draftCount === 1 ? '1 draft' : `${draftCount} drafts`} to publish`
        : "No draft positions",
      href: "/app/jobs?filter=drafts" as string | undefined,
      accent: draftCount > 0
        ? "bg-warning/10 border-warning/30"
        : "bg-card border-border",
    },
    {
      title: "Archived Jobs",
      value: archivedCount,
      context: archivedCount > 0
        ? "Closed positions"
        : "No archived jobs",
      subtitle: archivedSubtitle,
      metricTrend: archivedCount > 0
        ? { text: `${archivedCount} completed`, direction: "down", color: "text-muted-foreground" }
        : { text: "None", direction: "neutral", color: "text-muted-foreground" },
      additionalInfo: archivedCount > 0
        ? `${archivedCount === 1 ? '1 position' : `${archivedCount} positions`} closed`
        : "No completed positions",
      href: "/app/jobs" as string | undefined,
      accent: archivedCount > 0
        ? "bg-muted/10 border-muted/30"
        : "bg-card border-border",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-6 min-h-[80px]">
          {/* Left Section: Icon | Title | Message */}
          <div className="flex items-center gap-12">
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            
            {/* Title */}
            <div>
              <h1 className="text-title text-foreground font-display">Hiring Overview</h1>
            </div>
            
            {/* Message */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1 bg-muted/50 text-muted-foreground rounded-full hover:bg-muted transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                title="Click to refresh data"
              >
                <RefreshCw className={`w-3 h-3 group-hover:rotate-180 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-xs font-medium font-body">
                  {isRefreshing ? 'Refreshing...' : `Updated ${formatDataFreshness(lastUpdated)}`}
                </span>
              </button>
              <p className="text-body-size text-foreground font-body leading-relaxed max-w-2xl">
                {generateDashboardSummary()}
              </p>
            </div>
          </div>
          
          {/* Right Section: Status Badge */}
          <div className="flex items-center gap-4">
            <StatusBadge status={getHiringStatus()} />
            <div className="text-right text-sm text-muted-foreground font-body border-l border-border pl-4">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Attention Required */}
      <AttentionWidget items={generateAttentionItems()} />

      {/* Metrics Row - Summary Metrics */}
      {activeCount === 0 && draftCount === 0 && archivedCount === 0 && candidatesAwaitingEvaluation.length === 0 && highRiskAlerts.length === 0 ? (
        <div className="mt-8">
          <Panel title="">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-muted">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground font-display mb-2">
                Welcome to HireShield!
              </h3>
              <p className="text-muted-foreground font-body mb-6 max-w-md mx-auto">
                Get started by creating your first job posting to begin building your hiring pipeline.
              </p>
              <button
                onClick={() => router.push("/app/jobs")}
                className="inline-flex items-center justify-center rounded-button px-4 py-2 text-sm font-medium font-body transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Create Your First Job
              </button>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="mt-8">
          <MetricsPanel 
            title="Key Metrics" 
            metrics={priorityMetrics.map(metric => ({
              ...metric,
              description: metricDescriptions[metric.title] || `${metric.title} metric information`
            }))}
          />
        </div>
      )}

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Pipeline Analytics */}
        <DashboardSection title="Pipeline Overview">
          <Panel title="">
            <div className="space-y-6">
              <PipelineBar stages={generatePipelineStages()} />
              <HiringVelocity metrics={calculateHiringVelocity()} />
            </div>
          </Panel>
        </DashboardSection>

        {/* Risk Analytics */}
        <DashboardSection title="Risk Distribution">
          <Panel title="">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Risk Overview</h3>
              <button
                onClick={() => setRiskModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                Expand
              </button>
            </div>
            <RiskDistribution data={calculateRiskDistribution()} />
          </Panel>
        </DashboardSection>
      </div>

      {/* AI Insights Row */}
      <DashboardSection title="AI Insights">
        <Panel title="">
          <AIInsightCards insights={generateAIInsights()} maxItems={3} />
        </Panel>
      </DashboardSection>

      {/* Hiring Insights Row */}
      {generateHiringInsights().length > 0 && (
        <DashboardSection title="Hiring Insights">
          <Panel title="">
            <div className="space-y-4">
              {generateHiringInsights().map((insight) => (
                <InsightCard
                  key={insight.id}
                  type={insight.type}
                  title={insight.title}
                  description={insight.description}
                  severity={insight.severity}
                  data={insight.data}
                  actions={insight.actions}
                  timeAgo={insight.timeAgo}
                  isDismissible={true}
                  onDismiss={() => dismissInsight(insight.id)}
                />
              ))}
            </div>
          </Panel>
        </DashboardSection>
      )}

      {/* Quick Actions */}
      <DashboardSection title="Quick Actions">
        <Panel title="">
          <div className="flex gap-4 flex-wrap">
            <Button asChild variant="outline" className="h-12 px-6">
              <Link href="/app/jobs">
                <Briefcase className="mr-2 h-4 w-4" />
                Create Job
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6">
              <Link href="/app/candidates">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Candidate
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6">
              <Link href="/app/interviews">
                <Mic className="mr-2 h-4 w-4" />
                Schedule Interview
              </Link>
            </Button>
          </div>
        </Panel>
      </DashboardSection>

      {/* Smart Suggestions */}
      <SmartSuggestions />

      {/* Upcoming Interviews */}
      <DashboardSection title="Upcoming Interviews">
        <Panel title="">
          <UpcomingInterviews interviews={upcomingInterviews} />
        </Panel>
      </DashboardSection>

      {/* 4. Candidates Awaiting Evaluation */}
      <DashboardSection title="Candidates Awaiting Evaluation">
        <Panel title="">
          {candidatesAwaitingEvaluation.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No pending evaluations"
              description="All candidates have been evaluated. Add new candidates to see them here."
              action={{
                label: "Add Candidates",
                onClick: () => router.push("/app/candidates"),
                variant: "primary"
              }}
              size="sm"
            />
          ) : (
            <div className="rounded-button border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Candidate
                    </th>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Job
                    </th>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Status
                    </th>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {candidatesAwaitingEvaluation.map((item: AwaitingEvaluationRow) => (
                    <tr 
                      key={item.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors group"
                      onClick={() => router.push(item.href)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-primary hover:text-primary/80 font-body text-sm font-medium group-hover:underline">
                            {item.candidateName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground font-body text-sm group-hover:text-foreground transition-colors">
                        {item.jobTitle}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.stage === "Interviewed" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {item.stage}
                          </span>
                          {!item.hasTranscript && (
                            <span className="text-xs text-muted-foreground">No transcript</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground font-body text-sm group-hover:text-foreground transition-colors">
                        {formatRelativeTime(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </DashboardSection>

      {/* 5. Recent Evaluations */}
      <DashboardSection title="Recent Evaluations">
        <Panel title="">
          {recentEvaluations.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="No completed evaluations yet"
              description="Start evaluating candidates to see their assessment results here."
              action={{
                label: "Evaluate Candidate",
                onClick: () => router.push("/app/candidates"),
                variant: "primary"
              }}
              size="sm"
            />
          ) : (
            <div className="rounded-button border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Candidate
                    </th>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Job
                    </th>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Risk Level
                    </th>
                    <th className="text-left px-4 py-4 text-sm font-medium text-foreground font-display">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentEvaluations.map((item: RecentEvaluationRow) => (
                    <tr 
                      key={item.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors group"
                      onClick={() => router.push(item.href)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-primary hover:text-primary/80 font-body text-sm font-medium group-hover:underline">
                            {item.candidateName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground font-body text-sm group-hover:text-foreground transition-colors">
                        {item.jobTitle}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <RiskBadge {...toRiskBadge(item.riskLevel)} />
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground font-body text-sm group-hover:text-foreground transition-colors">
                        {formatRelativeTime(item.completedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </DashboardSection>

      {/* 6. Risk Alerts */}
      {highRiskAlerts.length > 0 && (
        <DashboardSection 
          title="Risk Alerts"
          actions={
            <ShieldAlert className="h-5 w-5 text-risk-high" />
          }
        >
          <Panel title="">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {highRiskAlerts.map((alert: HighRiskAlertRow) => {
                const style =
                  alert.riskLevel === "HIGH"
                    ? { 
                        border: "border-l-red-500",   
                        bg: "bg-risk-high-bg/10",        
                        hover: "hover:bg-risk-high-bg/20",        
                        text: "text-red-600",        
                        label: "High Risk",   
                        badge: { level: "high" as const, label: "High" },
                        stripBg: "bg-red-500",
                        iconBg: "bg-red-100",
                        badgeBg: "bg-red-500 text-white"
                      }
                    : alert.riskLevel === "MEDIUM"
                    ? { 
                        border: "border-l-amber-400",  
                        bg: "bg-risk-investigate-bg/10", 
                        hover: "hover:bg-risk-investigate-bg/20", 
                        text: "text-amber-600", 
                        label: "Medium Risk",
                        badge: { level: "investigate" as const, label: "Medium" },
                        stripBg: "bg-amber-400",
                        iconBg: "bg-amber-100",
                        badgeBg: "bg-amber-400 text-white"
                      }
                    : { 
                        border: "border-l-green-500",    
                        bg: "bg-risk-safe-bg/10",       
                        hover: "hover:bg-risk-safe-bg/20",       
                        text: "text-green-600",       
                        label: "Low Risk",      
                        badge: { level: "safe" as const, label: "Low" },
                        stripBg: "bg-green-500",
                        iconBg: "bg-green-100",
                        badgeBg: "bg-green-500 text-white"
                      };
                
                return (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className={`group relative rounded-lg border-l-4 ${style.border} ${style.bg} ${style.hover} p-4 transition-all duration-200 hover:shadow-md`}
                  >
                    {/* Alert Strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.stripBg} rounded-l`} />
                    
                    {/* Content */}
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <AlertTriangle className={`w-4 h-4 ${style.text}`} />
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <RiskBadge {...style.badge} />
                          <span className={`text-xs font-medium ${style.text}`}>
                            {alert.score}% risk score
                          </span>
                        </div>
                        
                        <h4 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors truncate">
                          {alert.candidateName}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {alert.jobTitle}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${style.text}`}>
                            {alert.flagCount} flag{alert.flagCount !== 1 ? 's' : ''}
                          </span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </DashboardSection>
      )}

      {highRiskAlerts.length === 0 && (
        <DashboardSection 
          title="Risk Alerts"
          actions={
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          }
        >
          <Panel title="">
            <EmptyState
              icon={AlertTriangle}
              title="No risk alerts"
              description="All candidates are within acceptable risk parameters."
              size="sm"
            />
          </Panel>
        </DashboardSection>
      )}

      {/* 7. Recently Active Jobs */}
      <DashboardSection title="Recently Active Jobs">
        <Panel title="">
          {recentJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs yet"
              description="Create your first job posting to get started with hiring."
              action={{
                label: "Create Job",
                onClick: () => router.push("/app/jobs"),
                variant: "primary"
              }}
              size="sm"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentJobs.map((job: DashboardJobRow) => {
                const statusColor = 
                  job.status === "ACTIVE" ? "text-green-600" :
                  job.status === "DRAFT" ? "text-amber-600" :
                  "text-muted-foreground";
                
                const statusIcon = 
                  job.status === "ACTIVE" ? <CheckCircle className="w-4 h-4" /> :
                  job.status === "DRAFT" ? <Timer className="w-4 h-4" /> :
                  <AlertTriangle className="w-4 h-4" />;
                
                return (
                  <Link
                    key={job.id}
                    href={job.href}
                    className="group block rounded-card border border-border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors truncate">
                          {job.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {job.seniority}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 ${statusColor}`}>
                        {statusIcon}
                        <span className="text-xs font-medium">
                          {job.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{job.candidateCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileCheck className="w-3 h-3" />
                        <span className={
                          job.jdAnalysisStatus === "DONE" ? "text-green-600" :
                          job.jdAnalysisStatus === "RUNNING" ? "text-amber-600" :
                          "text-muted-foreground"
                        }>
                          JD
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        <span className={
                          job.interviewKitStatus === "DONE" ? "text-green-600" :
                          job.interviewKitStatus === "RUNNING" ? "text-amber-600" :
                          "text-muted-foreground"
                        }>
                          Kit
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Updated {formatRelativeTime(job.updatedAt)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>
      </DashboardSection>

      {/* 8. Recent Activity */}
      <DashboardSection 
        title={
          <div className="flex items-center gap-2">
            Recent Activity
            <LiveActivityPulse 
              isLive={isLive} 
              lastUpdate={lastUpdate} 
              activityCount={activityCount}
              className="text-xs"
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground font-body" htmlFor="activity-page-size">
              Show
            </label>
            <select
              id="activity-page-size"
              value={activityPageSize}
              onChange={(e) => {
                setActivityPage(1);
                setActivityPageSize(Number(e.target.value) as AllowedPageSize);
              }}
              className="text-sm font-body bg-background border border-border rounded-button px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span className="text-sm text-muted-foreground font-body">per page</span>
            <button
              onClick={checkForActivity}
              className="text-sm font-body px-3 py-1.5 rounded-button border border-border bg-background text-foreground hover:bg-accent transition-colors flex items-center gap-1"
            >
              <Wifi className="w-3 h-3" />
              Check Live
            </button>
          </div>
        }
      >
        <Panel title="">
          <ActivityTimeline 
            items={activityData?.items || []} 
            isLoading={activityLoading}
          />

          {activityData && activityData.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
              <button
                onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                disabled={activityPage === 1}
                className="text-sm font-body px-3 py-1.5 rounded-button border border-border bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground font-body">
                Page {activityData.page} of {activityData.totalPages}
              </span>
              <button
                onClick={() => setActivityPage((p) => Math.min(activityData.totalPages, p + 1))}
                disabled={activityPage === activityData.totalPages}
                className="text-sm font-body px-3 py-1.5 rounded-button border border-border bg-background text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </Panel>
      </DashboardSection>
      
      {/* Risk Analytics Modal */}
      <Modal
        isOpen={riskModalOpen}
        onClose={() => setRiskModalOpen(false)}
        title="Risk Analytics"
        size="lg"
      >
        <RiskAnalyticsModal
          isOpen={riskModalOpen}
          onClose={() => setRiskModalOpen(false)}
          data={generateRiskAnalyticsData()}
        />
      </Modal>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function getUnauthorizedDiagMessage(reason: string): string {
  if (reason === "missing-env") {
    return "Authentication is not configured correctly on the server.";
  }
  if (reason === "session-token-missing") {
    return "No session token was received by the API. Sign in again.";
  }
  if (reason === "no-user-id") {
    return "Your session was valid but did not include a user id. Sign in again.";
  }
  if (reason === "provision-failed") {
    return "Session verified, but user provisioning failed. Try signing in again.";
  }
  return `Session token rejected by server. Reason: ${reason}`;
}

function getTransientDiagMessage(reason: string): string {
  if (reason === "db-unreachable") {
    return "Database is temporarily unreachable. Please retry in a moment.";
  }
  if (reason === "unexpected-error" || reason === "clerk-auth-exception") {
    return "Session verification is temporarily unavailable. Refresh and retry shortly.";
  }
  return `Temporary server issue. Reason: ${reason}`;
}
