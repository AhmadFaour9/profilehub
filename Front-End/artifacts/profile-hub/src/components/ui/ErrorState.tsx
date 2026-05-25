import { AlertCircle } from "lucide-react";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  testId?: string;
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "There was an error loading the data. Please try again.", 
  onRetry,
  testId
}: ErrorStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center p-8 text-center border border-destructive/20 rounded-lg bg-destructive/5 min-h-[300px]"
      data-testid={testId || "error-state"}
    >
      <AlertCircle className="w-10 h-10 text-destructive mb-4" />
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} data-testid="btn-retry">
          Try Again
        </Button>
      )}
    </div>
  );
}
