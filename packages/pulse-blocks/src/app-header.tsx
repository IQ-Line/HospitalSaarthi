import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { Button } from "@pulse/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@pulse/ui/avatar"
import { SidebarTrigger } from "@pulse/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@pulse/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@pulse/ui/dropdown-menu"
import { ThemeToggle } from "@pulse/blocks/theme-toggle"
import { Settings, User, LogOut } from "lucide-react"
import { ICON_STROKE_WIDTH } from "@pulse/constants"

// ─── Breadcrumb helpers ───────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string
  href?: string
}

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function generateBreadcrumbs(
  pathname: string,
  custom?: BreadcrumbItem[]
): BreadcrumbItem[] {
  if (custom?.length) return custom

  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return [{ label: "Dashboard" }]

  const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/" }]
  let current = ""
  segments.forEach((seg, i) => {
    current += `/${seg}`
    const isLast = i === segments.length - 1
    items.push({ label: formatSegment(seg), href: isLast ? undefined : current })
  })
  return items
}

function getPageLabel(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  if (!segments.length) return "Dashboard"
  return formatSegment(segments[segments.length - 1])
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppHeaderProps {
  /** Resolved user name — caller should read from auth context */
  userName?: string
  userEmail?: string
  userAvatar?: string
  /** Called when user clicks Log out */
  onLogout?: () => void
  /** Override auto-generated breadcrumbs */
  breadcrumbs?: BreadcrumbItem[]
  /** Link targets in user dropdown */
  profileHref?: string
  settingsHref?: string
  /** When false, hides the Settings icon in the top bar (Gaama: no `/settings` index route). Default true. */
  showSettingsButton?: boolean
  /** When false, hides the Settings item in the user dropdown. Default true. */
  showSettingsMenuItem?: boolean
  /**
   * Slot injected between the breadcrumb area and the right icon group.
   * Use for contextual indicators like a branch switcher.
   */
  leftExtra?: React.ReactNode
  /**
   * Slot injected inside the right icon group, before the theme toggle.
   * Use for notification panels, command palette triggers, etc.
   */
  rightExtra?: React.ReactNode
  /**
   * Slot inside the user dropdown, after the user label and before Profile/Settings.
   * Use for role switchers or account context.
   */
  userMenuLeadingExtra?: React.ReactNode
  /**
   * Slot injected inside the user dropdown, after the Settings item,
   * before the logout separator. Use for role switchers or extra links.
   */
  userMenuExtra?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppHeader({
  userName = "User",
  userEmail = "",
  userAvatar,
  onLogout,
  breadcrumbs: breadcrumbsProp,
  profileHref = "/profile",
  settingsHref = "/settings",
  showSettingsButton = true,
  showSettingsMenuItem = true,
  leftExtra,
  rightExtra,
  userMenuLeadingExtra,
  userMenuExtra,
}: AppHeaderProps) {
  const location = useLocation()

  const breadcrumbs = React.useMemo(
    () => {
      // iqhealth passes breadcrumbs via router location.state — support that pattern
      const stateCrumbs = (location.state as { breadcrumbs?: BreadcrumbItem[] } | null)
        ?.breadcrumbs
      if (Array.isArray(stateCrumbs) && stateCrumbs.length > 0) return stateCrumbs
      return generateBreadcrumbs(location.pathname, breadcrumbsProp)
    },
    [location.pathname, location.state, breadcrumbsProp]
  )

  const pageLabel = React.useMemo(
    () => getPageLabel(location.pathname),
    [location.pathname]
  )

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-10 min-h-10 max-h-10 w-full shrink-0 items-center gap-2 px-4 box-border">
        {/* Left: sidebar trigger + breadcrumbs */}
        <div className="flex flex-1 items-center gap-2 min-w-0 min-h-0">
          <SidebarTrigger className="-ml-1 shrink-0" />

          <Breadcrumb className="hidden md:flex min-w-0 flex-1">
            <BreadcrumbList>
              {breadcrumbs.map((item, i) => {
                const isLast = i === breadcrumbs.length - 1
                return (
                  <React.Fragment key={i}>
                    <BreadcrumbItem>
                      {isLast || !item.href ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.href}>{item.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>

          <span className="md:hidden text-sm font-medium truncate">{pageLabel}</span>
        </div>

        {/* Centre: left extra (e.g. branch switcher) */}
        {leftExtra}

        {/* Right: extra slot + theme toggle + settings + user menu */}
        <div className="flex items-center gap-1">
          {rightExtra}

          <ThemeToggle />

          {showSettingsButton ? (
            <Button variant="ghost" size="icon" aria-label="Settings" asChild>
              <Link to={settingsHref}>
                <Settings strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
              </Link>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="size-7">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium max-w-[120px] truncate">
                  {userName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{userName}</p>
                  {userEmail && (
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {userMenuLeadingExtra ? (
                <>
                  {userMenuLeadingExtra}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem asChild>
                <Link to={profileHref} className="flex items-center gap-2">
                  <User strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              {showSettingsMenuItem ? (
                <DropdownMenuItem asChild>
                  <Link to={settingsHref} className="flex items-center gap-2">
                    <Settings strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {userMenuExtra && (
                <>
                  <DropdownMenuSeparator />
                  {userMenuExtra}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
