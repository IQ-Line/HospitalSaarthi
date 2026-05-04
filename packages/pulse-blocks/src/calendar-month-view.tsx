import * as React from "react"
import { cn } from "@pulse/utils"
import { Button } from "@pulse/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths
} from "date-fns"

interface CalendarEvent {
  id: string
  title: string
  date: Date
  color?: "red" | "green" | "blue" | "orange" | "purple" | "teal"
  allDay?: boolean
}

interface CalendarMonthViewProps {
  selectedDate?: Date
  events?: CalendarEvent[]
  onDateSelect?: (date: Date) => void
  onMonthChange?: (date: Date) => void
  className?: string
}

const eventColors = {
  red: "bg-red-500/20 text-red-700 dark:text-red-400 border-l-2 border-red-500",
  green: "bg-green-500/20 text-green-700 dark:text-green-400 border-l-2 border-green-500",
  blue: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-l-2 border-blue-500",
  orange: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-l-2 border-orange-500",
  purple: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-l-2 border-purple-500",
  teal: "bg-teal-500/20 text-teal-700 dark:text-teal-400 border-l-2 border-teal-500",
}

export function CalendarMonthView({
  selectedDate = new Date(),
  events = [],
  onDateSelect,
  onMonthChange,
  className,
}: CalendarMonthViewProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleDateClick = (date: Date) => {
    onDateSelect?.(date)
  }

  // Generate calendar grid
  const days: Date[] = []
  let day = startDate
  while (day <= endDate) {
    days.push(day)
    day = addDays(day, 1)
  }

  // Group days into weeks
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date))
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-rows-[repeat(auto-fit,minmax(0,1fr))]">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7">
              {week.map((day, dayIdx) => {
                const dayEvents = getEventsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const isCurrentDay = isToday(day)

                return (
                  <button
                    key={dayIdx}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "relative border-r border-b p-2 text-left hover:bg-muted/50 transition-colors min-h-[100px] flex flex-col",
                      !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                      isSelected && "bg-accent",
                      dayIdx === 0 && "border-l"
                    )}
                  >
                    {/* Date number at top-left */}
                    <div className="mb-1">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full text-sm",
                          isCurrentDay && "bg-primary text-primary-foreground font-semibold"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    {/* Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded truncate",
                            eventColors[event.color || "blue"]
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1.5">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
