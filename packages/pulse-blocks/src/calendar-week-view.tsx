import * as React from "react"
import { cn } from "@pulse/utils"
import { Button } from "@pulse/ui/button"
import { ScrollArea } from "@pulse/ui/scroll-area"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
  isToday,
} from "date-fns"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  startTime?: string
  endTime?: string
  color?: "red" | "green" | "blue" | "orange" | "purple" | "teal"
  allDay?: boolean
  description?: string
}

interface CalendarWeekViewProps {
  selectedDate: Date
  events?: CalendarEvent[]
  onDateSelect?: (date: Date) => void
  onWeekChange?: (date: Date) => void
  className?: string
}

const eventColorClasses = {
  red: "bg-red-500/20 text-red-700 dark:text-red-400 border-l-2 border-red-500",
  green: "bg-green-500/20 text-green-700 dark:text-green-400 border-l-2 border-green-500",
  blue: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-l-2 border-blue-500",
  orange: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-l-2 border-orange-500",
  purple: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-l-2 border-purple-500",
  teal: "bg-teal-500/20 text-teal-700 dark:text-teal-400 border-l-2 border-teal-500",
}

// Generate time slots from 00:00 to 23:00
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0")
  return `${hour}:00`
})

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number)
  return hours + minutes / 60
}

export function CalendarWeekView({
  selectedDate,
  events = [],
  onDateSelect,
  onWeekChange,
  className,
}: CalendarWeekViewProps) {
  const [currentWeek, setCurrentWeek] = React.useState(selectedDate)

  const handlePreviousWeek = () => {
    const newWeek = subWeeks(currentWeek, 1)
    setCurrentWeek(newWeek)
    onWeekChange?.(newWeek)
  }

  const handleNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1)
    setCurrentWeek(newWeek)
    onWeekChange?.(newWeek)
  }

  // Generate week days
  const weekStart = startOfWeek(currentWeek)
  const weekEnd = endOfWeek(currentWeek)
  const weekDays: Date[] = []
  let day = weekStart
  while (day <= weekEnd) {
    weekDays.push(day)
    day = addDays(day, 1)
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date))
  }

  // Get all-day events for the week
  const allDayEvents = events.filter((event) => event.allDay)

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-lg font-semibold">
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousWeek}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextWeek}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week view grid */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border border-b">
          <div className="bg-background" />
          {weekDays.map((day) => {
            const isCurrentDay = isToday(day)
            const isSelected = isSameDay(day, selectedDate)

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect?.(day)}
                className={cn(
                  "bg-background p-2 hover:bg-muted/50 transition-colors",
                  isSelected && "bg-accent"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full",
                      isCurrentDay && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* All-day events section */}
        {allDayEvents.length > 0 && (
          <div className="border-b bg-muted/30">
            <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-px bg-border">
              <div className="bg-background p-2 text-xs text-muted-foreground text-center">
                All day
              </div>
              {weekDays.map((day) => {
                const dayAllDayEvents = allDayEvents.filter((event) =>
                  isSameDay(event.date, day)
                )

                return (
                  <div
                    key={day.toISOString()}
                    className="bg-background p-1 min-h-[50px] min-w-0"
                  >
                    <div className="space-y-1">
                      {dayAllDayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs px-2 py-1 rounded truncate",
                            eventColorClasses[event.color || "blue"]
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Time grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] gap-px bg-border">
            {TIME_SLOTS.map((time, timeIdx) => (
              <React.Fragment key={time}>
                {/* Time label */}
                <div className="bg-background p-2 text-xs text-muted-foreground text-right border-r">
                  {time}
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const dayTimedEvents = getEventsForDate(day).filter(
                    (e) => !e.allDay && e.startTime
                  )

                  // Find events that start in this hour slot
                  const slotEvents = dayTimedEvents.filter((event) => {
                    if (!event.startTime) return false
                    const eventHour = parseTime(event.startTime)
                    return Math.floor(eventHour) === timeIdx
                  })

                  return (
                    <div
                      key={`${day.toISOString()}-${time}`}
                      className="bg-background min-h-[60px] min-w-0 p-1 relative border-b hover:bg-muted/30 transition-colors"
                    >
                      {slotEvents.map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "absolute left-0 right-0 mx-1 px-2 py-1 rounded text-xs",
                            eventColorClasses[event.color || "blue"]
                          )}
                          style={{
                            top: "2px",
                            zIndex: 10,
                          }}
                        >
                          <div className="font-medium truncate">
                            {event.title}
                          </div>
                          {event.startTime && event.endTime && (
                            <div className="text-xs opacity-75">
                              {event.startTime} - {event.endTime}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
