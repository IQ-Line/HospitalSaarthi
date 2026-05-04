import * as React from "react"

interface SplitLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
  leftWidth?: string
  rightWidth?: string
}

export function SplitLayout({ left, right, leftWidth = "70%", rightWidth = "30%" }: SplitLayoutProps) {
  return (
    <div className="flex h-full">
      <div className="border-r" style={{ width: leftWidth }}>
        {left}
      </div>
      <div style={{ width: rightWidth }}>
        {right}
      </div>
    </div>
  )
}

