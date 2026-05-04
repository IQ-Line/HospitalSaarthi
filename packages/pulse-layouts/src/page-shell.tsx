import * as React from "react"
import { Button } from "@pulse/ui/button"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface OpenPageSidePanelOptions {
  /**
   * When false, PageShell does not render its floating close control; panel content should provide one.
   * @default true
   */
  showShellCloseButton?: boolean
  /**
   * Overrides the shell’s `sidePanelWidth` while this panel is open. Cleared when the panel closes.
   */
  sidePanelWidth?: string | number
  /**
   * When the panel is already open and receives the same fingerprint, `open` skips redundant
   * state updates so Radix-heavy panel content cannot enter setState/ref feedback loops.
   */
  contentFingerprint?: string
}

interface PageSidePanelContextValue {
  isOpen: boolean
  open: (
    content: React.ReactNode,
    onClose?: () => void,
    options?: OpenPageSidePanelOptions,
  ) => void
  close: () => void
  setContent: (content: React.ReactNode) => void
}

const PageSidePanelContext = React.createContext<PageSidePanelContextValue | null>(null)

/** Use inside a PageShell. Throws if there is no parent PageShell. */
export function usePageSidePanel(): PageSidePanelContextValue {
  const ctx = React.useContext(PageSidePanelContext)
  if (!ctx) {
    throw new Error("usePageSidePanel must be used within a PageShell")
  }
  return ctx
}

/**
 * Like usePageSidePanel but returns null when called outside a PageShell
 * instead of throwing. Use when the component can render in both contexts.
 */
export function usePageSidePanelSafe(): PageSidePanelContextValue | null {
  return React.useContext(PageSidePanelContext)
}

// ---------------------------------------------------------------------------
// PageShell
// ---------------------------------------------------------------------------

interface PageShellProps {
  children: React.ReactNode
  /**
   * Width of the side panel when open.
   * Accepts any valid CSS width value (e.g. "400px", "30%", "24rem").
   * Defaults to "400px".
   */
  sidePanelWidth?: string | number
}

export function PageShell({ children, sidePanelWidth = "400px" }: PageShellProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [panelContent, setPanelContent] = React.useState<React.ReactNode>(null)
  const [onCloseCallback, setOnCloseCallback] = React.useState<(() => void) | null>(null)
  const [showShellCloseButton, setShowShellCloseButton] = React.useState(true)
  const [panelWidthOverride, setPanelWidthOverride] = React.useState<string | null>(null)
  const lastOpenFingerprintRef = React.useRef<string | null>(null)
  const isOpenRef = React.useRef(isOpen)
  isOpenRef.current = isOpen

  const open = React.useCallback(
    (content: React.ReactNode, onClose?: () => void, options?: OpenPageSidePanelOptions) => {
      const fp = options?.contentFingerprint
      if (fp !== undefined && isOpenRef.current && fp === lastOpenFingerprintRef.current) {
        return
      }
      if (fp !== undefined) {
        lastOpenFingerprintRef.current = fp
      } else {
        lastOpenFingerprintRef.current = null
      }
      setPanelContent(content)
      setIsOpen(true)
      setOnCloseCallback(onClose ? () => onClose : null)
      setShowShellCloseButton(options?.showShellCloseButton !== false)
      if (options?.sidePanelWidth !== undefined) {
        const w = options.sidePanelWidth
        setPanelWidthOverride(typeof w === "number" ? `${w}px` : w)
      } else {
        setPanelWidthOverride(null)
      }
    },
    [],
  )

  const close = React.useCallback(() => {
    lastOpenFingerprintRef.current = null
    setIsOpen(false)
    setShowShellCloseButton(true)
    setPanelWidthOverride(null)
  }, [])

  const setContent = React.useCallback((content: React.ReactNode) => {
    setPanelContent(content)
  }, [])

  // Keep context identity stable when only `isOpen` flips so effects that sync the panel
  // (e.g. `open()` on selectedId) do not re-run in a loop — `open`/`close` already close over latest state.
  const stateRef = React.useRef({ isOpen })
  stateRef.current.isOpen = isOpen
  const contextValue = React.useMemo(
    () => ({
      get isOpen() {
        return stateRef.current.isOpen
      },
      open,
      close,
      setContent,
    }),
    [open, close, setContent],
  )

  const defaultPanelWidth = typeof sidePanelWidth === "number" ? `${sidePanelWidth}px` : sidePanelWidth
  const resolvedPanelWidth = panelWidthOverride ?? defaultPanelWidth

  return (
    <PageSidePanelContext.Provider value={contextValue}>
      <div className="flex h-full overflow-hidden">
        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>

        {/* Side panel */}
        {isOpen && (
          <div
            className="relative flex h-full min-h-0 w-full flex-shrink-0 flex-col overflow-hidden border-l bg-background"
            style={{ width: resolvedPanelWidth }}
          >
            {showShellCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10 h-6 w-6 shrink-0"
                onClick={() => { close(); onCloseCallback?.() }}
                aria-label="Close panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </Button>
            )}
            {panelContent}
          </div>
        )}
      </div>
    </PageSidePanelContext.Provider>
  )
}
