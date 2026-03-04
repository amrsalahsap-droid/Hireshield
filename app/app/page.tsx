import { ensureProvisioned } from "@/lib/server/auth";

export const dynamic = 'force-dynamic';

export default async function AppPage() {
  let user;
  try {
    user = await ensureProvisioned();
  } catch (error) {
    console.error("Failed to provision user:", error);
    // This should be handled by middleware, but as a fallback
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center text-destructive">
          <p className="font-body">Authentication error. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  // Mock stats for now - will be replaced with real API calls
  const stats = [
    { name: "Total Jobs", value: "12", icon: "💼", color: "bg-primary" },
    { name: "Total Candidates", value: "48", icon: "👥", color: "bg-safe" },
    { name: "Interviews Conducted", value: "23", icon: "🎤", color: "bg-accent" },
    { name: "Evaluations Completed", value: "15", icon: "📋", color: "bg-investigate" },
  ];

  const recentActivity = [
    {
      id: "1",
      type: "Job Created",
      description: "Senior Frontend Developer position created",
      time: "2 hours ago",
      icon: "💼"
    },
    {
      id: "2", 
      type: "Candidate Added",
      description: "Alice Johnson added to candidate pool",
      time: "4 hours ago",
      icon: "👥"
    },
    {
      id: "3",
      type: "Interview Completed", 
      description: "Interview with Bob Wilson completed",
      time: "6 hours ago",
      icon: "🎤"
    },
    {
      id: "4",
      type: "Evaluation Created",
      description: "Evaluation for Carol Davis generated",
      time: "1 day ago", 
      icon: "📋"
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">Overview</h1>
        <p className="text-muted-foreground font-body">
          Welcome to your HireShield dashboard. Here&apos;s what&apos;s happening with your hiring process.
        </p>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Organization ID: {user.orgId}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-card overflow-hidden shadow-card rounded-xl border border-border">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-muted-foreground font-body truncate">{stat.name}</dt>
                    <dd className="text-lg font-semibold text-foreground font-display">{stat.value}</dd>
                  </dl>
                </div>
              </div>
              <div className={`mt-4 h-2 ${stat.color} rounded-full`}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-card shadow-card rounded-xl border border-border">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-foreground font-display mb-4">
            Recent Activity
          </h3>

          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivity.map((activity) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-8 ring-card border border-border">
                          <span className="text-sm">{activity.icon}</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="h-full border-l-2 border-border pl-4"></div>
                        <div className="text-sm text-muted-foreground font-body">
                          <p className="font-medium text-foreground">{activity.type}</p>
                          <p className="mt-1">{activity.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
