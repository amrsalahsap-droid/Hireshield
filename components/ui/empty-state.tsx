import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: {
    icon: "w-8 h-8",
    title: "text-sm font-medium",
    description: "text-xs",
    spacing: "py-4"
  },
  md: {
    icon: "w-12 h-12", 
    title: "text-base font-medium",
    description: "text-sm",
    spacing: "py-8"
  },
  lg: {
    icon: "w-16 h-16",
    title: "text-lg font-medium", 
    description: "text-base",
    spacing: "py-12"
  }
};

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  className,
  size = "md" 
}: EmptyStateProps) {
  const styles = sizeStyles[size];
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      styles.spacing,
      className
    )}>
      <Icon className={cn(
        "text-muted-foreground mb-4",
        styles.icon
      )} />
      
      <h3 className={cn(
        "text-foreground mb-2",
        styles.title
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "text-muted-foreground mb-6 max-w-sm",
          styles.description
        )}>
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            action.variant === "primary"
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
