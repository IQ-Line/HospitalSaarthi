import * as React from "react"

interface AppFooterProps {
  /** Defaults to "© {year} IQLine Inc. All rights reserved." */
  copyright?: string
  /** Optional right-side slot for contextual actions or shortcuts. */
  actions?: React.ReactNode
}

export function AppFooter({
  copyright = `© ${new Date().getFullYear()} IQLine Inc. All rights reserved.`,
  actions,
}: AppFooterProps) {
  return (
    <footer className="w-full border-t px-6 py-2">
      <div className="flex w-full items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{copyright}</p>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </footer>
  )
}
