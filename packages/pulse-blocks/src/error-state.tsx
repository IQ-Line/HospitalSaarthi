import * as React from "react"
import { AlertCircle } from "lucide-react"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@pulse/ui/card"
import { ICON_STROKE_WIDTH } from "@pulse/constants"
import { cn } from "@pulse/utils"

export interface ErrorStateProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  actions?: React.ReactNode
  className?: string
}

/**
 * ErrorState - Generic error state component
 * 
 * A flexible error state component for custom error scenarios.
 * 
 * @example
 * ```tsx
 * <ErrorState
 *   title="Something went wrong"
 *   description="Please try again later"
 *   icon={AlertCircle}
 *   actions={<Button>Go Back</Button>}
 * />
 * ```
 */
export function ErrorState({
  title,
  description,
  icon: Icon = AlertCircle,
  actions,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-destructive" strokeWidth={ICON_STROKE_WIDTH} />
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {actions && <CardFooter>{actions}</CardFooter>}
    </Card>
  )
}

