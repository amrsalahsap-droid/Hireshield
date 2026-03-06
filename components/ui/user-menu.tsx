import React, { useState } from "react";
import { User, Settings, LogOut, ChevronUp, ChevronDown } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

interface UserMenuProps {
  user?: {
    id?: string;
    fullName?: string | null;
    primaryEmailAddress?: {
      emailAddress: string;
    } | null;
    imageUrl?: string;
  } | null;
  className?: string;
}

export function UserMenu({ user, className = "" }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getDisplayName = () => {
    if (user?.fullName) return user.fullName;
    if (user?.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
    if (user?.id) return `User ${user.id.slice(0, 8)}...`;
    return "Unknown User";
  };

  const getInitials = () => {
    const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "";
    if (name.length === 0) return "U";
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleMenuClick = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case 'profile':
        // Navigate to profile page
        window.location.href = '/app/profile';
        break;
      case 'settings':
        // Navigate to settings page
        window.location.href = '/app/settings';
        break;
      case 'logout':
        // Clerk handles logout through UserButton
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* User Avatar/Name Section */}
      <div 
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Avatar */}
        <div className="relative">
          {user?.imageUrl ? (
            <img 
              src={user.imageUrl} 
              alt={getDisplayName()}
              className="w-8 h-8 rounded-full object-cover border-2 border-background"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold border-2 border-background">
              {getInitials()}
            </div>
          )}
        </div>

        {/* User Name (only when sidebar is not collapsed) */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {getDisplayName()}
          </p>
        </div>

        {/* Dropdown Arrow */}
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {/* Menu Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-3">
                {user?.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt={getDisplayName()}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold">
                    {getInitials()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user?.primaryEmailAddress?.emailAddress || 'No email'}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => handleMenuClick('profile')}
                className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Profile</span>
              </button>
              
              <button
                onClick={() => handleMenuClick('settings')}
                className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Settings</span>
              </button>
              
              <div className="border-t border-border my-1"></div>
              
              {/* Clerk UserButton for logout */}
              <div className="px-4 py-2">
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      button: "w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3 rounded-md border-0 bg-transparent text-foreground",
                      avatarBox: "w-4 h-4",
                    }
                  }}
                >
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Logout</span>
                </UserButton>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
