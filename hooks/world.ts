// The world around the pets: day and night, seasons, weather, and their toys.
import type { Frame, Skin } from './sprites'

export type Weather = 'none' | 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm'

// wttr.in's weather codes (the World Weather Online set), grouped into what we can draw.
const RAIN = [176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359]
const SNOW = [179, 182, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377]
const STORM = [200, 386, 389, 392, 395]
const CLOUD = [116, 119, 122, 143, 248, 260]

export function weatherFromCode(code: number): Weather {
  if (STORM.includes(code)) return 'storm'
  if (SNOW.includes(code)) return 'snow'
  if (RAIN.includes(code)) return 'rain'
  if (CLOUD.includes(code)) return 'cloudy'
  if (code === 113) return 'clear'
  return 'none'
}

export const WEATHER_ICON: Record<Weather, string> = { none: '', clear: '☀', cloudy: '☁', rain: '☂', snow: '❄', storm: '⚡' }

// Seasons by the calendar: snow and santa hats in December, a pumpkin at the end of October.
export function seasonOf(d: Date): { snow: boolean; santa: boolean; pumpkin: boolean; label: string } {
  const m = d.getMonth()
  const day = d.getDate()
  const santa = m === 11 && day <= 26
  const pumpkin = m === 9 && day >= 24
  const snow = m === 11 || m === 0
  return { snow, santa, pumpkin, label: santa ? 'holidays' : pumpkin ? 'halloween' : snow ? 'winter' : '' }
}

export const isNight = (hour: number) => hour >= 20 || hour < 6
export const isLateNight = (hour: number) => hour >= 0 && hour < 5

// Evening light: every color a little darker.
export function dim(hex: string, amount = 0.28): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(v * (1 - amount))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

const hash = (n: number) => {
  let x = (n + 0x9e3779b9) | 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x ^ (x >>> 16)) >>> 0
}

// One row of falling rain or snow, drifting a little each frame.
export function particles(width: number, frame: number, kind: 'rain' | 'snow' | 'storm'): string {
  let row = ''
  for (let c = 0; c < width; c++) {
    const h = hash(c)
    if (kind === 'snow') row += (h + Math.floor(frame / 3)) % 11 === 0 ? (h % 2 ? '*' : '·') : ' '
    else row += (h + frame) % (kind === 'storm' ? 5 : 7) === 0 ? '╷' : ' '
  }
  return row
}

// Toys that stay on the band: a bed to nap by and a scratching post for the cats.
export const BED_W = 10
export const POST_W = 4
export const PUMPKIN_W = 6

export const BED: Frame = ['..LLLLLL..', '.LLLLLLLL.', 'BBBBBBBBBB', 'D........D']
export const POST: Frame = ['LLLL', 'LLLL', '.BB.', '.BB.', '.BB.', '.BB.', '.BB.', '.BB.', 'DDDD', 'DDDD']
export const PUMPKIN: Frame = ['..D...', '.BBBB.', 'BLBBLB', '.BBBB.']

const skin = (label: string, B: string, D: string, L: string): Skin => ({ label, B, D, L, E: D, N: D, P: D })
export const BED_SKIN = skin('Bed', '#6B5B95', '#3F355A', '#E9E4F2')
export const POST_SKIN = skin('Scratching post', '#D8B983', '#5E4A36', '#9C7A54')
export const PUMPKIN_SKIN = skin('Pumpkin', '#E8771E', '#3E7D2C', '#FFD23F')

// Where the toys stand: the bed near the left edge, the post near the right.
export function toySpots(width: number): { bed: number; post: number } {
  return { bed: 2, post: Math.max(BED_W + 20, width - POST_W - 2) }
}
