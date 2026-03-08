"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { HireShieldLogo } from "@/components/ui/hire-shield-logo";
import { SidebarSection, SidebarNavItem } from "@/components/ui/sidebar-section";
import { Tooltip } from "@/components/ui/tooltip";
import { NotificationBell, Notification } from "@/components/ui/notification-bell";
import { UserMenu } from "@/components/ui/user-menu";
import { Menu, X, ChevronRight, Search } from "lucide-react";

interface AppLayoutClientProps {
  children: React.ReactNode;
  user: {
    id?: string;
    fullName?: string | null;
    primaryEmailAddress?: {
      emailAddress: string;
    } | null;
  } | null;
}

// Page title mapping
const getPageInfo = (pathname: string) => {
  const pathSegments = pathname.split('/').filter(Boolean);
  
  if (pathname === '/app' || pathname === '/app/') {
    return { title: 'Dashboard', subtitle: 'Hiring Overview' };
  }
  
  if (pathSegments[0] === 'app') {
    const page = pathSegments[1];
    
    switch (page) {
      case 'jobs':
        return { title: 'Jobs', subtitle: 'Manage job postings' };
      case 'candidates':
        return { title: 'Candidates', subtitle: 'Track applicant progress' };
      case 'evaluations':
        return { title: 'Evaluations', subtitle: 'Review candidate assessments' };
      case 'interviews':
        return { title: 'Interviews', subtitle: 'Schedule and manage interviews' };
      case 'reports':
        return { title: 'Reports', subtitle: 'Analytics and insights' };
      case 'billing':
        return { title: 'Billing', subtitle: 'Subscription and usage' };
      case 'settings':
        return { title: 'Settings', subtitle: 'System configuration' };
      default:
        return { title: 'Dashboard', subtitle: 'Hiring Overview' };
    }
  }
  
  return { title: 'Dashboard', subtitle: 'Hiring Overview' };
};

// Helper function to check if a navigation item is active
const isNavItemActive = (pathname: string, href: string, label?: string): boolean => {
  // Exact match for dashboard
  if (href === '/app' && (pathname === '/app' || pathname === '/app/')) {
    return true;
  }
  
  // For other pages, check if pathname starts with the href
  if (href !== '/app') {
    return pathname.startsWith(href);
  }
  
  return false;
};

export default function AppLayoutClient({ children, user }: AppLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pageInfo = getPageInfo(pathname);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "evaluation_completed",
      title: "Evaluation Completed",
      message: "Carol Chen's evaluation for Frontend Developer is complete",
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
      read: false,
      href: "/app/evaluations/eval-123"
    },
    {
      id: "2",
      type: "candidate_added",
      title: "New Candidate Added",
      message: "John Doe has been added to the Backend Developer position",
      timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
      read: false,
      href: "/app/candidates/cand-456"
    },
    {
      id: "3",
      type: "risk_alert",
      title: "High Risk Alert",
      message: "Jane Smith shows high risk indicators in recent evaluation",
      timestamp: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      read: true,
      href: "/app/evaluations/eval-789"
    }
  ]);

  // Fixed sidebar dimensions
  const sidebarWidth = 'w-64';
  const contentMargin = 'ml-64';

  // Debounced search function
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Search function
  const performSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const debouncedSearch = debounce(performSearch, 300);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSearchDropdown(value.length >= 2);
    debouncedSearch(value);
  };

  // Handle search result click
  const handleSearchResultClick = (result: any) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    setSearchResults([]);
    router.push(result.href);
  };

  // Notification handlers
  const handleNotificationClick = (notification: Notification) => {
    if (notification.href) {
      router.push(notification.href);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <div className={`fixed left-0 top-0 ${sidebarWidth} h-screen bg-card border-r border-border z-50 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Logo Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            {/* HireShield Logo */}
            <HireShieldLogo 
              size={32}
              className="transition-all duration-300"
            />
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Dashboard */}
          <SidebarSection title="DASHBOARD">
            <SidebarNavItem href="/app" icon="📊" isActive={isNavItemActive(pathname, '/app')}>
              Dashboard
            </SidebarNavItem>
          </SidebarSection>

          {/* Hiring */}
          <SidebarSection title="HIRING">
            <SidebarNavItem href="/app/jobs" icon="💼" isActive={isNavItemActive(pathname, '/app/jobs')}>
              Jobs
            </SidebarNavItem>
            <SidebarNavItem href="/app/candidates" icon="👥" isActive={isNavItemActive(pathname, '/app/candidates')}>
              Candidates
            </SidebarNavItem>
            <SidebarNavItem href="/app/evaluations" icon="📋" isActive={isNavItemActive(pathname, '/app/evaluations')}>
              Evaluations
            </SidebarNavItem>
          </SidebarSection>

          {/* AI Tools */}
          <SidebarSection title="AI TOOLS">
            <SidebarNavItem href="/app/jobs" icon="📄" isActive={false}>
              JD Analysis
            </SidebarNavItem>
            <SidebarNavItem href="/app/jobs" icon="🎤" isActive={false}>
              Interview Kit
            </SidebarNavItem>
          </SidebarSection>

          {/* Insights */}
          <SidebarSection title="INSIGHTS">
            <SidebarNavItem href="/app/reports" icon="📈" isActive={isNavItemActive(pathname, '/app/reports')}>
              Reports
            </SidebarNavItem>
          </SidebarSection>

          {/* System */}
          <SidebarSection title="SYSTEM">
            <SidebarNavItem href="/app/billing" icon="💳" isActive={isNavItemActive(pathname, '/app/billing')}>
              Billing
            </SidebarNavItem>
            <SidebarNavItem href="/app/settings" icon="⚙️" isActive={isNavItemActive(pathname, '/app/settings')}>
              Settings
            </SidebarNavItem>
            <SidebarNavItem href="https://docs.hireshield.com" icon="❓" external>
              Help
            </SidebarNavItem>
          </SidebarSection>
        </nav>
        
        {/* User info */}
        <div className="flex-shrink-0 p-4 border-t border-border">
          <UserMenu user={user} />
        </div>
      </div>

      {/* Main content with dynamic margin for sidebar */}
      <div className={`${contentMargin} min-h-screen flex flex-col transition-all duration-300 ease-in-out`}>
        <header className="bg-card shadow-subtle border-b border-border flex-shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-foreground font-display">{pageInfo.title}</h1>
              <p className="text-sm text-muted-foreground font-body">{pageInfo.subtitle}</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search jobs and candidates..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowSearchDropdown(searchQuery.length >= 2)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  className="w-64 pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                />
                
                {/* Search Dropdown */}
                {showSearchDropdown && (
                  <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No results found
                      </div>
                    ) : (
                      <div className="py-2">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-4 py-3 text-left hover:bg-muted transition-colors flex items-center gap-3"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              result.type === 'job' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {result.type === 'job' ? (
                                <span className="text-sm">💼</span>
                              ) : (
                                <span className="text-sm">👥</span>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-medium text-foreground text-sm">{result.title}</p>
                              <p className="text-xs text-muted-foreground">{result.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notification Bell */}
              <NotificationBell 
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllRead}
              />
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
