import { Search } from "lucide-react"
import { cn } from "@pulse/utils"
import { ICON_STROKE_WIDTH } from "@pulse/constants"

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false
  const p = navigator.platform?.toUpperCase() ?? ""
  if (p.includes("MAC")) return true
  const ua = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData?.platform
  return ua === "macOS"
}

const kbdCap =
  "pointer-events-none inline-flex h-5 min-h-5 items-center justify-center rounded border border-border bg-background px-1.5 text-[10px] font-medium leading-none text-muted-foreground shadow-sm"

export interface CommandPaletteHeaderTriggerProps {
  onClick: () => void
  /** Minimum width of the control (default 260px) */
  minWidthPx?: number
}

/**
 * Header control that opens the app command palette (not a text input).
 * Fixed height for use inside {@link AppHeader} (h-10 row).
 */
export function CommandPaletteHeaderTrigger({
  onClick,
  minWidthPx = 260,
}: CommandPaletteHeaderTriggerProps) {
  const isMac = isMacPlatform()

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minWidth: minWidthPx }}
      className="hidden md:inline-flex h-8 max-h-8 items-center gap-2 rounded-md border border-input bg-muted/50 px-2 text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0"
      aria-label="Open command palette"
    >
      <Search strokeWidth={ICON_STROKE_WIDTH} className="size-3.5 shrink-0 opacity-80" />
      <span className="min-w-0 flex-1 truncate text-left">Search…</span>
      <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
        <kbd
          className={cn(
            kbdCap,
            "font-sans",
            isMac ? "min-w-[1.25rem] px-1.5" : "min-w-[2rem] px-2",
          )}
        >
          {isMac ? "⌘" : "Ctrl"}
        </kbd>
        <kbd className={cn(kbdCap, "min-w-[1.25rem] font-mono")}>K</kbd>
      </span>
    </button>
  )
}
