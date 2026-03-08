import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    variant?: "default" | "outline" | "destructive";
  };
  secondaryAction?: {
    label: string;
    href: string;
    variant?: "default" | "outline" | "destructive";
  };
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmptyStateCard({ 
  icon, 
  title, 
  description, 
  action, 
  secondaryAction,
  size = "md",
  className = "" 
}: EmptyStateCardProps) {
  const sizeClasses = {
    sm: "p-6",
    md: "p-8", 
    lg: "p-10"
  };

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  return (
    <div className={`bg-card border border-border rounded-xl ${sizeClasses[size]} ${className}`}>
      <div className="text-center">
        {/* Icon */}
        <div className={`mx-auto mb-4 flex items-center justify-center w-16 h-16 bg-muted/50 rounded-full ${iconSizes[size]}`}>
          {icon}
        </div>
        
        {/* Content */}
        <h3 className="text-lg font-semibold text-foreground font-display mb-2">
          {title}
        </h3>
        <p className="text-muted-foreground font-body mb-6 max-w-sm mx-auto">
          {description}
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {action && (
            <Button asChild variant={action.variant || "default"} className="cursor-pointer">
              <Link href={action.href}>
                {action.label}
              </Link>
            </Button>
          )}
          {secondaryAction && (
            <Button asChild variant={secondaryAction.variant || "outline"} className="cursor-pointer">
              <Link href={secondaryAction.href}>
                {secondaryAction.label}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
