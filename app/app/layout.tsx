import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Logo } from "@/components/ui/logo";

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

  const topNav = [
    { name: "Dashboard", href: "/app", icon: "📊" },
    { name: "Billing", href: "/app/billing", icon: "💳" },
    { name: "Update", href: "/app/update", icon: "🔄" },
  ];

  const jobsNav = [
    { name: "JD Analysis", href: "/app/jobs", icon: "📄" },
    { name: "Interview Kit", href: "/app/jobs", icon: "🎤" },
    { name: "Candidates", href: "/app/candidates", icon: "👥" },
    { name: "Evaluations", href: "/app/evaluations", icon: "📋" },
  ];

  const bottomNav = [
    { name: "Reports", href: "/app/reports", icon: "📈" },
  ];

  const navLinkClass =
    "flex items-center px-3 py-2 text-sm font-medium font-body rounded-button text-muted-foreground hover:text-foreground hover:bg-accent transition-colors";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        {/* Logo Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            {/* HireShield Logo */}
            <Logo 
              src="/hireshield-logo.svg" 
              alt="HireShield Logo" 
              className="h-8 w-auto"
              fallback={
                <h1 className="text-xl font-semibold text-foreground font-display">
                  HireShield
                </h1>
              }
            />
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {topNav.map((item) => (
            <Link key={item.name} href={item.href} className={navLinkClass}>
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
          <div className="pt-2">
            <div className="px-3 py-1.5 text-xs font-semibold font-display text-muted-foreground uppercase tracking-wider">
              Jobs
            </div>
            <div className="mt-1 space-y-0.5">
              {jobsNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${navLinkClass} pl-6`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          {bottomNav.map((item) => (
            <Link key={item.name} href={item.href} className={navLinkClass}>
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* User info */}
        <div className="absolute bottom-0 w-64 p-6 border-t border-border">
          <div className="flex flex-col space-y-3">
            {user?.id && (
              <div className="text-muted-foreground font-body text-sm truncate">
                {user.fullName || user.primaryEmailAddress?.emailAddress || `User ${user.id.slice(0, 8)}...`}
              </div>
            )}
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
        <header className="bg-card shadow-subtle border-b border-border">
          <div className="px-6 py-4">
            <div className="text-muted-foreground font-body">
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
