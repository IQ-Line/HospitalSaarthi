import * as React from "react"
import {
  Card,
  CardContent,
  CardTitle,
} from "@pulse/ui/card"
import { Badge } from "@pulse/ui/badge"
import { Button } from "@pulse/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@pulse/ui/tooltip"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@pulse/utils"

// ── Well types ─────────────────────────────────────────────────────────────────

export type WellStatus =
  | "empty"
  | "unassigned"
  | "unassigned-urgent"
  | "request-sent"
  | "assigned"
  /**
   * unslotted — sample is associated with this tray but has no confirmed slot
   * position in the database. Rendered as a dashed blue border so a tech can
   * distinguish "definitely in slot X" from "somewhere in this tray".
   */
  | "unslotted"
  /**
   * scan-out — this slot is actively being scanned to remove a sample.
   * Pulsing dashed red. Transient — set and cleared by the parent.
   */
  | "scan-out"
  /**
   * scan-in — a scanned sample is being placed into this slot.
   * Pulsing dashed green. Transient — set and cleared by the parent.
   */
  | "scan-in"

export interface Well {
  id: string
  row: number
  col: string
  status: WellStatus
  sampleId?: string
  /** Patient full name — shown in the slot tooltip */
  patientName?: string
  /** Patient MRN — shown in the slot tooltip */
  patientMrn?: string
  /** Human-readable collection status — shown in the slot tooltip */
  collectionStatus?: string
}

export interface Tray {
  id: string
  name: string
  columns: string[]
  rows: number
  wells: Well[]
}

// ── Status label map ───────────────────────────────────────────────────────────

const WELL_STATUS_LABELS: Record<WellStatus, string> = {
  empty:               "empty",
  unassigned:          "collected — awaiting processing",
  "unassigned-urgent": "urgent — awaiting processing",
  "request-sent":      "accessioned / processing",
  assigned:            "resulted / released",
  unslotted:           "in tray — slot not confirmed",
  "scan-out":          "scanning out — removing sample",
  "scan-in":           "scanning in — placing sample",
}

// ── Tray operational status config ────────────────────────────────────────────

const TRAY_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available:        { label: "Available",      className: "border-muted-foreground text-muted-foreground" },
  in_preparation:   { label: "In Preparation", className: "border-amber-500 text-amber-700" },
  ready_for_pickup: { label: "Ready",          className: "border-blue-500 text-blue-700" },
  in_transit:       { label: "In Transit",     className: "border-cyan-500 text-cyan-700" },
  at_destination:   { label: "At Destination", className: "border-indigo-500 text-indigo-700" },
  empty_at_remote:  { label: "Empty (Remote)", className: "border-orange-500 text-orange-700" },
  returning:        { label: "Returning",      className: "border-yellow-500 text-yellow-700" },
  returned:         { label: "Returned",       className: "border-green-500 text-green-700" },
  in_cleaning:      { label: "In Cleaning",    className: "border-pink-500 text-pink-700" },
  maintenance:      { label: "Maintenance",    className: "border-rose-500 text-rose-700" },
}

// ── Well colour classes ────────────────────────────────────────────────────────

function wellStatusFillClass(status: WellStatus): string {
  switch (status) {
    case "unassigned":         return "border-blue-500 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-400"
    case "unassigned-urgent":  return "border-red-500 bg-red-50 dark:bg-red-950/50 dark:border-red-400"
    case "request-sent":       return "border-green-500 bg-green-50 dark:bg-green-950/50 dark:border-green-400"
    case "assigned":           return "border-purple-500 bg-purple-50 dark:bg-purple-950/50 dark:border-purple-400"
    case "unslotted":          return "border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-500"
    default:                   return "border-border bg-muted/50"
  }
}

function getWellColorClass(
  status: WellStatus,
  isSelected: boolean,
  isFilterHighlight: boolean,
): string {
  // Scan states take highest visual priority
  if (status === "scan-out")
    return "border-dashed border-red-500 bg-red-100 dark:bg-red-950/60 dark:border-red-400 animate-pulse"
  if (status === "scan-in")
    return "border-dashed border-green-500 bg-green-100 dark:bg-green-950/60 dark:border-green-400 animate-pulse"
  return cn(
    wellStatusFillClass(status),
    isSelected && "border-primary bg-primary/20 ring-2 ring-primary/20",
    // Amber outline: Smart Deck / tray filter matches (stack with primary ring when both)
    isFilterHighlight && "outline outline-2 outline-amber-500 outline-offset-1 z-[1] shadow-sm",
  )
}

// ── Colour-blind inner shape ───────────────────────────────────────────────────
// A tiny secondary shape inside each well so status is never colour-only.

