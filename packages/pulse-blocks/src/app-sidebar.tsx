import * as React from "react"
import { Link, useLocation } from "@tanstack/react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@pulse/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@pulse/ui/collapsible"
import { Badge } from "@pulse/ui/badge"
import { ChevronRight } from "lucide-react"
import { ICON_STROKE_WIDTH } from "@pulse/constants"
import type { LucideIcon } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNavItem {
  label: string
  icon: LucideIcon | React.ComponentType<{ strokeWidth?: number; className?: string }>
  href?: string
  badge?: string
  disabled?: boolean
  children?: AppNavItem[]
  /** When set (with onOpenChange), collapsible parent is controlled. Otherwise uses defaultOpen from route. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface AppNavGroup {
  label: string
  /** Defaults to `label`; use when label is empty to avoid duplicate React keys */
  id?: string
  /** When false, the group section label is omitted (e.g. module row is the only header) */
  showGroupLabel?: boolean
  items: AppNavItem[]
}

interface AppSidebarProps {
  groups: AppNavGroup[]
  /** Header slot — logo, app name, tenant switcher, etc. */
  header?: React.ReactNode
  /**
   * Override the active-route check.
   * Defaults to exact match for "/" and prefix match for all other hrefs.
   */
  isActive?: (pathname: string, href: string) => boolean
}

// ─── Default active-route logic ───────────────────────────────────────────────

function defaultIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(href + "/")
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar({ groups, header, isActive = defaultIsActive }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const location = useLocation()

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon">
      {header && <SidebarHeader>{header}</SidebarHeader>}

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.id ?? group.label} className="py-1">
            {group.showGroupLabel !== false && group.label ? (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const hasChildren = !!item.children?.length
                  const itemActive = item.href ? isActive(location.pathname, item.href) : false
                  const parentActive = hasChildren
                    ? item.children!.some(
                        (child) => child.href && isActive(location.pathname, child.href)
                      )
                    : false
                  const collapsibleControlled =
                    typeof item.open === "boolean" && typeof item.onOpenChange === "function"

                  if (hasChildren) {
                    return (
                      <Collapsible
                        key={item.label}
                        open={collapsibleControlled ? item.open : undefined}
                        onOpenChange={collapsibleControlled ? item.onOpenChange : undefined}
                        defaultOpen={collapsibleControlled ? undefined : parentActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label} isActive={parentActive}>
                              <Icon strokeWidth={ICON_STROKE_WIDTH} />
                              <span>{item.label}</span>
                              <ChevronRight
                                strokeWidth={ICON_STROKE_WIDTH}
                                className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children!.map((child) => {
                                const ChildIcon = child.icon
                                const childActive = child.href
                                  ? isActive(location.pathname, child.href)
                                  : false
                                return (
                                  <SidebarMenuSubItem key={child.label}>
                                    <SidebarMenuSubButton
                                      asChild={!!child.href}
                                      isActive={childActive}
                                      onClick={child.href ? handleNavClick : undefined}
                                    >
                                      {child.href ? (
                                        <Link to={child.href}>
                                          <ChildIcon strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
                                          <span>{child.label}</span>
                                        </Link>
                                      ) : (
                                        <div>
                                          <ChildIcon strokeWidth={ICON_STROKE_WIDTH} className="size-4" />
                                          <span>{child.label}</span>
                                        </div>
                                      )}
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        asChild={!!item.href}
                        tooltip={item.label}
                        isActive={itemActive}
                        disabled={item.disabled}
                        onClick={item.href ? handleNavClick : undefined}
                      >
                        {item.href ? (
                          <Link to={item.href} className="flex min-w-0 flex-1 items-center gap-2">
                            <Icon strokeWidth={ICON_STROKE_WIDTH} />
                            <span className="truncate">{item.label}</span>
                            {item.badge ? (
                              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px] font-normal">
                                {item.badge}
                              </Badge>
                            ) : null}
                          </Link>
                        ) : (
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Icon strokeWidth={ICON_STROKE_WIDTH} />
                            <span className="truncate">{item.label}</span>
                            {item.badge ? (
                              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px] font-normal">
                                {item.badge}
                              </Badge>
                            ) : null}
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
