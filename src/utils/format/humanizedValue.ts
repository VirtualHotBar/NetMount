/**
 * Humanized value parsing and formatting utilities for rclone parameters.
 *
 * rclone uses nanoseconds for durations and bytes for sizes internally,
 * but users should be able to type human-friendly values like "1h", "10G", etc.
 */

// ─── Duration (nanoseconds) ────────────────────────────────────────────

const NS_PER_MS = 1_000_000
const NS_PER_S = 1_000_000_000
const NS_PER_M = 60 * NS_PER_S
const NS_PER_H = 3600 * NS_PER_S
const NS_PER_D = 86400 * NS_PER_S
const NS_PER_W = 7 * 86400 * NS_PER_S

interface DurationUnit {
  suffix: string[]
  ns: number
}

const DURATION_UNITS: DurationUnit[] = [
  { suffix: ['w', 'wk', 'week', 'weeks'], ns: NS_PER_W },
  { suffix: ['d', 'day', 'days'], ns: NS_PER_D },
  { suffix: ['h', 'hr', 'hour', 'hours'], ns: NS_PER_H },
  { suffix: ['m', 'min', 'minute', 'minutes'], ns: NS_PER_M },
  { suffix: ['s', 'sec', 'second', 'seconds'], ns: NS_PER_S },
  { suffix: ['ms', 'millisecond', 'milliseconds'], ns: NS_PER_MS },
]

/**
 * Format nanoseconds to a human-readable duration string.
 * @param ns - Duration in nanoseconds
 * @returns Human-readable string, e.g. "1h 30m", "5s", "500ms"
 */
export function formatDuration(ns: number): string {
  if (!ns || ns === 0) return '0s'
  if (ns < 0) return 'off'

  const parts: string[] = []
  let remaining = Math.abs(ns)

  for (const unit of DURATION_UNITS) {
    if (remaining >= unit.ns) {
      const value = Math.floor(remaining / unit.ns)
      remaining -= value * unit.ns
      // Use shortest suffix
      parts.push(`${value}${unit.suffix[0]}`)
    }
  }

  return parts.length > 0 ? parts.join(' ') : '0s'
}

/**
 * Parse a human-readable duration string to nanoseconds.
 * Supports: "1h", "30m", "1h30m", "1h 30m", "5s", "500ms", "1.5h"
 * Also accepts plain numbers (treated as nanoseconds for backward compatibility).
 * Special: "off" or "0" → 0
 * @param input - User input string
 * @returns Duration in nanoseconds, or null if invalid
 */
export function parseDuration(input: string): number | null {
  if (!input || typeof input !== 'string') return null

  const trimmed = input.trim().toLowerCase()
  if (trimmed === '' || trimmed === 'off') return 0

  // Try plain number first (backward compatibility - already in nanoseconds)
  const plainNumber = Number(trimmed)
  if (!isNaN(plainNumber) && trimmed !== '') {
    // If it's a very large number, assume it's already nanoseconds
    if (plainNumber > 1000) return Math.round(plainNumber)
    // Small numbers could be ambiguous - treat as seconds for user convenience
    if (plainNumber >= 0) return Math.round(plainNumber * NS_PER_S)
  }

  // Parse compound duration: "1h30m", "1h 30m", "1.5h"
  let totalNs = 0
  // Match all number+unit pairs
  const regex = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g
  let match: RegExpExecArray | null
  let matched = false

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(trimmed)) !== null) {
    const value = parseFloat(match[1] ?? '')
    const unitStr = match[2] ?? ''

    if (isNaN(value)) continue

    const unit = DURATION_UNITS.find(u => u.suffix.includes(unitStr))
    if (unit) {
      totalNs += value * unit.ns
      matched = true
    }
  }

  return matched ? Math.round(totalNs) : null
}

// ─── Size (bytes) ──────────────────────────────────────────────────────

interface SizeUnit {
  suffix: string[]
  bytes: number
}

const SIZE_UNITS: SizeUnit[] = [
  { suffix: ['pb', 'p'], bytes: 1024 ** 5 },
  { suffix: ['tb', 't'], bytes: 1024 ** 4 },
  { suffix: ['gb', 'g'], bytes: 1024 ** 3 },
  { suffix: ['mb', 'm'], bytes: 1024 ** 2 },
  { suffix: ['kb', 'k'], bytes: 1024 },
  { suffix: ['b'], bytes: 1 },
]

/**
 * Format bytes to a human-readable size string.
 * @param bytes - Size in bytes. -1 or negative → "unlimited", 0 → "0 B"
 * @returns Human-readable string, e.g. "10 GB", "32 MB", "unlimited"
 */
export function formatSize(bytes: number): string {
  if (bytes === -1 || bytes < 0) return 'unlimited'
  if (bytes === 0) return '0 B'

  for (const unit of SIZE_UNITS) {
    if (bytes >= unit.bytes && bytes % unit.bytes === 0) {
      return `${bytes / unit.bytes} ${(unit.suffix[0] ?? '').toUpperCase()}`
    }
    if (bytes >= unit.bytes) {
      const value = bytes / unit.bytes
      return `${Math.round(value * 100) / 100} ${(unit.suffix[0] ?? '').toUpperCase()}`
    }
  }

  return `${bytes} B`
}

/**
 * Parse a human-readable size string to bytes.
 * Supports: "10G", "10GB", "10 gb", "32M", "1.5TB", "off", "unlimited"
 * Also accepts plain numbers (treated as bytes for backward compatibility).
 * @param input - User input string
 * @returns Size in bytes, or null if invalid. "off"/"unlimited" → -1
 */
export function parseSize(input: string): number | null {
  if (!input || typeof input !== 'string') return null

  const trimmed = input.trim().toLowerCase()
  if (trimmed === '' || trimmed === 'off' || trimmed === 'unlimited') return -1

  // Try plain number first (backward compatibility)
  const plainNumber = Number(trimmed)
  if (!isNaN(plainNumber) && trimmed !== '') {
    return Math.round(plainNumber)
  }

  // Parse number + unit: "10G", "1.5 TB", "32 mb"
  const regex = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/
  const match = trimmed.match(regex)

  if (!match) return null

  const value = parseFloat(match[1] ?? '')
  const unitStr = match[2] ?? ''

  if (isNaN(value)) return null

  const unit = SIZE_UNITS.find(u => u.suffix.includes(unitStr))
  if (unit) {
    return Math.round(value * unit.bytes)
  }

  return null
}
