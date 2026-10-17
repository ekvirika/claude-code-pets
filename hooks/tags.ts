// Name tags over the pets' heads, in a color you choose.
import type { Skin } from './sprites'

export const NAME_COLORS: Record<string, string> = {
  red: '#FF6B6B',
  orange: '#FFA94D',
  gold: '#FFD43B',
  yellow: '#FFEC70',
  green: '#69DB7C',
  mint: '#63E6BE',
  cyan: '#4DD4FF',
  blue: '#74A7FF',
  purple: '#B197FC',
  pink: '#FF8CC6',
  white: '#FFFFFF',
  gray: '#ADB5BD',
}

// A color name, a hex code (#abc or #aabbcc), or 'auto' to follow the coat. undefined: not a color.
export function parseColor(input: string): string | null | undefined {
  const v = input.trim().toLowerCase()
  if (v === 'auto' || v === 'default' || v === 'reset') return null
  if (v in NAME_COLORS) return NAME_COLORS[v]!
  const hex = v.startsWith('#') ? v : `#${v}`
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex.toUpperCase()
  if (/^#[0-9a-f]{3}$/.test(hex)) return `#${hex.slice(1).split('').map(c => c + c).join('')}`.toUpperCase()
  return undefined
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
}

// The tag's color when you haven't picked one: the coat color, lifted when the coat is too dark to read.
export function autoNameColor(skin: Pick<Skin, 'B' | 'L'>): string {
  if (luminance(skin.B) >= 0.32) return skin.B
  if (luminance(skin.L) >= 0.45) return skin.L
  return '#C8C8D0'
}

// What a pet says: its dark fur color, unless that's too dark to read on a dark terminal.
export function talkColor(skin: Pick<Skin, 'B' | 'D' | 'L'>): string {
  return luminance(skin.D) >= 0.22 ? skin.D : autoNameColor(skin)
}

export const colorName = (hex: string | null) =>
  hex === null ? 'auto' : (Object.entries(NAME_COLORS).find(([, v]) => v === hex)?.[0] ?? hex)
