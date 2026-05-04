import * as React from "react"
import * as ResizablePrimitive from "react-resizable-panels"
import { ScrollArea } from "@pulse/ui/scroll-area"
import { Separator } from "@pulse/ui/separator"
import { ResizablePanel, ResizableHandle } from "@pulse/ui/resizable"
import { cn } from "@pulse/utils"

interface TwoColumnLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
  resizable?: boolean
  // Resizable mode props (percentage-based)
  defaultLeftWidth?: number
  defaultRightWidth?: number
  minLeftWidth?: number
  minRightWidth?: number
  // Fixed width mode props
  leftWidth?: string
  rightWidth?: string
  // Optional headers and footers
  leftHeader?: React.ReactNode
  leftFooter?: React.ReactNode
  rightHeader?: React.ReactNode
  rightFooter?: React.ReactNode
  // Styling options
  showSeparator?: boolean
  scrollable?: boolean // Whether to wrap content in ScrollArea
  noPadding?: boolean // Whether to remove padding from content areas
  leftClassName?: string
  rightClassName?: string
  /** Merged into the main scroll body wrapper for the right column (e.g. `overflow-hidden` for full-height split panes). */
  rightBodyClassName?: string
  className?: string
}

export function TwoColumnLayout({
  left,
  right,
  resizable = true,
  defaultLeftWidth = 50,
  defaultRightWidth = 50,
  minLeftWidth = 20,
  minRightWidth = 20,
  leftWidth = "50%",
  rightWidth = "50%",
  leftHeader,
  leftFooter,
  rightHeader,
  rightFooter,
  showSeparator = true,
  scrollable = true,
  noPadding = false,
  leftClassName,
  rightClassName,
  rightBodyClassName,
  className,
}: TwoColumnLayoutProps) {
  const leftSection = (
    <div className={cn("flex h-full min-h-0 flex-col border-r bg-background", leftClassName)}>
      {leftHeader && (
        <>
          <div className="border-b bg-muted/50 p-4">{leftHeader}</div>
          {showSeparator && <Separator />}
        </>
      )}
      {scrollable ? (
        <ScrollArea className="flex-1 min-h-0">
          {noPadding ? left : <div className="p-4">{left}</div>}
        </ScrollArea>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">{noPadding ? left : <div className="p-4">{left}</div>}</div>
      )}
      {leftFooter && (
        <>
          {showSeparator && <Separator />}
          <div className="border-t bg-muted/50 p-4">{leftFooter}</div>
        </>
      )}
    </div>
  )

  const rightSection = (
    <div className={cn("flex h-full min-h-0 flex-col bg-background", rightClassName)}>
      {rightHeader && (
        <>
          <div className="border-b bg-muted/50 p-4">{rightHeader}</div>
          {showSeparator && <Separator />}
        </>
      )}
      {scrollable ? (
        <ScrollArea className={cn("flex-1 min-h-0", rightBodyClassName)}>
          {noPadding ? right : <div className="p-4">{right}</div>}
        </ScrollArea>
      ) : (
        <div className={cn("flex-1 min-h-0 overflow-auto", rightBodyClassName)}>
          {noPadding ? right : <div className="p-4">{right}</div>}
        </div>
      )}
      {rightFooter && (
        <>
          {showSeparator && <Separator />}
          <div className="border-t bg-muted/50 p-4">{rightFooter}</div>
        </>
      )}
    </div>
  )

  if (!resizable) {
    const leftIsAuto = leftWidth === "auto"
    const rightIsAuto = rightWidth === "auto"
    return (
      <div className={cn("flex h-full min-h-0 w-full", className)}>
        <div
          style={{ width: leftIsAuto ? undefined : leftWidth }}
          className={cn(
            "min-h-0",
            leftIsAuto ? "min-w-0 flex-1" : "shrink-0",
          )}
        >
          {leftSection}
        </div>
        <div
          style={{ width: rightIsAuto ? undefined : rightWidth }}
          className={cn(
            "min-h-0",
            rightIsAuto ? "min-w-0 flex-1" : "shrink-0",
          )}
        >
          {rightSection}
        </div>
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

      {/* Right Section */}
      <ResizablePanel defaultSize={defaultRightWidth} minSize={minRightWidth}>
        {rightSection}
      </ResizablePanel>
    </ResizablePrimitive.Group>
  )
}

