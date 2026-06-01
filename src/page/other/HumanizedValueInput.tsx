import { Input } from '@arco-design/web-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Humanized input for rclone size (bytes) and duration (nanoseconds) values.
 *
 * Displays the raw numeric value in a human-readable format (e.g. "10 GB", "1h 30m")
 * and accepts user input in the same format. The form value remains the raw number.
 *
 * @param mode - 'size' for bytes (supports K/M/G/T/P), 'duration' for nanoseconds (supports ms/s/m/h/d/w)
 * @param value - Current raw numeric value (bytes or nanoseconds)
 * @param onChange - Callback with the new raw numeric value
 * @param placeholder - Placeholder text
 */
export function HumanizedValueInput({
  mode,
  value,
  onChange,
  placeholder,
}: {
  mode: 'size' | 'duration'
  value?: number
  onChange?: (value: number) => void
  placeholder?: string
}) {
  const { t } = useTranslation()
  const [displayValue, setDisplayValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Format the raw value for display when not editing
  useEffect(() => {
    if (!isEditing && value !== undefined) {
      if (mode === 'size') {
        setDisplayValue(formatSizeForDisplay(value))
      } else {
        setDisplayValue(formatDurationForDisplay(value))
      }
    }
  }, [value, mode, isEditing])

  const handleFocus = () => {
    setIsEditing(true)
    // Show the current display value for editing
  }

  const handleBlur = () => {
    setIsEditing(false)
    // Parse the user input
    if (mode === 'size') {
      const parsed = parseSizeInput(displayValue)
      if (parsed !== null && onChange) {
        onChange(parsed)
      }
      // Reformat display
      if (value !== undefined) {
        setDisplayValue(formatSizeForDisplay(value))
      }
    } else {
      const parsed = parseDurationInput(displayValue)
      if (parsed !== null && onChange) {
        onChange(parsed)
      }
      if (value !== undefined) {
        setDisplayValue(formatDurationForDisplay(value))
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
  }

  const handleChange = (val: string) => {
    setDisplayValue(val)
    // Try to parse on change for immediate feedback
    if (mode === 'size') {
      const parsed = parseSizeInput(val)
      if (parsed !== null && onChange) {
        onChange(parsed)
      }
    } else {
      const parsed = parseDurationInput(val)
      if (parsed !== null && onChange) {
        onChange(parsed)
      }
    }
  }

  const suffixText = mode === 'size' ? t('size_suffix_hint') : t('duration_suffix_hint')

  return (
    <Input
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder || suffixText}
      addAfter={
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
          {mode === 'size' ? 'K/M/G/T' : 's/m/h/d'}
        </span>
      }
    />
  )
}

// ─── Internal helpers ──────────────────────────────────────────────────

const NS_PER_S = 1_000_000_000
const NS_PER_M = 60 * NS_PER_S
const NS_PER_H = 3600 * NS_PER_S
const NS_PER_D = 86400 * NS_PER_S
const NS_PER_W = 7 * 86400 * NS_PER_S
const NS_PER_MS = 1_000_000

function formatDurationForDisplay(ns: number): string {
  if (!ns || ns === 0) return '0s'
  if (ns < 0) return 'off'

  const parts: string[] = []
  let remaining = ns

  const units = [
    { threshold: NS_PER_W, suffix: 'w' },
    { threshold: NS_PER_D, suffix: 'd' },
    { threshold: NS_PER_H, suffix: 'h' },
    { threshold: NS_PER_M, suffix: 'm' },
    { threshold: NS_PER_S, suffix: 's' },
    { threshold: NS_PER_MS, suffix: 'ms' },
  ]

  for (const unit of units) {
    if (remaining >= unit.threshold) {
      const value = Math.floor(remaining / unit.threshold)
      remaining -= value * unit.threshold
      parts.push(`${value}${unit.suffix}`)
    }
  }

  return parts.length > 0 ? parts.join(' ') : '0s'
}

function parseDurationInput(input: string): number | null {
  if (!input || typeof input !== 'string') return null

  const trimmed = input.trim().toLowerCase()
  if (trimmed === '' || trimmed === 'off') return 0

  // Plain number → treat as seconds (user convenience)
  const plainNumber = Number(trimmed)
  if (!isNaN(plainNumber) && trimmed !== '') {
    if (plainNumber > 1000) return Math.round(plainNumber) // already ns
    if (plainNumber >= 0) return Math.round(plainNumber * NS_PER_S) // seconds
  }

  const unitMap: Record<string, number> = {
    w: NS_PER_W, wk: NS_PER_W, week: NS_PER_W, weeks: NS_PER_W,
    d: NS_PER_D, day: NS_PER_D, days: NS_PER_D,
    h: NS_PER_H, hr: NS_PER_H, hour: NS_PER_H, hours: NS_PER_H,
    m: NS_PER_M, min: NS_PER_M, minute: NS_PER_M, minutes: NS_PER_M,
    s: NS_PER_S, sec: NS_PER_S, second: NS_PER_S, seconds: NS_PER_S,
    ms: NS_PER_MS, millisecond: NS_PER_MS, milliseconds: NS_PER_MS,
  }

  let totalNs = 0
  const regex = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g
  let match: RegExpExecArray | null
  let matched = false

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(trimmed)) !== null) {
    const value = parseFloat(match[1] ?? '')
    const unitStr = match[2] ?? ''
    if (isNaN(value)) continue

    const ns = unitMap[unitStr]
    if (ns !== undefined) {
      totalNs += value * ns
      matched = true
    }
  }

  return matched ? Math.round(totalNs) : null
}

function formatSizeForDisplay(bytes: number): string {
  if (bytes === -1 || bytes < 0) return 'unlimited'
  if (bytes === 0) return '0 B'

  const units = [
    { threshold: 1024 ** 5, suffix: 'PB' },
    { threshold: 1024 ** 4, suffix: 'TB' },
    { threshold: 1024 ** 3, suffix: 'GB' },
    { threshold: 1024 ** 2, suffix: 'MB' },
    { threshold: 1024, suffix: 'KB' },
    { threshold: 1, suffix: 'B' },
  ]

  for (const unit of units) {
    if (bytes >= unit.threshold) {
      const value = bytes / unit.threshold
      const rounded = Math.round(value * 100) / 100
      return `${rounded} ${unit.suffix}`
    }
  }

  return `${bytes} B`
}

function parseSizeInput(input: string): number | null {
  if (!input || typeof input !== 'string') return null

  const trimmed = input.trim().toLowerCase()
  if (trimmed === '' || trimmed === 'off' || trimmed === 'unlimited') return -1

  const plainNumber = Number(trimmed)
  if (!isNaN(plainNumber) && trimmed !== '') {
    return Math.round(plainNumber)
  }

  const unitMap: Record<string, number> = {
    pb: 1024 ** 5, p: 1024 ** 5,
    tb: 1024 ** 4, t: 1024 ** 4,
    gb: 1024 ** 3, g: 1024 ** 3,
    mb: 1024 ** 2, m: 1024 ** 2,
    kb: 1024, k: 1024,
    b: 1,
  }

  const regex = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/
  const match = trimmed.match(regex)

  if (!match) return null

  const value = parseFloat(match[1] ?? '')
  const unitStr = match[2] ?? ''

  if (isNaN(value)) return null

  const bytes = unitMap[unitStr]
  if (bytes !== undefined) {
    return Math.round(value * bytes)
  }

  return null
}
