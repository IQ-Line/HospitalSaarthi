import * as React from "react"
import { PageHeader } from "@pulse/blocks/page-header"
import { PageTabs } from "@pulse/blocks/page-tabs"
import { Tabs, TabsList, TabsTrigger } from "@pulse/ui/tabs"
import { Badge } from "@pulse/ui/badge"

export interface PageHeaderWithTabsProps {
  title: string
  /** Optional subtitle under the title (muted, smaller text). */
  description?: string
  leading?: React.ReactNode
  /** Renders after the title in the header (e.g. scan/search input). */
  titleTrailing?: React.ReactNode
  actions?: React.ReactNode
  tabs: Array<{
    value: string
    label: string
    badge?: string | number
    disabled?: boolean
  }>
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  /**
   * When provided, the component becomes a `<Tabs>` root wrapper and
   * `children` (typically `<TabsContent>` panels + page body) live inside it.
   * When omitted, the component renders as a plain header + tab-bar fragment
   * and you control content via React conditionals in the parent.
   */
  children?: React.ReactNode
  /** Only used when `children` is provided. Defaults to "flex min-h-0 flex-1 flex-col". */
  className?: string
}

export function PageHeaderWithTabs({
  title,
  description,
  leading,
  titleTrailing,
  actions,
  tabs,
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: PageHeaderWithTabsProps) {
  const onValueChangeRef = React.useRef(onValueChange)
  onValueChangeRef.current = onValueChange
  const stableOnValueChange = React.useCallback((v: string) => {
    onValueChangeRef.current?.(v)
  }, [])

  // ── With children: Tabs root wrapper (medcrm pattern) ──────────────────────
  // Note: PageTabs cannot be used here because it wraps its own <Tabs> context,
  // which would disconnect TabsContent panels from the outer Tabs root.
  // The tab bar is inlined to stay inside the same Tabs context.
  if (children !== undefined) {
    return (
      <Tabs
        {...(value !== undefined ? { value } : defaultValue !== undefined ? { defaultValue } : {})}
        onValueChange={stableOnValueChange}
        className={className ?? "flex min-h-0 flex-1 flex-col"}
      >
        <PageHeader
          title={title}
          description={description}
          leading={leading}
          titleTrailing={titleTrailing}
          actions={actions}
          noBorder
        />
        <div className="flex border-b px-4">
          <TabsList variant="line" className="h-9">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                disabled={tab.disabled}
                className="gap-2 px-4 first:pl-0 last:pr-0"
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
        </div>
        {children}
      </Tabs>
    )
  }

  // ── Without children: plain header + tab-bar fragment (iqhealth pattern) ───
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        leading={leading}
        titleTrailing={titleTrailing}
        actions={actions}
        noBorder
      />
      <PageTabs
        tabs={tabs}
        defaultValue={defaultValue}
        value={value}
        onValueChange={onValueChange}
      />
    </>
  )
}
