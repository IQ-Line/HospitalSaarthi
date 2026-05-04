import { AlertCircle, RefreshCw, WifiOff, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@pulse/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@pulse/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@pulse/ui/alert"
import { ICON_STROKE_WIDTH } from "@pulse/constants"
import { cn } from "@pulse/utils"

export interface ApiErrorProps {
  error: {
    status?: number
    message?: string
    type?: "network" | "timeout" | "http"
  }
  onRetry?: () => void
  title?: string
  description?: string
  className?: string
}

const getErrorDetails = (status?: number, type?: string) => {
  if (type === "network") {
    return {
      icon: WifiOff,
      title: "Network Error",
      description: "Unable to connect to the server. Please check your internet connection.",
    }
  }

  if (type === "timeout") {
    return {
      icon: Clock,
      title: "Request Timeout",
      description: "The request took too long to complete. Please try again.",
    }
  }

  switch (status) {
    case 400:
      return {
        icon: AlertCircle,
        title: "Bad Request",
        description: "The request was invalid. Please check your input and try again.",
      }
    case 401:
      return {
        icon: AlertCircle,
        title: "Unauthorized",
        description: "You need to be logged in to access this resource.",
      }
    case 403:
      return {
        icon: AlertTriangle,
        title: "Forbidden",
        description: "You don't have permission to access this resource.",
      }
    case 404:
      return {
        icon: AlertCircle,
        title: "Not Found",
        description: "The requested resource could not be found.",
      }
    case 500:
      return {
        icon: AlertCircle,
        title: "Server Error",
        description: "Something went wrong on our end. Please try again later.",
      }
    default:
      return {
        icon: AlertCircle,
        title: "Error",
        description: "An unexpected error occurred.",
      }
  }
}

/**
 * ApiError - API error display component
 * 
 * Displays API errors with appropriate messaging based on error type and status code.
 * Handles network errors, HTTP errors (400, 401, 403, 404, 500), and timeout errors.
 * 
 * @example
 * ```tsx
 * <ApiError 
 *   error={{ status: 500, message: "Internal server error" }}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function ApiError({
  error,
  onRetry,
  title,
  description,
  className,
}: ApiErrorProps) {
  const errorDetails = getErrorDetails(error.status, error.type)
  const Icon = errorDetails.icon

  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-destructive" strokeWidth={ICON_STROKE_WIDTH} />
          <CardTitle>{title || errorDetails.title}</CardTitle>
        </div>
        <CardDescription>
          {description || error.message || errorDetails.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error.status && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
            <AlertTitle>Error {error.status}</AlertTitle>
            <AlertDescription className="font-mono text-sm">
              {error.message || errorDetails.description}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      {onRetry && (
        <CardFooter className="flex gap-2">
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
            Try Again
          </Button>
          {error.status === 401 && (
            <Button variant="outline" onClick={() => window.location.href = "/login"} className="gap-2">
              Go to Login
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

