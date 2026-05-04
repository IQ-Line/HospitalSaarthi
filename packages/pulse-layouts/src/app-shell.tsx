import * as React from "react"
import { Outlet } from "@tanstack/react-router"
import { SidebarProvider, SidebarInset } from "@pulse/ui/sidebar"

interface AppShellProps {
  /** The app's sidebar — rendered inside SidebarProvider */
  sidebar: React.ReactNode
  /** The app's header — rendered at the top of SidebarInset */
  header: React.ReactNode
  /** Optional footer content */
  footer?: React.ReactNode
  /** Whether to show the footer. Defaults to false (hidden). */
  showFooter?: boolean
  /**
   * Slot rendered between <main> and the footer.
   * Use for persistent app-wide bars (e.g. scan bars, scan queues).
   */
  belowMain?: React.ReactNode
  /** Global overlays rendered outside the layout (e.g. CommandPalette) */
  commandPalette?: React.ReactNode
}

export function AppShell({
  sidebar,
  header,
  footer,
  showFooter = false,
  belowMain,
  commandPalette,
}: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {sidebar}
        <SidebarInset className="flex h-full flex-col overflow-hidden">
          {header}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
          {belowMain}
          {showFooter && footer}
        </SidebarInset>
      </div>
      {commandPalette}
    </SidebarProvider>
  )
}
