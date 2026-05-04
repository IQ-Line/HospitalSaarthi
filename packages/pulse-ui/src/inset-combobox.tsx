"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@pulse/utils"

// ─── InsetCombobox ─────────────────────────────────────────────────────────────
//
// A select-style combobox with the label inset in the top border — same visual
// language as InsetInput/InsetSelect but backed by @base-ui/react for a
// keyboard-navigable, accessible overlay dropdown.
//
// Usage:
//   <InsetCombobox label="Blood Group" value={val} onValueChange={setVal}>
//     <InsetComboboxItem value="A+">A+</InsetComboboxItem>
//     …
//   </InsetCombobox>
//
// For long lists (e.g. states) add `searchable` to get a filter input inside
// the popup.

interface InsetComboboxProps {
  label: string
  labelClassName?: string
  className?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, event: Event) => void
  placeholder?: string
  disabled?: boolean
  "aria-invalid"?: boolean | "true" | "false"
  /** Show a search input inside the popup to filter items. */
  searchable?: boolean
  children: React.ReactNode
}

function InsetCombobox({
  label,
  labelClassName,
  className,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  disabled,
  "aria-invalid": ariaInvalid,
  searchable = false,
  children,
}: InsetComboboxProps) {
  const hasError = !!ariaInvalid
  // base-ui treats "" as a valid selected value and won't show the placeholder.
  // Normalise empty string → undefined so the placeholder renders correctly.
  const normalizedValue = value || undefined

  const handleValueChange = React.useCallback(
    (next: string | null, eventDetails: unknown) => {
      onValueChange?.(next ?? "", eventDetails as Event)
    },
    [onValueChange],
  )

  return (
    <ComboboxPrimitive.Root
      value={normalizedValue}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? handleValueChange : undefined}
      disabled={disabled}
    >
      <div
        className={cn(
          "border-input relative rounded-lg border bg-transparent transition-colors",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          hasError && "border-destructive ring-[3px] ring-destructive/20 dark:ring-destructive/40",
          disabled && "pointer-events-none opacity-50",
          className
        )}
      >
        <span
          className={cn(
            "bg-background text-muted-foreground absolute left-3 top-0 -translate-y-1/2 select-none px-1 text-xs leading-none",
            labelClassName
          )}
        >
          {label}
        </span>
        <ComboboxPrimitive.Trigger className="flex w-full items-center px-3 pt-[0.4375rem] pb-[0.3125rem] text-sm outline-none">
          <span className="min-w-0 flex-1 truncate text-left">
            <ComboboxPrimitive.Value
              placeholder={<span className="text-muted-foreground/50">{placeholder}</span>}
            />
          </span>
          <ChevronDown className="text-muted-foreground ml-1 size-3.5 shrink-0 pointer-events-none" />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          sideOffset={6}
          align="start"
          className="z-[100]"
        >
          <ComboboxPrimitive.Popup
            className={cn(
              "bg-popover text-popover-foreground ring-foreground/10 overflow-hidden rounded-lg shadow-md ring-1 duration-100",
              "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
              "data-closed:zoom-out-95 data-open:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
              "w-(--anchor-width) max-h-(--available-height) max-w-(--available-width) origin-(--transform-origin)"
            )}
          >
            {searchable && (
              <div className="border-b px-2 py-1.5">
                <ComboboxPrimitive.Input
                  placeholder="Search…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            )}
            <ComboboxPrimitive.List className="no-scrollbar max-h-64 overflow-y-auto overscroll-contain p-1 scroll-py-1">
              {children}
              <ComboboxPrimitive.Empty className="text-muted-foreground hidden w-full justify-center py-2 text-center text-sm group-data-empty/combobox-content:flex" />
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

// ─── InsetComboboxItem ─────────────────────────────────────────────────────────

interface InsetComboboxItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
}

function InsetComboboxItem({ value, children, disabled }: InsetComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-md py-1 pl-1.5 pr-8 text-sm outline-none",
        "data-disabled:pointer-events-none data-disabled:opacity-50"
      )}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
      >
        <Check className="size-3.5 pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export { InsetCombobox, InsetComboboxItem }
