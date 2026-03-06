import React from "react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}

export function DashboardSection({ 
  children, 
  title, 
  description, 
  className,
  actions
}: DashboardSectionProps) {
  return (
    <div className={cn("mb-8", className)}>
      {(title || description || actions) && (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              {title && (
                <h2 className="text-section text-foreground font-display mb-2">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-body-size text-muted-foreground font-body">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
