import { JobMetrics } from './job-analytics';

export interface HealthMetrics {
  totalCandidates: number;
  totalInterviews: number;
  totalEvaluations: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  highRiskCount: number;
  decisionPendingCount: number;
  daysSinceLastActivity: number;
  interviewRate: number;
  evaluationRate: number;
}

/**
 * Calculate hiring health based on real pipeline activity
 * 
 * Health Logic:
 * - INACTIVE: no candidates attached
 * - SLOW: candidates exist but no interviews/evaluations progressing
 * - HEALTHY: candidates are moving through the pipeline
 * - AT_RISK: high-risk evaluations dominate or process is stalled
 */
export function getHiringHealth(metrics: HealthMetrics): 'HEALTHY' | 'SLOW' | 'INACTIVE' | 'AT_RISK' {
  const {
    totalCandidates,
    totalInterviews,
    totalEvaluations,
    completedEvaluations,
    pendingEvaluations,
    highRiskCount,
    decisionPendingCount,
    daysSinceLastActivity,
    interviewRate,
    evaluationRate
  } = metrics;

  // Rule 1: Jobs with 0 candidates are INACTIVE
  if (totalCandidates === 0) {
    return 'INACTIVE';
  }

  // Rule 2: Check for AT_RISK conditions
  // High risk evaluations dominate
  if (completedEvaluations > 0) {
    const highRiskPercentage = (highRiskCount / completedEvaluations) * 100;
    if (highRiskPercentage >= 50) {
      return 'AT_RISK';
    }
  }

  // Process is stalled - no recent activity but has candidates
  if (daysSinceLastActivity > 14 && totalCandidates > 0) {
    // If we have candidates but no activity in 2+ weeks
    if (totalInterviews === 0 && totalEvaluations === 0) {
      return 'SLOW';
    }
    // If we have interviews but no evaluations completed recently
    if (totalInterviews > 0 && completedEvaluations === 0 && daysSinceLastActivity > 7) {
      return 'SLOW';
    }
  }

  // Rule 3: Check for SLOW conditions
  // Candidates exist but pipeline isn't progressing
  if (totalCandidates > 0) {
    // No interviews or evaluations despite having candidates
    if (totalInterviews === 0 && totalEvaluations === 0) {
      return 'SLOW';
    }

    // Low interview rate (< 25%) with multiple candidates
    if (totalCandidates >= 3 && interviewRate < 25) {
      return 'SLOW';
    }

    // Low evaluation rate (< 50%) with multiple interviews
    if (totalInterviews >= 3 && evaluationRate < 50) {
      return 'SLOW';
    }

    // Many pending evaluations (stuck in evaluation phase)
    if (pendingEvaluations >= 3 && decisionPendingCount > 0) {
      return 'SLOW';
    }
  }

  // Rule 4: Check for HEALTHY conditions
  // Candidates are actively moving through the pipeline
  const hasProgression = totalInterviews > 0 || totalEvaluations > 0;
  const hasGoodFlow = interviewRate >= 25 && (totalEvaluations === 0 || evaluationRate >= 50);
  const hasRecentActivity = daysSinceLastActivity <= 7;
  
  if (hasProgression && hasGoodFlow && hasRecentActivity) {
    return 'HEALTHY';
  }

  // Rule 5: Default to SLOW for edge cases
  // This covers cases where we have some activity but don't meet healthy criteria
  return 'SLOW';
}

/**
 * Calculate days since last activity for a job
 */
export function calculateDaysSinceLastActivity(
  candidates: Array<{ createdAt: Date }>,
  interviews: Array<{ createdAt: Date }>,
  evaluations: Array<{ createdAt: Date }>
): number {
  const allDates = [
    ...candidates.map(c => c.createdAt),
    ...interviews.map(i => i.createdAt),
    ...evaluations.map(e => e.createdAt)
  ];

  if (allDates.length === 0) {
    return 999; // Very large number to indicate no activity
  }

  const mostRecentDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - mostRecentDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get health metrics from job data
 */
export function getHealthMetrics(jobData: {
  candidates: Array<{ createdAt: Date }>;
  interviews: Array<{ createdAt: Date }>;
  evaluations: Array<{ 
    createdAt: Date; 
    status: string; 
    completedAt: Date | null; 
    riskLevel: string | null; 
  }>;
}): HealthMetrics {
  const totalCandidates = jobData.candidates.length;
  const totalInterviews = jobData.interviews.length;
  const totalEvaluations = jobData.evaluations.length;
  const completedEvaluations = jobData.evaluations.filter(e => e.status === 'COMPLETED').length;
  const pendingEvaluations = jobData.evaluations.filter(e => e.status === 'PENDING' && e.completedAt).length;
  const highRiskCount = jobData.evaluations.filter(e => e.riskLevel === 'HIGH').length;
  const decisionPendingCount = jobData.evaluations.filter(e => e.status === 'PENDING' && e.completedAt).length;
  
  const daysSinceLastActivity = calculateDaysSinceLastActivity(
    jobData.candidates,
    jobData.interviews,
    jobData.evaluations
  );

  const interviewRate = totalCandidates > 0 ? (totalInterviews / totalCandidates) * 100 : 0;
  const evaluationRate = totalInterviews > 0 ? (totalEvaluations / totalInterviews) * 100 : 0;

  return {
    totalCandidates,
    totalInterviews,
    totalEvaluations,
    completedEvaluations,
    pendingEvaluations,
    highRiskCount,
    decisionPendingCount,
    daysSinceLastActivity,
    interviewRate,
    evaluationRate
  };
}

/**
 * Get health display information
 */
export function getHealthDisplayInfo(health: 'HEALTHY' | 'SLOW' | 'INACTIVE' | 'AT_RISK'): {
  label: string;
  color: string;
  description: string;
  icon: string;
} {
  switch (health) {
    case 'HEALTHY':
      return {
        label: 'Healthy',
        color: 'bg-green-100 text-green-800',
        description: 'Candidates are actively moving through the pipeline',
        icon: '✅'
      };

    case 'SLOW':
      return {
        label: 'Slow',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Pipeline progression is slower than expected',
        icon: '⚠️'
      };

    case 'INACTIVE':
      return {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-800',
        description: 'No candidates attached to this job',
        icon: '📋'
      };

    case 'AT_RISK':
      return {
        label: 'At Risk',
        color: 'bg-red-100 text-red-800',
        description: 'High risk evaluations or stalled process',
        icon: '🚨'
      };

    default:
      return {
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800',
        description: 'Health status could not be determined',
        icon: '❓'
      };
  }
}
