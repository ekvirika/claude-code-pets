import type { Frame } from './sprites'

// Accessory colors. These letters never clash with a skin's B D L E N P.
export const ACCENTS: Record<string, string> = {
  K: '#151515', // black
  W: '#FFFFFF', // white
  R: '#E23B3B', // red
  Y: '#F5C542', // gold
  V: '#7B4FD6', // violet
  M: '#FF5FA2', // party pink
  C: '#7FE3FF', // lit screen
  S: '#5A6070', // laptop
  T: '#2B4EA2', // tie
  G: '#0B0B0B', // sunglasses
}

export type Hat = 'party' | 'crown' | 'wizard' | 'santa' | 'tophat'
export type Accessory = Hat | 'shades' | 'bowtie'
export type Wearable = Accessory | 'tie'
export const ACCESSORIES: Accessory[] = ['party', 'crown', 'wizard', 'santa', 'tophat', 'shades', 'bowtie']

// Hats are 5 wide and 4 tall, drawn sitting on the head, centered over the eye.
const HATS: Record<Hat, Frame> = {
  party: ['..Y..', '..M..', '.MYM.', 'MYMYM'],
  crown: ['.....', 'Y.Y.Y', 'YYYYY', 'YRYRY'],
  wizard: ['...V.', '..VV.', '.VYV.', 'VVVVV'],
  santa: ['...RW', '..RR.', '.RRR.', 'WWWWW'],
  tophat: ['.KKK.', '.KKK.', '.RRR.', 'KKKKK'],
}
// The same hats in a two-color skin's colors: B is the pet's body color, D its contrast color,
// each on a contrast brim so it reads apart from a head of the same color.
const MONO_HATS: Record<Hat, Frame> = {
  party: ['..D..', '..B..', '.BDB.', 'DDDDD'],
  crown: ['B.B.B', 'BBBBB', 'BDBDB', 'DDDDD'],
  wizard: ['...B.', '..BB.', '.BDB.', 'DDDDD'],
  santa: ['...BD', '..BB.', '.BBB.', 'DDDDD'],
  tophat: ['.BBB.', '.BBB.', '.DDD.', 'DDDDD'],
}
export const HAT_ROOM = 4

// The laptop for boss mode, 6 wide and 4 tall, its screen facing a pet on its left.
export const LAPTOP: Frame = ['....SS', '...SCS', '..SCCS', 'SSSSSS']
export const LAPTOP_MONO: Frame = ['....DD', '...DBD', '..DBBD', 'DDDDDD']

type Grid = string[][]

// Where the face is: the eye, or on a sleeping or blinking frame the top of the head.
export function anchor(f: Frame): { row: number; col: number } {
  for (let r = 0; r < f.length; r++) {
    const c = f[r]!.indexOf('E')
    if (c >= 0) return { row: r, col: c }
  }
  for (let r = 0; r < f.length; r++) {
    const cols = [...f[r]!].map((ch, c) => (ch !== '.' && c >= 9 ? c : -1)).filter(c => c >= 0)
    if (cols.length) return { row: r + 1, col: Math.round(cols.reduce((a, b) => a + b, 0) / cols.length) }
  }
  return { row: 3, col: 12 }
}

const put = (g: Grid, r: number, c: number, ch: string) => {
  if (r >= 0 && r < g.length && c >= 0 && c < (g[r]?.length ?? 0)) g[r]![c] = ch
}

// Dresses a frame: shades and bow tie in place, a hat on top (with room added above).
// `mono` draws everything in the pet's own two colors, for a two-color (say, brand) pet.
export function dress(f: Frame, items: readonly Wearable[], mono = false): Frame {
  const ink = mono ? 'D' : ''
  const hat = items.find((i): i is Hat => i in HATS)
  const pad = hat ? HAT_ROOM : 0
  const g: Grid = [...Array.from({ length: pad }, () => '.'.repeat(f[0]!.length)), ...f].map(row => [...row])
  const { row, col } = anchor(f)
  const eye = row + pad
  const sleeping = !f.some(r => r.includes('E'))
  // A heart (H) on the chest keeps the chest clear: no tie, bow tie at the neck.
  const hasHeart = f.some(r => r.includes('H'))
  const eyes = [...(f[row] ?? '')].flatMap((ch, c) => (ch === 'E' ? [c] : []))
  const [left, right] = eyes.length ? [Math.min(...eyes), Math.max(...eyes)] : [col, col]
  if (items.includes('shades') && !sleeping) {
    for (let c = left - 1; c <= right + 1; c++) put(g, eye, c, ink || 'G')
  }
  if (items.includes('bowtie')) {
    const at = eye + (hasHeart ? 2 : 3)
    put(g, at, col - 2, ink || 'R')
    put(g, at, col - 1, mono ? 'B' : 'K')
    put(g, at, col, ink || 'R')
  }
  if (items.includes('tie') && !hasHeart) {
    put(g, eye + 3, col - 1, ink || 'T')
    put(g, eye + 4, col - 1, ink || 'T')
    put(g, eye + 5, col - 1, ink || 'T')
  }
  if (hat) {
    const art = (mono ? MONO_HATS : HATS)[hat]
    let top = row
    while (top > 0 && (f[top - 1]?.[col] ?? '.') !== '.') top--
    const bottom = (top === row ? row - 1 : top) + pad
    const center = Math.round((left + right) / 2)
    art.forEach((line, i) => {
      ;[...line].forEach((ch, j) => {
        if (ch !== '.') put(g, bottom - (art.length - 1 - i), center - 2 + j, ch)
      })
    })
  }
  return g.map(r => r.join(''))
}

// Fainted: flat on its back, legs in the air, resting on the ground.
export function fainted(f: Frame): Frame {
  const flipped = [...f].reverse()
  let empty = 0
  while (empty < flipped.length && /^\.+$/.test(flipped[flipped.length - 1 - empty]!)) empty++
  return [...flipped.slice(flipped.length - empty), ...flipped.slice(0, flipped.length - empty)]
}
