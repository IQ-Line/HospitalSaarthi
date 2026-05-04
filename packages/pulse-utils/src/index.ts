import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Display calendar dates as **DD/MM/YYYY** (India-style).
 * Accepts ISO strings, `YYYY-MM-DD`, or values starting with `YYYY-MM-DD`.
 */
export function formatDateDdMmYyyy(value: string | undefined | null): string {
  if (value == null) return "—"
  const raw = String(value).trim()
  if (!raw) return "—"
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getFullYear()),
  ].join("/")
}

/**
 * Time only: **HH:MM AM/PM** (12-hour, zero-padded hour 01–12, minute 00–59).
 */
export function formatTime12h(d: Date): string {
  const h24 = d.getHours()
  const mins = d.getMinutes()
  const isPm = h24 >= 12
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  const hh = String(h12).padStart(2, "0")
  const mm = String(mins).padStart(2, "0")
  return `${hh}:${mm} ${isPm ? "PM" : "AM"}`
}

/**
 * Display datetime as **DD/MM/YYYY, HH:MM AM/PM** (12-hour time).
 * Accepts ISO / date-only strings, **Unix ms** as `number`, or digit-only epoch **seconds** (≤10 digits) / **ms** (>10 digits) strings.
 */
export function formatDateTimeIn(value: string | number | undefined | null): string {
  if (value == null) return "—"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return "—"
    const dd = String(d.getDate()).padStart(2, "0")
    const mo = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}/${mo}/${yyyy}, ${formatTime12h(d)}`
  }
  const raw = String(value).trim()
  if (!raw) return "—"
  let d: Date
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    const ms = raw.length <= 10 ? n * 1000 : n
    d = new Date(ms)
  } else {
    const normalized = DATE_ONLY.test(raw) ? `${raw}T12:00:00` : raw
    d = new Date(normalized)
  }
  if (Number.isNaN(d.getTime())) return raw
  const dd = String(d.getDate()).padStart(2, "0")
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mo}/${yyyy}, ${formatTime12h(d)}`
}
