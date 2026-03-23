import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorVariant = "generic" | "db-unavailable";

const VARIANT_DEFAULTS: Record<ErrorVariant, { icon: string; title: string; message: string }> = {
  generic: {
    icon: "⚠️",
    title: "Something went wrong",
    message: "We encountered an unexpected error. Please try again.",
  },
  "db-unavailable": {
    icon: "🔌",
    title: "Database Unavailable",
    message:
      "The database server cannot be reached right now. This usually resolves on its own — try again in a few seconds.",
  },
};

interface ErrorStateProps {
  variant?: ErrorVariant;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backText?: string;
  retryText?: string;
  icon?: string;
}

export function ErrorState({
  variant = "generic",
  title,
  message,
  onRetry,
  onBack,
  backText = "Go Back",
  retryText = "Try Again",
  icon,
}: ErrorStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const resolvedIcon = icon ?? defaults.icon;
  const resolvedTitle = title ?? defaults.title;
  const resolvedMessage = message ?? defaults.message;

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-destructive text-6xl mb-4">{resolvedIcon}</div>
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">{resolvedTitle}</h1>
        <p className="text-muted-foreground font-body mb-6">{resolvedMessage}</p>
        <div className="space-x-3 flex justify-center flex-wrap gap-2">
          {onRetry && (
            <Button variant="destructive" onClick={onRetry}>
              {retryText}
            </Button>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              {backText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: {
    text: string;
    onClick: () => void;
    variant?: "default" | "outline";
  };
  icon?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  title = "No data found",
  message = "There's nothing to show here yet.",
  action,
  icon = "📋",
  size = "md"
}: EmptyStateProps) {
  const sizeClasses = {
    sm: "py-8",
    md: "py-12", 
    lg: "py-16"
  };

  const iconSizes = {
    sm: "text-4xl",
    md: "text-5xl",
    lg: "text-6xl"
  };

  const titleSizes = {
    sm: "text-section",
    md: "text-lg font-medium",
    lg: "text-xl font-medium"
  };

  return (
    <div className={`text-center ${sizeClasses[size]} bg-card border border-border rounded-card`}>
      <div className={`${iconSizes[size]} text-muted-foreground mb-4`}>{icon}</div>
      <h3 className={`${titleSizes[size]} text-foreground font-display mb-2`}>{title}</h3>
      <p className="text-body-size text-muted-foreground font-body mb-6 max-w-md mx-auto">{message}</p>
      {action && (
        <Button 
          onClick={action.onClick}
          variant={action.variant || "default"}
          className="mx-auto"
        >
          {action.text}
        </Button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  icon?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  message = "Loading...",
  icon = "🔄",
  size = "md"
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12", 
    lg: "h-16 w-16"
  };

  const iconSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl"
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-primary mx-auto mb-4`}></div>
        <div className={`${iconSizes[size]} text-muted-foreground mb-2`}>{icon}</div>
        <div className="text-body-size text-muted-foreground font-body">{message}</div>
      </div>
    </div>
  );
}
