import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  const navigation = [
    { name: "Overview", href: "/app", icon: "📊" },
    { name: "Jobs", href: "/app/jobs", icon: "💼" },
    { name: "Candidates", href: "/app/candidates", icon: "👥" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-8">
            HireShield
          </h1>
          
          {/* Navigation */}
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        
        {/* User info */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
          <div className="flex flex-col space-y-2">
            <div className="text-sm text-gray-500">
              {user?.id ? `User: ${user.id.slice(0, 8)}...` : "Not authenticated"}
            </div>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="text-sm text-gray-500">
              HireShield - Talent Evaluation Platform
            </div>
          </div>
        </header>
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
