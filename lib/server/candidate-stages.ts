import { prisma } from "@/lib/prisma";
import { CandidateStage } from "@prisma/client";

/**
 * Update candidate stage based on pipeline actions
 * This ensures every job-linked candidate has a proper stage
 */

export async function updateCandidateStage(
  jobId: string,
  candidateId: string,
  triggerAction: 'candidate_added' | 'interview_created' | 'interview_completed' | 'evaluation_created' | 'evaluation_completed' | 'decision_made'
): Promise<void> {
  try {
    // Find or create the job-candidate relationship
    const jobCandidate = await prisma.jobCandidate.upsert({
      where: {
        jobId_candidateId: {
          jobId,
          candidateId
        }
      },
      update: {
        updatedAt: new Date()
      },
      create: {
        jobId,
        candidateId,
        stage: CandidateStage.ADDED
      }
    });

    // Determine new stage based on action and current state
    let newStage: CandidateStage = CandidateStage.ADDED;

    switch (triggerAction) {
      case 'candidate_added':
        newStage = CandidateStage.ADDED;
        break;

      case 'interview_created':
        newStage = CandidateStage.INTERVIEW_SCHEDULED;
        break;

      case 'interview_completed':
        newStage = CandidateStage.INTERVIEW_COMPLETED;
        break;

      case 'evaluation_created':
        newStage = CandidateStage.EVALUATION_PENDING;
        break;

      case 'evaluation_completed':
        newStage = CandidateStage.EVALUATED;
        break;

      case 'decision_made':
        newStage = CandidateStage.DECISION_MADE;
        break;
    }

    // Only update if the stage is actually progressing
    const stageProgression = [
      CandidateStage.ADDED,
      CandidateStage.AWAITING_INTERVIEW,
      CandidateStage.INTERVIEW_SCHEDULED,
      CandidateStage.INTERVIEW_COMPLETED,
      CandidateStage.EVALUATION_PENDING,
      CandidateStage.EVALUATED,
      CandidateStage.DECISION_MADE
    ];

    const currentStageIndex = stageProgression.indexOf(jobCandidate.stage);
    const newStageIndex = stageProgression.indexOf(newStage);

    // Only update if new stage is further along or if it's a significant state change
    if (newStageIndex > currentStageIndex || 
        (triggerAction === 'evaluation_created' && jobCandidate.stage === CandidateStage.INTERVIEW_COMPLETED)) {
      await prisma.jobCandidate.update({
        where: {
          id: jobCandidate.id
        },
        data: {
          stage: newStage,
          updatedAt: new Date()
        }
      });
    }

  } catch (error) {
    console.error('Failed to update candidate stage:', error);
    // Don't throw error to avoid breaking main operations
  }
}

export async function getCandidateStage(jobId: string, candidateId: string): Promise<CandidateStage> {
  try {
    const jobCandidate = await prisma.jobCandidate.findUnique({
      where: {
        jobId_candidateId: {
          jobId,
          candidateId
        }
      }
    });

    return jobCandidate?.stage || CandidateStage.ADDED;
  } catch (error) {
    console.error('Failed to get candidate stage:', error);
    return CandidateStage.ADDED;
  }
}

export async function initializeCandidateStagesForJob(jobId: string): Promise<void> {
  try {
    // Get all candidates linked to this job
    const candidates = await prisma.candidate.findMany({
      where: {
        jobId
      }
    });

    // Create job-candidate relationships for any that don't exist
    for (const candidate of candidates) {
      await prisma.jobCandidate.upsert({
        where: {
          jobId_candidateId: {
            jobId,
            candidateId: candidate.id
          }
        },
        update: {}, // Don't change existing stage
        create: {
          jobId,
          candidateId: candidate.id,
          stage: CandidateStage.ADDED
        }
      });
    }
  } catch (error) {
    console.error('Failed to initialize candidate stages for job:', error);
  }
}

export async function getJobCandidateStages(jobId: string): Promise<Array<{
  candidateId: string;
  stage: CandidateStage;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
    createdAt: Date;
  };
}>> {
  try {
    const jobCandidates = await prisma.jobCandidate.findMany({
      where: {
        jobId
      },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return jobCandidates.map(jc => ({
      candidateId: jc.candidateId,
      stage: jc.stage,
      candidate: jc.candidate
    }));
  } catch (error) {
    console.error('Failed to get job candidate stages:', error);
    return [];
  }
}

export function getStageDisplayInfo(stage: CandidateStage): {
  label: string;
  color: string;
  description: string;
} {
  switch (stage) {
    case CandidateStage.ADDED:
      return {
        label: 'Added',
        color: 'bg-gray-100 text-gray-800',
        description: 'Candidate added to job'
      };

    case CandidateStage.AWAITING_INTERVIEW:
      return {
        label: 'Awaiting Interview',
        color: 'bg-blue-100 text-blue-800',
        description: 'Waiting for interview scheduling'
      };

    case CandidateStage.INTERVIEW_SCHEDULED:
      return {
        label: 'Interview Scheduled',
        color: 'bg-purple-100 text-purple-800',
        description: 'Interview is scheduled'
      };

    case CandidateStage.INTERVIEW_COMPLETED:
      return {
        label: 'Interview Completed',
        color: 'bg-indigo-100 text-indigo-800',
        description: 'Interview has been completed'
      };

    case CandidateStage.EVALUATION_PENDING:
      return {
        label: 'Evaluation Pending',
        color: 'bg-orange-100 text-orange-800',
        description: 'Evaluation is in progress'
      };

    case CandidateStage.EVALUATED:
      return {
        label: 'Evaluated',
        color: 'bg-green-100 text-green-800',
        description: 'Evaluation has been completed'
      };

    case CandidateStage.DECISION_MADE:
      return {
        label: 'Decision Made',
        color: 'bg-emerald-100 text-emerald-800',
        description: 'Final decision has been made'
      };

    default:
      return {
        label: 'Unknown',
        color: 'bg-gray-100 text-gray-800',
        description: 'Stage not recognized'
      };
  }
}
