import { cn } from "@pulse/utils"
import { Button } from "@pulse/ui/button"
import { Badge } from "@pulse/ui/badge"
import { Separator } from "@pulse/ui/separator"
import { ScrollArea } from "@pulse/ui/scroll-area"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import {
  Clock,
  MapPin,
  Users,
  Video,
  MoreHorizontal,
  Plus,
} from "lucide-react"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  startTime?: string
  endTime?: string
  color?: "red" | "green" | "blue" | "orange" | "purple" | "teal"
  location?: string
  attendees?: number
  videoCall?: boolean
  allDay?: boolean
  description?: string
}

interface CalendarDayDetailsProps {
  selectedDate?: Date
  events?: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onCreateEvent?: () => void
  className?: string
}

const eventColors = {
  red: "border-l-4 border-red-500 bg-red-500/10",
  green: "border-l-4 border-green-500 bg-green-500/10",
  blue: "border-l-4 border-blue-500 bg-blue-500/10",
  orange: "border-l-4 border-orange-500 bg-orange-500/10",
  purple: "border-l-4 border-purple-500 bg-purple-500/10",
  teal: "border-l-4 border-teal-500 bg-teal-500/10",
}

function getRelativeDay(date: Date): string {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "EEEE, MMMM d, yyyy")
}

export function CalendarDayDetails({
  selectedDate = new Date(),
  events = [],
  onEventClick,
  onCreateEvent,
  className,
}: CalendarDayDetailsProps) {
  const dayEvents = events.filter(
    (event) => format(event.date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
  )

  // Group events by all-day and timed
  const allDayEvents = dayEvents.filter((e) => e.allDay)
  const timedEvents = dayEvents.filter((e) => !e.allDay).sort((a, b) => {
    if (!a.startTime || !b.startTime) return 0
    return a.startTime.localeCompare(b.startTime)
  })

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            {getRelativeDay(selectedDate)}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateEvent}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
        </p>
      </div>

      {/* Events list */}
      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-4">
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                All Day
              </h3>
              <div className="flex flex-col gap-2">
                {allDayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={cn(
                      "w-full text-left p-3 rounded-md hover:opacity-80 transition-opacity",
                      eventColors[event.color || "blue"]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{event.title}</div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {allDayEvents.length > 0 && timedEvents.length > 0 && (
            <Separator />
          )}

          {/* Timed events */}
          {timedEvents.length > 0 ? (
            <div>
              {allDayEvents.length > 0 && (
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Scheduled
                </h3>
              )}
              <div className="flex flex-col gap-2">
                {timedEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={cn(
                      "w-full text-left p-3 rounded-md hover:opacity-80 transition-opacity",
                      eventColors[event.color || "blue"]
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Time */}
                      <div className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5">
                        {event.startTime && (
                          <div>{event.startTime}</div>
                        )}
                        {event.endTime && (
                          <div>{event.endTime}</div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{event.title}</div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {event.videoCall && (
                            <Badge variant="secondary" className="text-xs">
                              <Video className="h-3 w-3 mr-1" />
                              Video call
                            </Badge>
                          )}
                          {event.location && (
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </Badge>
                          )}
                          {event.attendees && event.attendees > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {event.attendees} attendees
                            </Badge>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            allDayEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-1">No events scheduled</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an event to get started
                </p>
                <Button onClick={onCreateEvent} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
