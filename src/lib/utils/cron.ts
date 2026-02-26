/**
 * Simple cron expression helpers.
 * Supports common patterns only — no npm dependency needed.
 */

const KNOWN_PATTERNS: Record<string, string> = {
  "* * * * *": "Every minute",
  "0 * * * *": "Every hour",
  "*/5 * * * *": "Every 5 minutes",
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 */2 * * *": "Every 2 hours",
  "0 */3 * * *": "Every 3 hours",
  "0 */4 * * *": "Every 4 hours",
  "0 */6 * * *": "Every 6 hours",
  "0 */12 * * *": "Every 12 hours",
  "0 0 * * *": "Daily at midnight UTC",
  "0 8 * * *": "Daily at 8:00 AM UTC",
  "0 0 * * 0": "Weekly on Sunday at midnight UTC",
  "0 0 * * 1": "Weekly on Monday at midnight UTC",
  "0 0 1 * *": "Monthly on the 1st at midnight UTC",
}

/**
 * Convert a cron expression to a human-readable description.
 */
export function describeCron(schedule: string): string {
  const trimmed = schedule.trim()
  if (KNOWN_PATTERNS[trimmed]) return KNOWN_PATTERNS[trimmed]

  const parts = trimmed.split(/\s+/)
  if (parts.length !== 5) return schedule

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // "0 N * * *" → Daily at N:00 UTC
  if (minute.match(/^\d+$/) && hour.match(/^\d+$/) && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)
    const period = h >= 12 ? "PM" : "AM"
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `Daily at ${h12}:${m.toString().padStart(2, "0")} ${period} UTC`
  }

  // "0 */N * * *" → Every N hours
  const hourMatch = hour.match(/^\*\/(\d+)$/)
  if (minute === "0" && hourMatch && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every ${hourMatch[1]} hours`
  }

  // "0 N * * D" → Weekly on day D at N:00 UTC
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  if (minute.match(/^\d+$/) && hour.match(/^\d+$/) && dayOfMonth === "*" && month === "*" && dayOfWeek.match(/^\d$/)) {
    const d = parseInt(dayOfWeek, 10)
    const h = parseInt(hour, 10)
    const m = parseInt(minute, 10)
    const period = h >= 12 ? "PM" : "AM"
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `Weekly on ${dayNames[d]} at ${h12}:${m.toString().padStart(2, "0")} ${period} UTC`
  }

  return schedule
}

/**
 * Compute the next occurrence of a cron expression from now.
 * Supports: minute/hour exact values, star, and step (star/N) patterns.
 */
export function getNextRun(schedule: string, from: Date = new Date()): Date {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) return new Date(from.getTime() + 3600_000) // fallback: 1hr

  const [minSpec, hourSpec, domSpec, , dowSpec] = parts

  function matchesField(spec: string, value: number): boolean {
    if (spec === "*") return true
    if (spec.startsWith("*/")) {
      const step = parseInt(spec.slice(2), 10)
      return value % step === 0
    }
    return parseInt(spec, 10) === value
  }

  // Search forward up to 8 days (covers weekly)
  const candidate = new Date(from)
  candidate.setUTCSeconds(0, 0)
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1) // start from next minute

  for (let i = 0; i < 8 * 24 * 60; i++) {
    const m = candidate.getUTCMinutes()
    const h = candidate.getUTCHours()
    const dom = candidate.getUTCDate()
    const dow = candidate.getUTCDay()

    if (
      matchesField(minSpec, m) &&
      matchesField(hourSpec, h) &&
      matchesField(domSpec, dom) &&
      matchesField(dowSpec, dow)
    ) {
      return candidate
    }

    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1)
  }

  // Fallback if nothing found
  return new Date(from.getTime() + 24 * 3600_000)
}
