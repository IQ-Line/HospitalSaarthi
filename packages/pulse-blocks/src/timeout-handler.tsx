import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@pulse/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@pulse/ui/alert"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@pulse/ui/card"
import { ICON_STROKE_WIDTH } from "@pulse/constants"
import { cn } from "@pulse/utils"

export interface TimeoutHandlerProps {
  timeout?: number
  onTimeout?: () => void
  onRetry?: () => void
  children: React.ReactNode
  className?: string
  showRetry?: boolean
}

/**
 * TimeoutHandler - Timeout handling component
 * 
 * Automatically detects timeouts and shows an error with retry option.
 * Useful for APIs with known timeout limits.
 * 
 * @example
 * ```tsx
 * <TimeoutHandler timeout={10000} onTimeout={() => handleTimeout()} onRetry={() => refetch()}>
 *   <DataComponent />
 * </TimeoutHandler>
 * ```
 */
export function TimeoutHandler({
  timeout = 10000,
  onTimeout,
  onRetry,
  children,
  className,
  showRetry = true,
}: TimeoutHandlerProps) {
  const [hasTimedOut, setHasTimedOut] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimedOut(true)
      onTimeout?.()
    }, timeout)

    return () => clearTimeout(timer)
  }, [timeout, onTimeout])

  if (hasTimedOut) {
    return (
      <div className={cn("flex min-h-[200px] items-center justify-center", className)}>
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" strokeWidth={ICON_STROKE_WIDTH} />
              <CardTitle>Request Timeout</CardTitle>
            </div>
            <CardDescription>
              The request took too long to complete. This might be due to a slow connection or server issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
              <AlertTitle>Timeout Error</AlertTitle>
              <AlertDescription>
                The request exceeded the timeout limit of {timeout / 1000} seconds.
              </AlertDescription>
            </Alert>
          </CardContent>
          {showRetry && onRetry && (
            <CardFooter>
              <Button onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
                Retry Request
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

