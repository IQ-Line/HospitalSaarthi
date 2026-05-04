import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Search, Database, Lock } from "lucide-react"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@pulse/ui/empty"
import { ICON_STROKE_WIDTH } from "@pulse/constants"
import { cn } from "@pulse/utils"

const emptyStateVariants = cva("", {
  variants: {
    variant: {
      "no-data": "",
      "no-results": "",
      "no-permission": "",
    },
  },
  defaultVariants: {
    variant: "no-data",
  },
})

const variantConfig = {
  "no-data": {
    icon: Database,
    defaultTitle: "No data available",
    defaultDescription: "There's no data to display at the moment.",
  },
  "no-results": {
    icon: Search,
    defaultTitle: "No results found",
    defaultDescription: "Try adjusting your search or filters to find what you're looking for.",
  },
  "no-permission": {
    icon: Lock,
    defaultTitle: "Access denied",
    defaultDescription: "You don't have permission to view this content.",
  },
}

export interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
  action?: React.ReactNode
  className?: string
}

/**
 * EmptyState - Enhanced empty state component
 * 
 * Displays empty states for different scenarios: no data, no search results, no permissions.
 * Built on top of the existing Empty UI component.
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   variant="no-results"
 *   title="No matches found"
 *   description="Try a different search term"
 *   action={<Button>Clear Filters</Button>}
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  variant = "no-data",
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant || "no-data"]
  const Icon = icon || config.icon

  return (
    <Empty className={cn(emptyStateVariants({ variant }), className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={ICON_STROKE_WIDTH} />
        </EmptyMedia>
        <EmptyContent>
          <EmptyTitle>{title || config.defaultTitle}</EmptyTitle>
          <EmptyDescription>{description || config.defaultDescription}</EmptyDescription>
        </EmptyContent>
      </EmptyHeader>
      {action && <div className="mt-4">{action}</div>}
    </Empty>
  )
}

