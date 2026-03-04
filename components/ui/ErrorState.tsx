import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  backText?: string;
  retryText?: string;
  icon?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We encountered an unexpected error. Please try again.",
  onRetry,
  onBack,
  backText = "Go Back",
  retryText = "Try Again",
  icon = "⚠️"
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="text-destructive text-6xl mb-4">{icon}</div>
        <h1 className="text-2xl font-bold text-foreground font-display mb-2">{title}</h1>
        <p className="text-muted-foreground font-body mb-6">{message}</p>
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
  };
  icon?: string;
}

export function EmptyState({
  title = "No data found",
  message = "There's nothing to show here yet.",
  action,
  icon = "📋"
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-white rounded-lg shadow">
      <div className="text-gray-400 text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          {action.text}
        </button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  icon?: string;
}

export function LoadingState({
  message = "Loading...",
  icon = "🔄"
}: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <div className="text-muted-foreground font-body">{message}</div>
      </div>
    </div>
  );
}
