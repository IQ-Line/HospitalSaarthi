import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@pulse/ui/tabs"
import { Badge } from "@pulse/ui/badge"

interface PageTabsProps {
  tabs: Array<{
    value: string
    label: string
    badge?: string | number
    disabled?: boolean
  }>
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

export function PageTabs({ tabs, defaultValue, value, onValueChange }: PageTabsProps) {
  const onValueChangeRef = React.useRef(onValueChange)
  onValueChangeRef.current = onValueChange
  const handleValueChange = React.useCallback((newValue: string) => {
    onValueChangeRef.current?.(newValue)
  }, [])

  const controlled = value !== undefined

  return (
    <div className="border-b px-4">
      <Tabs
        {...(controlled
          ? { value }
          : defaultValue !== undefined
            ? { defaultValue }
            : {})}
        onValueChange={handleValueChange}
      >
        <TabsList variant="line" className="h-9">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className="gap-2 px-4 after:hidden first:pl-0 last:pr-0"
            >
              {tab.label}
              {tab.badge !== undefined && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 text-xs">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

