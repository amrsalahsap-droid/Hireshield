import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">HireShield</h1>
        <p className="text-lg text-gray-600 mb-8">
          AI-powered hiring evaluation platform
        </p>
        
        <div className="space-y-4">
          <Link
            href="/signup"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign Up
          </Link>
          
          <Link
            href="/login"
            className="block w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Sign In
          </Link>
        </div>
        
        <p className="text-sm text-gray-500 mt-8">
          Join thousands of companies using AI to streamline their hiring process
        </p>
      </div>
    </div>
  );
}
