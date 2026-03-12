import { prisma } from '@/lib/prisma';
import { getHiringHealth, getHealthMetrics } from './hiring-health';

export interface JobMetrics {
  totalCandidates: number;
  totalInterviews: number;
  totalEvaluations: number;
  interviewRate: number;
  evaluationRate: number;
  recentActivity: Array<{
    type: 'candidate_added' | 'interview_created' | 'evaluation_completed';
    timestamp: Date;
    description: string;
  }>;
  hiringHealth: 'HEALTHY' | 'SLOW' | 'INACTIVE' | 'AT_RISK' | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  riskAlerts: number;
  decisionPendingCount: number;
  highRiskCount: number;
}

/**
 * Centralized function to recalculate all job metrics
 * This ensures analytics are always derived from underlying records
 */
export async function recalculateJobMetrics(jobId: string, orgId: string): Promise<JobMetrics> {
  try {
    // Fetch all related data in parallel for performance
    const [
      candidates,
      interviews,
      evaluations,
      auditLogs
    ] = await Promise.all([
      // Get all candidates linked to this job
      prisma.candidate.findMany({
        where: { jobId, orgId },
        select: { id: true, createdAt: true, fullName: true }
      }),
      
      // Get all interviews for this job
      prisma.interview.findMany({
        where: { jobId, orgId },
        select: { id: true, candidateId: true, createdAt: true }
      }),
      
      // Get all evaluations for this job
      prisma.evaluation.findMany({
        where: { jobId, orgId },
        select: { 
          id: true, 
          candidateId: true, 
          createdAt: true, 
          status: true, 
          riskLevel: true,
          completedAt: true
        }
      }),
      
      // Get recent audit logs for activity tracking
      prisma.auditLog.findMany({
        where: { 
          entityId: jobId,
          entityType: 'JOB',
          orgId
        },
        select: { action: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate basic counts
    const totalCandidates = candidates.length;
    const totalInterviews = interviews.length;
    const totalEvaluations = evaluations.length;

    // Calculate rates (avoid division by zero)
    const interviewRate = totalCandidates > 0 ? (totalInterviews / totalCandidates) * 100 : 0;
    const evaluationRate = totalInterviews > 0 ? (totalEvaluations / totalInterviews) * 100 : 0;

    // Calculate risk metrics
    const decisionPendingCount = evaluations.filter(e => 
      e.status === 'PENDING' && e.completedAt
    ).length;
    
    const highRiskCount = evaluations.filter(e => 
      e.riskLevel === 'HIGH'
    ).length;
    
    const mediumRiskCount = evaluations.filter(e => 
      e.riskLevel === 'MEDIUM'
    ).length;

    // Determine overall risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null = null;
    const riskScore = (highRiskCount * 3) + (decisionPendingCount * 1);
    
    if (totalEvaluations > 0) {
      const riskPercentage = (highRiskCount / totalEvaluations) * 100;
      if (riskPercentage >= 50) riskLevel = 'HIGH';
      else if (riskPercentage >= 20) riskLevel = 'MEDIUM';
      else if (riskPercentage > 0) riskLevel = 'LOW';
    }

    // Calculate hiring health using real pipeline activity
    const healthMetrics = getHealthMetrics({
      candidates,
      interviews,
      evaluations
    });
    
    const hiringHealth = getHiringHealth(healthMetrics);

    // Build recent activity from audit logs
    const recentActivity = auditLogs.map(log => {
      let type: 'candidate_added' | 'interview_created' | 'evaluation_completed';
      let description = '';

      switch (log.action) {
        case 'CANDIDATE_ADDED':
          type = 'candidate_added';
          description = 'New candidate added';
          break;
        case 'INTERVIEW_CREATED':
          type = 'interview_created';
          description = 'Interview conducted';
          break;
        case 'CANDIDATE_EVALUATED':
          type = 'evaluation_completed';
          description = 'Evaluation completed';
          break;
        default:
          type = 'candidate_added';
          description = 'Activity recorded';
      }

      return {
        type,
        timestamp: log.createdAt,
        description
      };
    });

    return {
      totalCandidates,
      totalInterviews,
      totalEvaluations,
      interviewRate: Math.round(interviewRate * 10) / 10, // Round to 1 decimal
      evaluationRate: Math.round(evaluationRate * 10) / 10,
      recentActivity,
      hiringHealth,
      riskLevel,
      riskAlerts: highRiskCount + mediumRiskCount,
      decisionPendingCount,
      highRiskCount
    };

  } catch (error) {
    console.error('Error calculating job metrics:', error);
    throw new Error('Failed to calculate job metrics');
  }
}

/**
 * Helper function to trigger analytics recalculation after mutations
 */
export async function triggerJobAnalyticsUpdate(jobId: string, orgId: string): Promise<JobMetrics> {
  const metrics = await recalculateJobMetrics(jobId, orgId);
  
  // In a real implementation, you might want to cache these metrics
  // or push updates to a real-time dashboard
  console.log(`Job ${jobId} analytics updated:`, metrics);
  
  return metrics;
}
