import * as React from "react"
import * as ResizablePrimitive from "react-resizable-panels"
import { ScrollArea } from "@pulse/ui/scroll-area"
import { ResizablePanel, ResizableHandle } from "@pulse/ui/resizable"
import { cn } from "@pulse/utils"

interface ThreeColumnLayoutProps {
  left: React.ReactNode
  content: React.ReactNode
  right: React.ReactNode
  resizable?: boolean
  defaultLeftWidth?: number
  defaultContentWidth?: number
  defaultRightWidth?: number
  minLeftWidth?: number
  minContentWidth?: number
  minRightWidth?: number
  leftWidth?: string
  rightWidth?: string
  className?: string
}

export function ThreeColumnLayout({
  left,
  content,
  right,
  resizable = true,
  defaultLeftWidth = 20,
  defaultContentWidth = 60,
  defaultRightWidth = 20,
  minLeftWidth = 15,
  minContentWidth = 30,
  minRightWidth = 15,
  leftWidth = "240px",
  rightWidth = "320px",
  className,
}: ThreeColumnLayoutProps) {
  const leftSection = (
    <aside className="flex h-full flex-col border-r bg-muted/50">
      <ScrollArea className="flex-1">
        <div className="p-4">{left}</div>
      </ScrollArea>
    </aside>
  )

  const contentSection = (
    <main className="flex h-full flex-col overflow-auto bg-background">
      <ScrollArea className="flex-1">
        <div className="p-4">{content}</div>
      </ScrollArea>
    </main>
  )

  const rightSection = (
    <aside className="flex h-full flex-col border-l bg-muted/50">
      <ScrollArea className="flex-1">
        <div className="p-4">{right}</div>
      </ScrollArea>
    </aside>
  )

  if (!resizable) {
    return (
      <div className={cn("flex h-full", className)}>
        <div style={{ width: leftWidth }}>{leftSection}</div>
        <div className="flex-1">{contentSection}</div>
        <div style={{ width: rightWidth }}>{rightSection}</div>
      </div>
    )
  }

  return (
    <ResizablePrimitive.Group
      {...({ direction: "horizontal" } as any)}
      className={cn("flex h-full w-full", className)}
    >
      {/* Left Section */}
      <ResizablePanel defaultSize={defaultLeftWidth} minSize={minLeftWidth}>
        {leftSection}
      </ResizablePanel>

      <ResizableHandle className="hover:bg-border/50 transition-colors cursor-col-resize" />

      {/* Content Section */}
      <ResizablePanel defaultSize={defaultContentWidth} minSize={minContentWidth}>
        {contentSection}
      </ResizablePanel>

      <ResizableHandle className="hover:bg-border/50 transition-colors cursor-col-resize" />

      {/* Right Section (Properties) */}
      <ResizablePanel defaultSize={defaultRightWidth} minSize={minRightWidth}>
        {rightSection}
      </ResizablePanel>
    </ResizablePrimitive.Group>
  )
}

