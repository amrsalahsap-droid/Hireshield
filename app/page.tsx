export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">HireShield</h1>
        <p className="text-lg text-gray-600 mb-8">
          AI-powered hiring evaluation platform
        </p>
        <a
          href="/api/health"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Health Check
        </a>
      </div>
    </div>
  );
}
