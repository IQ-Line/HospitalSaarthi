import { Calendar } from "@pulse/ui/calendar"
import { Button } from "@pulse/ui/button"
import { Separator } from "@pulse/ui/separator"
import { Badge } from "@pulse/ui/badge"
import { cn } from "@pulse/utils"
import { Plus, Calendar as CalendarIcon, Users, Clock } from "lucide-react"

interface CalendarAccount {
  id: string
  name: string
  email: string
  color: string
  enabled: boolean
}

interface CalendarSidebarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date | undefined) => void
  accounts?: CalendarAccount[]
  onAccountToggle?: (accountId: string) => void
  className?: string
}

export function CalendarSidebar({
  selectedDate,
  onDateSelect,
  accounts = [],
  onAccountToggle,
  className,
}: CalendarSidebarProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Mini calendar */}
      <div className="p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          className="rounded-md"
        />
      </div>

      <Separator />

      {/* Calendar accounts */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">My Calendars</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => onAccountToggle?.(account.id)}
                  className="flex items-center gap-2 w-full text-left hover:bg-muted rounded-md px-2 py-1.5 transition-colors"
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-sm shrink-0",
                      account.enabled ? "opacity-100" : "opacity-30"
                    )}
                    style={{ backgroundColor: account.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{account.name}</div>
                    {account.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {account.email}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9"
              >
                <Clock className="h-4 w-4 mr-2" />
                Scheduling
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9"
              >
                <Users className="h-4 w-4 mr-2" />
                Team Events
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                All Events
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {accounts.filter(a => a.enabled).length} active
          </Badge>
          <span>•</span>
          <span>{accounts.length} calendars</span>
        </div>
      </div>
    </div>
  )
}
