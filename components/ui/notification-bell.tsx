import React, { useState, useEffect } from "react";
import { Bell, Check, AlertTriangle, UserPlus, FileCheck, X } from "lucide-react";

export interface Notification {
  id: string;
  type: "evaluation_completed" | "candidate_added" | "risk_alert";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  href?: string;
}

interface NotificationBellProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  className?: string;
}

export function NotificationBell({ 
  notifications = [], 
  onNotificationClick, 
  onMarkAllRead,
  className = "" 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications);

  // Update local notifications when prop changes
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = localNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setLocalNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    
    // Call external handler
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Close dropdown
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (onMarkAllRead) {
      onMarkAllRead();
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "evaluation_completed":
        return <FileCheck className="w-4 h-4 text-green-600" />;
      case "candidate_added":
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      case "risk_alert":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {localNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {localNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted transition-colors cursor-pointer ${
                        !notification.read ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium text-foreground ${
                              !notification.read ? 'font-semibold' : ''
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1"></div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {localNotifications.length > 0 && (
              <div className="p-3 border-t border-border">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
