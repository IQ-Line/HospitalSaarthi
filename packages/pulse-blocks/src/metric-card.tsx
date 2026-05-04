import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@pulse/ui/card"
import { Badge } from "@pulse/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { ICON_STROKE_WIDTH } from "@pulse/constants"

export interface MetricCardProps {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  description?: string
  variant?: "default" | "compact"
  className?: string
}

/**
 * Metric Card Block
 * 
 * A reusable metric card component for displaying key performance indicators
 * with trend indicators and optional descriptions.
 * 
 * @example
 * ```tsx
 * <MetricCard
 *   title="Total Revenue"
 *   value="$124,580"
 *   change="+12.5%"
 *   trend="up"
 *   icon={DollarSign}
 *   description="Revenue for the last 30 days"
 * />
 * ```
 */
export function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  description,
  variant = "default",
  className,
}: MetricCardProps) {
  if (variant === "compact") {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {trend === "up" ? (
              <TrendingUp className="size-3 text-success" />
            ) : trend === "down" ? (
              <TrendingDown className="size-3 text-destructive" />
            ) : null}
            <span>{change}</span>
            {trend !== "neutral" && <span>from last month</span>}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            {trend === "up" ? (
              <TrendingUp strokeWidth={ICON_STROKE_WIDTH} className="h-3 w-3" />
            ) : trend === "down" ? (
              <TrendingDown strokeWidth={ICON_STROKE_WIDTH} className="h-3 w-3" />
            ) : null}
            {change}
          </Badge>
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="flex gap-2 font-medium">
          {trend === "up" ? (
            <>
              Trending up this month{" "}
              <TrendingUp strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
            </>
          ) : trend === "down" ? (
            <>
              Down this period{" "}
              <TrendingDown strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
            </>
          ) : null}
        </div>
        {description && (
          <div className="text-muted-foreground">{description}</div>
        )}
      </CardFooter>
    </Card>
  )
}

