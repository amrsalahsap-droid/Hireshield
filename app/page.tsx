import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4 text-neutral-900">HireShield</h1>
        <p className="text-lg text-slate-600 mb-8">
          AI-powered hiring evaluation platform
        </p>
        
        <div className="space-y-4">
          <Link
            href="/auth"
            className="block w-full bg-primary-500 text-white px-6 py-3 rounded-button hover:bg-primary-600 transition-colors font-medium"
          >
            Get Started
          </Link>
        </div>
        
        <p className="text-sm text-slate-500 mt-8">
          Join thousands of companies using AI to streamline their hiring process
        </p>
        
        <div className="mt-4 text-xs text-slate-400">
          v2.0
        </div>
      </div>
    </div>
  );
}
