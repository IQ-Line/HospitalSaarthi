import * as React from "react"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { AlertCircle, Copy, RefreshCw, Home } from "lucide-react"
import { Button } from "@pulse/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@pulse/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@pulse/ui/alert"

interface RouteErrorBoundaryProps {
  error: Error
}

export function RouteErrorBoundary({ error }: RouteErrorBoundaryProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const [copied, setCopied] = React.useState(false)

  const errorMessage = error instanceof Error
    ? error.message
    : "An unexpected error occurred"

  const errorStack = error instanceof Error ? error.stack : undefined
  const errorDetails = React.useMemo(() => {
    const details: Record<string, unknown> = {
      message: errorMessage,
    }

    if (error instanceof Error) {
      details.name = error.name
      details.stack = error.stack
    }

    return JSON.stringify(details, null, 2)
  }, [error, errorMessage])

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
    navigate({ to: "/" })
  }

  const tryAgain = () => {
    router.invalidate()
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
              {errorMessage}
            </AlertDescription>
          </Alert>

          {(errorStack || errorDetails) && (
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
          <Button onClick={tryAgain} className="gap-2">
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