function WellInnerShape({ status }: { status: WellStatus }) {
  switch (status) {
    case "unassigned":
      // Solid circle — "something is here"
      return <span className="block h-2 w-2 rounded-full bg-blue-500/70 pointer-events-none" />
    case "unassigned-urgent":
      // Diamond — "urgent / priority"
      return <span className="block h-2 w-2 rotate-45 bg-red-500/70 pointer-events-none" />
    case "request-sent":
      // Hollow ring — "in pipeline"
      return <span className="block h-2 w-2 rounded-full border border-green-600/80 pointer-events-none" />
    case "assigned":
      // Solid square — "done"
      return <span className="block h-1.5 w-1.5 rounded-[2px] bg-purple-500/70 pointer-events-none" />
    case "unslotted":
      // Dashed ring — "uncertain position"
      return <span className="block h-2 w-2 rounded-full border border-dashed border-blue-400/80 pointer-events-none" />
    default:
      return null
  }
}

// ── Well component ─────────────────────────────────────────────────────────────

interface WellComponentProps {
  well: Well
  isSelected: boolean
  /** Secondary highlight (e.g. Smart Deck filter matches) — amber outline. */
  isFilterHighlight: boolean
  readOnly: boolean
  compact: boolean
  onSelect: () => void
}

function WellTooltipContent({ well }: { well: Well }) {
  const slotAddr = `${well.col}${well.row}`
  const hasDetails = !!(well.sampleId || well.patientName)
  return (
    <div className="flex flex-col gap-1.5 p-2.5 min-w-[160px] max-w-[220px]">
      {/* Slot address */}
      <p className="text-[10px] font-semibold uppercase tracking-wide text-background/50 leading-none">
        Slot {slotAddr}
      </p>
      {hasDetails ? (
        <>
          {well.sampleId && (
            <p className="font-mono font-bold text-xs text-background leading-tight break-all">
              {well.sampleId}
            </p>
          )}
          {well.patientName && (
            <p className="text-xs text-background/90 leading-tight">{well.patientName}</p>
          )}
          {well.patientMrn && (
            <p className="text-[10px] font-mono text-background/60 leading-tight">{well.patientMrn}</p>
          )}
          {well.collectionStatus && (
            <p className="text-[10px] text-background/60 capitalize leading-tight">
              {well.collectionStatus.replace(/_/g, " ")}
            </p>
          )}
          {well.status === "unslotted" && (
            <p className="text-[10px] text-background/50 italic leading-tight">Position not confirmed</p>
          )}
        </>
      ) : (
        <p className="text-[10px] text-background/50 italic">
          {well.status === "empty" ? "Empty slot" : "No details available"}
        </p>
      )}
    </div>
  )
}

