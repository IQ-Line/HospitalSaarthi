import { cn } from "@pulse/utils"
import { Skeleton } from "@pulse/ui/skeleton"
import { Card, CardContent, CardHeader } from "@pulse/ui/card"

export interface SkeletonLoaderProps {
  variant?: "card" | "table" | "list" | "avatar" | "lines"
  lines?: number
  className?: string
}

/**
 * SkeletonLoader - Pre-built skeleton loading patterns
 * 
 * Provides common skeleton patterns for different content types.
 * 
 * @example
 * ```tsx
 * <SkeletonLoader variant="card" />
 * <SkeletonLoader variant="table" />
 * <SkeletonLoader variant="lines" lines={5} />
 * ```
 */
export function SkeletonLoader({
  variant = "lines",
  lines = 3,
  className,
}: SkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mt-2" />
          <Skeleton className="h-4 w-4/6 mt-2" />
        </CardContent>
      </Card>
    )
  }

  if (variant === "table") {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        {/* Table Header */}
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
        {/* Table Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === "list") {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "avatar") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    )
  }

  // Default: lines
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : i === lines - 2 ? "w-5/6" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

