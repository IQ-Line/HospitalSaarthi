import * as React from "react"
import { cn } from "@pulse/utils"

interface CalendarLayoutProps {
  sidebar: React.ReactNode
  calendar: React.ReactNode
  details: React.ReactNode
  className?: string
  sidebarWidth?: string
  detailsWidth?: string
}

export function CalendarLayout({
  sidebar,
  calendar,
  details,
  className,
  sidebarWidth = "280px",
  detailsWidth = "320px",
}: CalendarLayoutProps) {
  return (
    <div className={cn("flex h-full overflow-hidden", className)}>
      {/* Left Sidebar */}
      <aside
        className="shrink-0 border-r bg-background overflow-hidden hidden lg:flex flex-col"
        style={{ width: sidebarWidth }}
      >
        {sidebar}
      </aside>

      {/* Main Calendar View */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {calendar}
      </main>

      {/* Right Details Panel */}
      <aside
        className="shrink-0 border-l bg-background overflow-hidden hidden xl:flex flex-col"
        style={{ width: detailsWidth }}
      >
        {details}
      </aside>
    </div>
  )
}
