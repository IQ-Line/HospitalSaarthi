import * as React from "react"
import { AlertCircle, Copy, RefreshCw, Home } from "lucide-react"
import { Button } from "@pulse/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@pulse/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@pulse/ui/alert"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error | null
  errorInfo: React.ErrorInfo | null
  resetError: () => void
}

function DefaultErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  const [copied, setCopied] = React.useState(false)

  const errorDetails = React.useMemo(() => {
    if (!error) return ""

    const details = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      name: error.name,
    }

    return JSON.stringify(details, null, 2)
  }, [error, errorInfo])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(errorDetails)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy error:", err)
    }
  }

  const goHome = () => {
    window.location.href = "/"
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="font-mono text-sm">
              {error?.message || "Unknown error occurred"}
            </AlertDescription>
          </Alert>

          {error?.stack && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Error Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : "Copy Error"}
                </Button>
              </div>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
                <code>{errorDetails}</code>
              </pre>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={resetError} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={goHome} className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

