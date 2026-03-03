import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await currentUser();
  } catch (error) {
    console.error("Error getting current user:", error);
    user = null;
  }

  const navigation = [
    { name: "Dashboard", href: "/app", icon: "📊" },
    { name: "Jobs", href: "/app/jobs", icon: "💼" },
    { name: "Candidates", href: "/app/candidates", icon: "👥" },
    { name: "Reports", href: "/app/reports", icon: "📈" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-subtle border-r border-neutral-200">
        {/* Logo Header */}
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center space-x-3">
            {/* HireShield Logo */}
            <img 
              src="/hireshield-logo.png" 
              alt="HireShield Logo" 
              className="h-8 w-auto"
              onError={(e) => {
                // Fallback to text if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Fallback text logo */}
            <div className="hidden">
              <h1 className="text-xl font-semibold text-neutral-900">
                HireShield
              </h1>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center px-3 py-2 text-body font-medium rounded-button text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* User info */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-neutral-200">
          <div className="flex flex-col space-y-3">
            <div className="text-secondary text-neutral-500">
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
        <header className="bg-white shadow-subtle border-b border-neutral-200">
          <div className="px-6 py-4">
            <div className="text-secondary text-neutral-500">
              HireShield - Decision Intelligence Platform
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
