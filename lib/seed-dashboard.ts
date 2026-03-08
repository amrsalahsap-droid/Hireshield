import { prisma } from "@/lib/prisma";

const DEMO_ORG_ID = "cmm87bloy0000v9nvvzyt6aqn";

const candidateNames = [
  "Sarah Johnson", "Michael Chen", "Emily Rodriguez", "David Kim", "Jessica Taylor",
  "Robert Anderson", "Maria Garcia", "James Wilson", "Jennifer Brown", "William Martinez",
  "Linda Davis", "Christopher Lee", "Patricia Miller", "Daniel Thompson", "Barbara White"
];

const jobTitles = [
  "Senior Frontend Developer", "Backend Engineer", "Full Stack Developer", "DevOps Engineer",
  "Product Manager", "UX Designer", "Data Scientist", "Mobile Developer",
  "QA Engineer", "Technical Writer", "Software Architect", "Cloud Engineer"
];

const seniorities = ["Junior", "Mid-level", "Senior", "Lead", "Principal"];

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(daysAgo: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() - getRandomNumber(1, daysAgo));
  return date;
}

export async function seedDashboardData() {
  console.log("🌱 Seeding dashboard data...");

  try {
    // Create demo organization if it doesn't exist
    let org = await prisma.org.findUnique({
      where: { id: DEMO_ORG_ID }
    });

    if (!org) {
      org = await prisma.org.create({
        data: {
          id: DEMO_ORG_ID,
          name: "Demo Organization",
          jdAnalysisCount: 0,
          interviewKitCount: 0,
        }
      });
      console.log(`🏢 Created demo organization: ${org.name}`);
    }

    // Clear existing data for demo org
    await prisma.evaluation.deleteMany({ where: { orgId: DEMO_ORG_ID } });
    await prisma.interview.deleteMany({ where: { orgId: DEMO_ORG_ID } });
    await prisma.candidate.deleteMany({ where: { orgId: DEMO_ORG_ID } });
    await prisma.job.deleteMany({ where: { orgId: DEMO_ORG_ID } });

    // Create candidates
    const candidates = [];
    for (let i = 0; i < 15; i++) {
      const candidate = await prisma.candidate.create({
        data: {
          orgId: DEMO_ORG_ID,
          fullName: candidateNames[i],
          email: `${candidateNames[i].toLowerCase().replace(' ', '.')}@example.com`,
          createdAt: getRandomDate(60),
        }
      });
      candidates.push(candidate);
    }

    // Create jobs with different statuses
    const jobs = [];
    const jobStatuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "DRAFT", "DRAFT", "ARCHIVED"];
    
    for (let i = 0; i < 7; i++) {
      const job = await prisma.job.create({
        data: {
          orgId: DEMO_ORG_ID,
          title: jobTitles[i],
          status: jobStatuses[i] as any,
          rawJD: `We are looking for a ${jobTitles[i]} to join our team...`,
          jdExtractionJson: {
            seniority: seniorities[getRandomNumber(0, seniorities.length - 1)],
            skills: ["JavaScript", "React", "Node.js", "TypeScript"],
            experience: getRandomNumber(2, 8)
          },
          jdAnalysisStatus: getRandomItem(["DONE", "DONE", "DONE", "RUNNING", "FAILED", "NOT_STARTED"]) as any,
          interviewKitJson: getRandomItem([null, null, {
            questions: ["Tell me about yourself", "Why do you want this job?"],
            criteria: ["Technical skills", "Communication", "Problem solving"]
          }]),
          interviewKitStatus: getRandomItem(["DONE", "DONE", "RUNNING", "FAILED", "NOT_STARTED"]) as any,
          createdAt: getRandomDate(45),
          updatedAt: getRandomDate(30),
        }
      });
      jobs.push(job);
    }

    // Create interviews and evaluations
    let interviewCount = 0;
    let evaluationCount = 0;

    for (const job of jobs) {
      if (job.status !== "ACTIVE") continue;
      
      // Assign 2-4 candidates per active job
      const jobCandidates = candidates.slice(0, getRandomNumber(2, 4));
      
      for (const candidate of jobCandidates) {
        // Create interview
        const interview = await prisma.interview.create({
          data: {
            orgId: DEMO_ORG_ID,
            jobId: job.id,
            candidateId: candidate.id,
            transcriptText: `Interview transcript for ${candidate.fullName} applying for ${job.title}...`,
            createdAt: getRandomDate(20),
          }
        });
        interviewCount++;

        // Create evaluation (70% chance of completion)
        if (Math.random() < 0.7) {
          const score = getRandomNumber(45, 95);
          const riskLevel = score < 60 ? "HIGH" : score < 80 ? "MEDIUM" : "LOW";
          
          const evaluation = await prisma.evaluation.create({
            data: {
              orgId: DEMO_ORG_ID,
              jobId: job.id,
              candidateId: candidate.id,
              signalsJson: [
                { type: "skill_gap", severity: "medium", description: "Missing advanced TypeScript knowledge" },
                { type: "experience_mismatch", severity: "low", description: "Less experience than required" }
              ].slice(0, getRandomNumber(1, 3)),
              finalScoreJson: {
                finalScore: score,
                riskLevel: riskLevel,
                categories: {
                  technical: getRandomNumber(40, 100),
                  communication: getRandomNumber(50, 100),
                  problemSolving: getRandomNumber(30, 100)
                }
              },
              status: "COMPLETED",
              riskLevel: riskLevel as any,
              completedAt: getRandomDate(10),
              createdAt: getRandomDate(15),
            }
          });
          evaluationCount++;
        } else {
          // Create pending evaluation
          await prisma.evaluation.create({
            data: {
              orgId: DEMO_ORG_ID,
              jobId: job.id,
              candidateId: candidate.id,
              status: "PENDING",
              createdAt: getRandomDate(5),
            }
          });
        }
      }
    }

    console.log("✅ Dashboard data seeded successfully!");
    console.log(`📊 Created ${candidates.length} candidates`);
    console.log(`💼 Created ${jobs.length} jobs`);
    console.log(`🎤 Created ${interviewCount} interviews`);
    console.log(`📋 Created ${evaluationCount} evaluations`);

    return {
      candidates: candidates.length,
      jobs: jobs.length,
      interviews: interviewCount,
      evaluations: evaluationCount
    };

  } catch (error) {
    console.error("❌ Error seeding dashboard data:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDashboardData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