function WellComponent({
  well,
  isSelected,
  isFilterHighlight,
  readOnly,
  compact,
  onSelect,
}: WellComponentProps) {
  const base = cn(
    "relative w-full aspect-square rounded-full border-2 flex items-center justify-center overflow-hidden",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    compact ? "max-w-[20px] min-w-[14px]" : "max-w-[36px] min-w-[24px]",
    !readOnly && "cursor-pointer transition-all hover:scale-110",
  )

  const slotAddr = `${well.col}${well.row}`
  const label = WELL_STATUS_LABELS[well.status] ?? well.status

  const buttonEl = (
    <button
      onClick={readOnly ? undefined : onSelect}
      className={cn(base, getWellColorClass(well.status, isSelected, isFilterHighlight))}
      aria-label={`Well ${slotAddr} — ${label}`}
      type="button"
      tabIndex={readOnly ? -1 : 0}
    >
      {/* Colour-blind inner shape — fades out on hover to reveal slot label */}
      <span className="transition-opacity group-hover:opacity-0">
        <WellInnerShape status={well.status} />
      </span>
      {/* Slot address overlay — fades in on hover */}
      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold leading-none opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-black/60 dark:text-white/70">
        {slotAddr}
      </span>
    </button>
  )

  return (
    <div className="group relative flex-1 flex justify-center">
      {well.status === "empty" ? (
        buttonEl
      ) : (
        <Tooltip delayDuration={350}>
          <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
          <TooltipContent side="top" sideOffset={6} className="p-0 overflow-hidden">
            <WellTooltipContent well={well} />
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

// ── Staleness ticker ───────────────────────────────────────────────────────────

function useAgeLabel(lastUpdatedAt: number | undefined): string | null {
  const [, tick] = React.useReducer((n: number) => n + 1, 0)

  React.useEffect(() => {
    if (!lastUpdatedAt) return
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [lastUpdatedAt])

  if (!lastUpdatedAt) return null
  const secs = Math.floor((Date.now() - lastUpdatedAt) / 1000)
  if (secs < 5)  return "just now"
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ago`
}

// ── TrayCard ───────────────────────────────────────────────────────────────────

export interface TrayCardProps {
  tray: Tray
  selectedWells: Set<string>
  /**
   * Wells that match sidebar / filter criteria (amber outline).
   * Distinct from `selectedWells` (e.g. scanned-sample primary ring).
   */
  filterHighlightedWells?: Set<string>
  onWellSelect: (wellId: string) => void
  /** When false, the bottom footer is hidden. Default true. */
  showFooter?: boolean
  /**
   * Tray operational status (e.g. "in_preparation", "in_transit").
   * Renders a colour-coded badge in the card header.
   */
  status?: string
  /**
   * When true, wells have no cursor or hover-scale effects.
   * Use in list/overview pages where clicking a well does nothing.
   */
  readOnly?: boolean
  /**
   * Unix timestamp (ms) of when occupancy data was last fetched.
   * Renders a staleness indicator in the footer.
   */
  lastUpdatedAt?: number
  /** Compact density for constrained containers like side panels. */
  compact?: boolean
}

export function TrayCard({
  tray,
  selectedWells,
  filterHighlightedWells,
  onWellSelect,
  showFooter = true,
  status,
  readOnly = false,
  lastUpdatedAt,
  compact = false,
}: TrayCardProps) {
  const [footerVisible, setFooterVisible] = React.useState(true)
  const ageLabel = useAgeLabel(lastUpdatedAt)

  const filledWells  = tray.wells.filter((w) => w.status !== "empty").length
  const totalWells   = tray.wells.length
  const urgentCount  = tray.wells.filter((w) => w.status === "unassigned-urgent").length
  const statusCfg    = status ? TRAY_STATUS_CONFIG[status] : undefined

  return (
    <Card
      className={cn(
        "overflow-hidden flex flex-col h-full p-0",
        compact && "rounded-none border-0 shadow-none",
      )}
    >

      {/* ── Header ── */}
      <div className={cn("px-4 py-3 border-b shrink-0", compact && "px-2 py-1.5")}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className={cn("text-base font-semibold truncate", compact && "text-sm")}>
              {tray.name}
            </CardTitle>
            {statusCfg && (
              <Badge
                variant="outline"
                className={cn("text-xs font-normal shrink-0", compact && "h-5 px-1.5 text-[10px]", statusCfg.className)}
              >
                {statusCfg.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {urgentCount > 0 && (
              <Badge variant="destructive" className={cn("text-xs", compact && "h-5 px-1.5 text-[10px]")}>
                {urgentCount} STAT
              </Badge>
            )}
            <Badge variant="secondary" className={cn("text-xs", compact && "h-5 px-1.5 text-[10px]")}>
              {filledWells}/{totalWells}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <CardContent className={cn("px-2 pt-2 pb-2 flex flex-col flex-1 min-h-0", compact && "px-1.5 pt-0.5 pb-1")}>
        <div className="flex flex-col flex-1 justify-between min-h-0">

          {/* Column headers */}
          <div className={cn("flex gap-1 pl-5 mb-0.5 shrink-0", compact && "pl-4 mb-0")}>
            {tray.columns.map((col) => (
              <div
                key={col}
                className={cn(
                  "flex-1 text-center text-[10px] font-semibold text-muted-foreground uppercase min-w-0",
                  compact && "text-[9px]",
                )}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className={cn("flex flex-col flex-1 justify-evenly min-h-0 gap-1", compact && "gap-0.5")}>
            {Array.from({ length: tray.rows }, (_, rowIndex) => {
              const rowNum = rowIndex + 1
              return (
                <div key={rowNum} className="flex items-center gap-1 min-h-0">
                  <div className={cn("w-4 text-[10px] font-semibold text-muted-foreground text-right shrink-0", compact && "w-3.5 text-[9px]")}>
                    {rowNum}
                  </div>
                  <div className="flex gap-1 flex-1 min-w-0">
                    {tray.columns.map((col) => {
                      const well = tray.wells.find((w) => w.row === rowNum && w.col === col)
                      if (!well) return null
                      return (
                        <WellComponent
                          key={well.id}
                          well={well}
                          isSelected={selectedWells.has(well.id)}
                          isFilterHighlight={filterHighlightedWells?.has(well.id) ?? false}
                          readOnly={readOnly}
                          compact={compact}
                          onSelect={() => onWellSelect(well.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>

      {/* ── Footer ── */}
      {showFooter && (
        footerVisible ? (
          <div className="px-4 py-2 border-t shrink-0 flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {tray.columns.length} columns × {tray.rows} rows
              </span>
              {ageLabel && (
                <span className="text-[10px] text-muted-foreground/60">
                  Updated {ageLabel}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0 text-muted-foreground"
              onClick={() => setFooterVisible(false)}
              aria-label="Hide footer"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="border-t shrink-0 flex justify-center py-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={() => setFooterVisible(true)}
              aria-label="Show footer"
            >
              <ChevronUp className="h-3 w-3 mr-1" />
              Show rows & columns
            </Button>
          </div>
        )
      )}
    </Card>
  )
}
