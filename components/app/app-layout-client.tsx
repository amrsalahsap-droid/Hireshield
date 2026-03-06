"use client";

import { useState, useEffect } from "react";
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

export default function AppLayoutClient({ children, user }: AppLayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

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

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const contentMargin = sidebarCollapsed ? 'ml-16' : 'ml-64';

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <div className={`fixed left-0 top-0 ${sidebarWidth} h-screen bg-card border-r border-border z-50 flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Logo Header */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              {/* HireShield Logo */}
              <HireShieldLogo 
                size={sidebarCollapsed ? 24 : 32}
                className="transition-all duration-300"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <NotificationBell 
                notifications={notifications}
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllRead}
              />
              
              {/* Toggle Button */}
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <X className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Search Field */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jobs and candidates..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSearchDropdown(searchQuery.length >= 2)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
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
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Dashboard */}
          <SidebarSection title={sidebarCollapsed ? "" : "DASHBOARD"}>
            <SidebarNavItem href="/app" icon="📊" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Dashboard"}
            </SidebarNavItem>
          </SidebarSection>

          {/* Hiring */}
          <SidebarSection title={sidebarCollapsed ? "" : "HIRING"}>
            <SidebarNavItem href="/app/jobs" icon="💼" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Jobs"}
            </SidebarNavItem>
            <SidebarNavItem href="/app/candidates" icon="👥" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Candidates"}
            </SidebarNavItem>
            <SidebarNavItem href="/app/evaluations" icon="📋" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Evaluations"}
            </SidebarNavItem>
          </SidebarSection>

          {/* AI Tools */}
          <SidebarSection title={sidebarCollapsed ? "" : "AI TOOLS"}>
            <SidebarNavItem href="/app/jobs" icon="📄" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "JD Analysis"}
            </SidebarNavItem>
            <SidebarNavItem href="/app/jobs" icon="🎤" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Interview Kit"}
            </SidebarNavItem>
          </SidebarSection>

          {/* Insights */}
          <SidebarSection title={sidebarCollapsed ? "" : "INSIGHTS"}>
            <SidebarNavItem href="/app/reports" icon="📈" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Reports"}
            </SidebarNavItem>
          </SidebarSection>

          {/* System */}
          <SidebarSection title={sidebarCollapsed ? "" : "SYSTEM"}>
            <SidebarNavItem href="/app/billing" icon="💳" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Billing"}
            </SidebarNavItem>
            <SidebarNavItem href="/app/settings" icon="⚙️" isCollapsed={sidebarCollapsed}>
              {!sidebarCollapsed && "Settings"}
            </SidebarNavItem>
            <SidebarNavItem href="https://docs.hireshield.com" icon="❓" isCollapsed={sidebarCollapsed} external>
              {!sidebarCollapsed && "Help"}
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
            <div className="text-muted-foreground font-body">
              HireShield - Decision Intelligence Platform
            </div>
            {/* Mobile menu button (always visible when sidebar is collapsed) */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <Menu className="w-5 h-5 text-muted-foreground" />
              ) : (
                <X className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
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
