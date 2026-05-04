import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@pulse/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@pulse/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@pulse/ui/card"
import { ICON_STROKE_WIDTH } from "@pulse/constants"
import { cn } from "@pulse/utils"

const dataErrorVariants = cva("", {
  variants: {
    variant: {
      inline: "",
      card: "",
      "full-page": "flex min-h-[400px] items-center justify-center",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

export interface DataErrorProps extends VariantProps<typeof dataErrorVariants> {
  error: Error | string
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
}

/**
 * DataError - Data error component
 * 
 * Displays errors related to data fetching, parsing, or processing.
 * Supports inline, card, and full-page variants.
 * 
 * @example
 * ```tsx
 * <DataError 
 *   error={new Error("Failed to load data")}
 *   onRetry={() => refetch()}
 *   variant="card"
 * />
 * ```
 */
export function DataError({
  error,
  onRetry,
  title = "Failed to load data",
  description,
  variant = "card",
  className,
}: DataErrorProps) {
  const errorMessage = typeof error === "string" ? error : error.message

  if (variant === "inline") {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description || errorMessage}</AlertDescription>
        {onRetry && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
              Retry
            </Button>
          </div>
        )}
      </Alert>
    )
  }

  if (variant === "full-page") {
    return (
      <div className={cn(dataErrorVariants({ variant }), className)}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" strokeWidth={ICON_STROKE_WIDTH} />
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription>{description || errorMessage}</CardDescription>
          </CardHeader>
          {onRetry && (
            <CardFooter>
              <Button onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
                Try Again
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    )
  }

  // Default: card variant
  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" strokeWidth={ICON_STROKE_WIDTH} />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description || errorMessage}</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="font-mono text-sm">{errorMessage}</AlertDescription>
        </Alert>
      </CardContent>
      {onRetry && (
        <CardFooter>
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
            Try Again
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

