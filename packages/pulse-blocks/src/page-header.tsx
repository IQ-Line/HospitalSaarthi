import * as React from "react"
import { cn } from "@pulse/utils"

interface PageHeaderProps {
  title: string
  /** Optional subtitle under the title (muted, smaller text). */
  description?: string
  leading?: React.ReactNode
  /** Renders after the title in the left zone (e.g. segmented view switcher beside title). */
  titleTrailing?: React.ReactNode
  actions?: React.ReactNode
  noBorder?: boolean
  /** Extra classes on the header row (e.g. `h-auto flex-wrap` when the toolbar grows). */
  className?: string
}

export function PageHeader({
  title,
  description,
  leading,
  titleTrailing,
  actions,
  noBorder,
  className,
}: PageHeaderProps) {
  const headerRef = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={headerRef}
      className={cn(
        "sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 bg-background px-4 py-2 transition-all border-b",
        !description && "h-14 py-0",
        noBorder && "border-b-0",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {leading}
        <div className="flex min-w-0 flex-col gap-0.5 shrink-0">
          <h1 className="text-lg font-semibold whitespace-nowrap">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground font-normal whitespace-normal">{description}</p>
          ) : null}
        </div>
        {titleTrailing}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

