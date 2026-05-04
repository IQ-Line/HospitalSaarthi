import { cn } from "@pulse/utils"
import { Spinner } from "@pulse/ui/spinner"
import { Skeleton } from "@pulse/ui/skeleton"

export interface LoadingStateProps {
  message?: string
  size?: "sm" | "md" | "lg"
  variant?: "spinner" | "skeleton" | "dots"
  className?: string
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

/**
 * LoadingState - Full-page loading component
 * 
 * Displays a loading indicator for full-page or section-level loading states.
 * 
 * @example
 * ```tsx
 * <LoadingState message="Loading data..." variant="spinner" size="lg" />
 * ```
 */
export function LoadingState({
  message = "Loading...",
  size = "md",
  variant = "spinner",
  className,
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}
        role="status"
        aria-live="polite"
        aria-label={message || "Loading content"}
      >
        <div className="flex flex-col gap-2 w-full max-w-md" aria-hidden="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {message && (
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>
    )
  }

  if (variant === "dots") {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}
        role="status"
        aria-live="polite"
        aria-label={message || "Loading"}
      >
        <div className="flex gap-2" aria-hidden="true">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    )
  }

  return (
    <div 
      className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}
      role="status"
      aria-live="polite"
      aria-label={message || "Loading"}
    >
      <Spinner className={sizeMap[size]} aria-hidden="true" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}

