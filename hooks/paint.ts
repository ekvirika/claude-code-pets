type Grid = (string | null)[][]

const DEFAULT = 0x01000000
const UPPER = 0x2580 // ▀
const LOWER = 0x2584 // ▄
const SPACE = 0x20

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += B64[a >> 2]
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)]
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)]
    out += c === undefined ? '=' : B64[c & 63]
  }
  return out
}

const rgb = (hex: string) => parseInt(hex.replace('#', ''), 16) & 0xffffff

// Terminal: two pixel rows per cell, the upper half-block's foreground the top pixel
// and its background the bottom one, so a 16x12 sprite fills 16 columns by 6 rows
// (and the 8x4 bowl 8 by 2).
export function rasterCells(grid: Grid): string {
  const W = grid[0]?.length ?? 0
  const rows = Math.ceil(grid.length / 2)
  const words = new Uint32Array(W * rows * 3)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < W; c++) {
      const top = grid[r * 2]?.[c] ?? null
      const bottom = grid[r * 2 + 1]?.[c] ?? null
      const at = (r * W + c) * 3
      if (top && bottom) words.set([UPPER, rgb(top), rgb(bottom)], at)
      else if (top) words.set([UPPER, rgb(top), DEFAULT], at)
      else if (bottom) words.set([LOWER, rgb(bottom), DEFAULT], at)
      else words.set([SPACE, DEFAULT, DEFAULT], at)
    }
  }
  return base64(new Uint8Array(words.buffer))
}

// Desktop and other surfaces: the same pixels as crisp SVG squares.
export function svgSource(grid: Grid): string {
  const W = grid[0]?.length ?? 0
  const H = grid.length
  const rects: string[] = []
  grid.forEach((row, y) =>
    row.forEach((color, x) => {
      if (color) rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${color}"/>`)
    }),
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${rects.join('')}</svg>`
}
