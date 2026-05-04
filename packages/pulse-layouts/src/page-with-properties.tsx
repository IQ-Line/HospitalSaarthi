import * as React from "react"

interface PageWithPropertiesProps {
  content: React.ReactNode
  properties: React.ReactNode
  propertiesWidth?: string
}

export function PageWithProperties({
  content,
  properties,
  propertiesWidth = "320px",
}: PageWithPropertiesProps) {
  return (
    <div className="flex h-full">
      <main className="flex-1 overflow-auto">{content}</main>
      <aside className="border-l" style={{ width: propertiesWidth }}>
        {properties}
      </aside>
    </div>
  )
}

