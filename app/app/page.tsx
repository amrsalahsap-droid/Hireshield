import { ensureProvisioned } from "@/lib/server/auth";

export default async function AppPage() {
  let user;
  try {
    user = await ensureProvisioned();
  } catch (error) {
    console.error("Failed to provision user:", error);
    // This should be handled by middleware, but as a fallback
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center text-red-600">
          <p>Authentication error. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to HireShield
          </h1>
          <p className="text-gray-600 mb-2">
            Your AI-powered hiring evaluation platform
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Organization ID: {user.orgId}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Jobs</h3>
              <p className="text-gray-600">Manage job postings and requirements</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Candidates</h3>
              <p className="text-gray-600">Track and evaluate candidate profiles</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Interviews</h3>
              <p className="text-gray-600">Schedule and conduct AI-assisted interviews</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
