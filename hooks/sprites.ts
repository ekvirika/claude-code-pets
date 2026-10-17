import { ACCENTS, fainted } from './accessories'

// Pixel sprites, 16 wide and 12 tall, drawn facing right.
// Letters are palette slots a skin fills in:
//   B body   D dark (ears, paws, tail)   L light (belly, muzzle)
//   E eye    N nose   P pink (tongue)    . empty
export const W = 16
export const H = 12

export type Frame = readonly string[]
export type Species = 'dog' | 'cat' | 'fox'
export type Pose = 'walk' | 'sit' | 'sleep' | 'happy' | 'eat' | 'faint'

const DOG_WALK_A: Frame = [
  '................',
  '..........DD....',
  '..........DBBB..',
  '..........BBEBB.',
  '..........BBBBLN',
  'D.........BBBLL.',
  '.D.....BBBBBBP..',
  '.BBBBBBBBBBBB...',
  '.BBBBLLLLLBBB...',
  '..B..B....B..B..',
  '..B..B....B..B..',
  '..D..D....D..D..',
]
const DOG_WALK_B: Frame = [
  '................',
  '..........DD....',
  '..........DBBB..',
  '..........BBEBB.',
  '..........BBBBLN',
  '.D........BBBLL.',
  '.D.....BBBBBBP..',
  '.BBBBBBBBBBBB...',
  '.BBBBLLLLLBBB...',
  '...B.B.....B.B..',
  '...B.B.....B.B..',
  '...D.D.....D.D..',
]
const DOG_SIT: Frame = [
  '................',
  '........DD......',
  '........DBBB....',
  '........BBEBB...',
  '........BBBBLN..',
  '........BBBLL...',
  '.......BBBBP....',
  '......BBBBB.....',
  '..D..BBBLLB.....',
  '...DBBBBLLB.....',
  '....BBBB.BB.....',
  '....DDD..DD.....',
]
const DOG_SLEEP: Frame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........DD....',
  'D.........DBBB..',
  '.DBBBBBBBBBBDBB.',
  '..BBBBLLLLBBBBLN',
  '..DDDDDDDDDDDD..',
]
const DOG_HAPPY: Frame = [
  '..........DD....',
  '..........DBBB..',
  '..........BBEBB.',
  '.D........BBBBLN',
  'D.........BBBLL.',
  '.D.....BBBBBBPP.',
  '.BBBBBBBBBBBB...',
  '.BBBBLLLLLBBB...',
  '.BB..B....BB..B.',
  'B....B....B....B',
  'D...D......D..D.',
  '................',
]

const CAT_WALK_A: Frame = [
  '................',
  '.B.........B..B.',
  '.B.........BBBB.',
  '..B........BEBBB',
  '..B........BBBLN',
  '..B.......BBBLL.',
  '...BBBBBBBBBB...',
  '...BBBBBBBBBB...',
  '...BBLLLLLBBB...',
  '...B.B....B.B...',
  '...B.B....B.B...',
  '...D.D....D.D...',
]
const CAT_WALK_B: Frame = [
  '................',
  'B..........B..B.',
  'B..........BBBB.',
  '.B.........BEBBB',
  '..B........BBBLN',
  '..B.......BBBLL.',
  '...BBBBBBBBBB...',
  '...BBBBBBBBBB...',
  '...BBLLLLLBBB...',
  '....BB....BB....',
  '....B.B....B.B..',
  '....D.D....D.D..',
]
const CAT_SIT: Frame = [
  '................',
  '........B..B....',
  '........BBBB....',
  '........BEBBB...',
  '........BBBLN...',
  '........BBLL....',
  '.......BBBB.....',
  '......BBBBB.....',
  '.B...BBBLLB.....',
  '..B.BBBBLLB.....',
  '...BBBBB.BB.....',
  '....DDD..DD.....',
]
const CAT_SLEEP: Frame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........B..B..',
  '..........BBBB..',
  '.BBBBBBBBBBDBBB.',
  'B.BBBBLLLLBBBLN.',
  '.BDDDDDDDDDDDD..',
]
const CAT_HAPPY: Frame = [
  '...........B..B.',
  '.B.........BBBB.',
  'B..........BEBBB',
  'B..........BBBLN',
  '.B........BBBLL.',
  '..BBBBBBBBBBB...',
  '..BBBBBBBBBBB...',
  '..BBBLLLLLBBB...',
  '..B..B....B..B..',
  '.B...B....B...B.',
  '.D...D....D...D.',
  '................',
]

const FOX_WALK_A: Frame = [
  '................',
  '...........B..B.',
  '...........BBBB.',
  'LL.........BEBBB',
  'BBB........LLLLN',
  '.BBB......BBLL..',
  '..BBBBBBBBBBB...',
  '...BBBBBBBBBB...',
  '...BBLLLLLBBB...',
  '...D.D....D.D...',
  '...D.D....D.D...',
  '...D.D....D.D...',
]
const FOX_WALK_B: Frame = [
  '................',
  '...........B..B.',
  'LL.........BBBB.',
  'BBB........BEBBB',
  '.BBB.......LLLLN',
  '..BB......BBLL..',
  '..BBBBBBBBBBB...',
  '...BBBBBBBBBB...',
  '...BBLLLLLBBB...',
  '....DD....DD....',
  '....D.D....D.D..',
  '....D.D....D.D..',
]
const FOX_SIT: Frame = [
  '................',
  '........B..B....',
  '........BBBB....',
  '........BEBBB...',
  '........LLLLN...',
  '........BLL.....',
  '.......BBBB.....',
  'LL....BBBBB.....',
  'BBB..BBBLLB.....',
  '.BBBBBBBLLB.....',
  '..BBBBDD.DD.....',
  '....DDD..DD.....',
]
const FOX_SLEEP: Frame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........B..B..',
  '..........BBBB..',
  '..BBBBBBBBBDBBB.',
  'LBBBBBLLLLBLLLLN',
  'LLBDDDDDDDDDDD..',
]
const FOX_HAPPY: Frame = [
  '...........B..B.',
  '...........BBBB.',
  'LL.........BEBBB',
  'BBB........LLLLN',
  '.BBB......BBLLP.',
  '..BBBBBBBBBBB...',
  '...BBBBBBBBBB...',
  '...BBLLLLLBBB...',
  '..D..D....D..D..',
  '.D...D....D...D.',
  '.D...D....D...D.',
  '................',
]

const DACHS_WALK_A: Frame = [
  '................',
  '................',
  '................',
  '................',
  '...........DD...',
  '..........DBBBB.',
  'D.........BBEBB.',
  '.D........BBBBLN',
  '.BBBBBBBBBBBBLL.',
  '.BBBBBBBBBBBBP..',
  '..BLLLLLLLLBB...',
  '..D.D....D.D....',
]
const DACHS_WALK_B: Frame = [
  '................',
  '................',
  '................',
  '................',
  '...........DD...',
  '..........DBBBB.',
  '.D........BBEBB.',
  'D.........BBBBLN',
  '.BBBBBBBBBBBBLL.',
  '.BBBBBBBBBBBBP..',
  '..BLLLLLLLLBB...',
  '...D.D....D.D...',
]
const DACHS_SIT: Frame = [
  '................',
  '................',
  '................',
  '........DD......',
  '........DBBBB...',
  '........BBEBB...',
  '........BBBBLN..',
  '........BBBLL...',
  '.......BBBBP....',
  '..D.BBBBBBB.....',
  '...BBBBLLBB.....',
  '...DDD...DD.....',
]
const DACHS_SLEEP: Frame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...........DD...',
  'DBBBBBBBBBBDBBB.',
  '.BBLLLLLLLBBBLLN',
]
const DACHS_HAPPY: Frame = [
  '................',
  '................',
  '................',
  '...........DD...',
  '..........DBBBB.',
  '.D........BBEBB.',
  'D.........BBBBLN',
  '.BBBBBBBBBBBBLLP',
  '.BBBBBBBBBBBBP..',
  '..BLLLLLLLLBB...',
  '.D...D....D...D.',
  '................',
]

const CORGI_WALK_A: Frame = [
  '................',
  '................',
  '..........D..D..',
  '..........DBBD..',
  '..........BBEBB.',
  '..........BBBBLN',
  'B.........BBBLL.',
  'BBBBBBBBBBBBBP..',
  'BBBBBBBBBBBBB...',
  '.BBLLLLLLLLBB...',
  '.BB.......BB....',
  '.DD.......DD....',
]
const CORGI_WALK_B: Frame = [
  '................',
  '................',
  '..........D..D..',
  '..........DBBD..',
  '..........BBEBB.',
  '..........BBBBLN',
  'B.........BBBLL.',
  'BBBBBBBBBBBBBP..',
  'BBBBBBBBBBBBB...',
  '.BBLLLLLLLLBB...',
  '..BB.....BB.....',
  '..DD.....DD.....',
]
const CORGI_SIT: Frame = [
  '................',
  '........D..D....',
  '........DBBD....',
  '........BBEBB...',
  '........BBBBLN..',
  '........BBBLL...',
  '.......BBBBP....',
  '......BBBBB.....',
  '.....BBBLLB.....',
  '....BBBBLLB.....',
  '...BBBBB.BB.....',
  '...DDDD..DD.....',
]
const CORGI_SLEEP: Frame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...........D..D.',
  '...........DBBD.',
  'BBBBBBBBBBBBDBBB',
  '.BBLLLLLLLLBBBLN',
]
const CORGI_HAPPY: Frame = [
  '................',
  '..........D..D..',
  '..........DBBD..',
  '..........BBEBB.',
  '..........BBBBLN',
  'B.........BBBLLP',
  'BBBBBBBBBBBBBP..',
  'BBBBBBBBBBBBB...',
  '.BBLLLLLLLLBB...',
  'BB........BB....',
  'DD........DD....',
  '................',
]

const COON_WALK_A: Frame = [
  '................',
  'BB.........B..B.',
  'BBB........BBBB.',
  '.BBB.......BEBBB',
  '..BB......LBBBLN',
  '...B......LLBLL.',
  '...BBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBLLLLLLBBB..',
  '...B.B....B.B...',
  '...B.B....B.B...',
  '...D.D....D.D...',
]
const COON_WALK_B: Frame = [
  '................',
  'B..........B..B.',
  'BB.........BBBB.',
  'BBB........BEBBB',
  '.BBB......LBBBLN',
  '...B......LLBLL.',
  '...BBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBLLLLLLBBB..',
  '....B.B....B.B..',
  '....B.B....B.B..',
  '....D.D....D.D..',
]
const COON_SIT: Frame = [
  '................',
  '........B..B....',
  '........BBBB....',
  '........BEBBB...',
  '.......LBBBLN...',
  '.......LLBLL....',
  '......BBBBBB....',
  'BB...BBBBBBB....',
  'BBB.BBBLLLBB....',
  '.BBBBBBLLLBB....',
  '..BBBBBB.BBB....',
  '....DDD..DD.....',
]
const COON_SLEEP: Frame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........B..B..',
  '..........BBBB..',
  'BBBBBBBBBBBDBBBB',
  'BBBBBLLLLLBBBLN.',
]
const COON_HAPPY: Frame = [
  '...........B..B.',
  'B..........BBBB.',
  'BB.........BEBBB',
  'BBB.......LBBBLN',
  '.BB.......LLBLL.',
  '..BBBBBBBBBBBB..',
  '..BBBBBBBBBBBB..',
  '..BBBLLLLLLBBB..',
  '..B..B....B..B..',
  '.B...B....B...B.',
  '.D...D....D...D.',
  '................',
]

const KITTEN_WALK_A: Frame = [
  '................',
  '................',
  '................',
  '..........B..B..',
  '..........BBBB..',
  '..........BEBBB.',
  '.B........BBBLN.',
  '..B.......BBLL..',
  '...BBBBBBBBB....',
  '...BBLLLLLBB....',
  '...B.B...B.B....',
  '...D.D...D.D....',
]
const KITTEN_WALK_B: Frame = [
  '................',
  '................',
  '................',
  '..........B..B..',
  '..........BBBB..',
  '..........BEBBB.',
  'B.........BBBLN.',
  '.B........BBLL..',
  '...BBBBBBBBB....',
  '...BBLLLLLBB....',
  '....B.B...B.B...',
  '....D.D...D.D...',
]
const KITTEN_SIT: Frame = [
  '................',
  '................',
  '................',
  '................',
  '........B..B....',
  '........BBBB....',
  '........BEBBB...',
  '........BBBLN...',
  '.B.....BBBLL....',
  '..B..BBBBLB.....',
  '...BBBBBB.B.....',
  '....DDD..DD.....',
]
const KITTEN_SLEEP: Frame = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........B..B..',
  '.BBBBBBBBBBDBBB.',
  'B.BBLLLLLBBBBLN.',
]
const KITTEN_HAPPY: Frame = [
  '................',
  '................',
  '..........B..B..',
  '..........BBBB..',
  'B.........BEBBB.',
  '.B........BBBLN.',
  '..B.......BBLL..',
  '...BBBBBBBBB....',
  '...BBLLLLLBB....',
  '..B..B...B..B...',
  '..D..D...D..D...',
  '................',
]

// The food bowl: B bowl, D rim shadow, L kibble. 8 wide, 4 tall.
export const BOWL_FULL: Frame = ['..LLLL..', '.LLLLLL.', 'DBBBBBBD', '.BBBBBB.']
export const BOWL_HALF: Frame = ['........', '..L.LL..', 'DBBBBBBD', '.BBBBBB.']

// Closed eyes: the eye pixels drawn in the dark color.
function blink(f: Frame): Frame {
  return f.map(row => row.replace(/E/g, 'D'))
}

// The same pose one pixel lower: the landing half of a hop.
function lower(f: Frame): Frame {
  return ['.'.repeat(W), ...f.slice(0, H - 1)]
}

// A breath in: the sleeping back rises by a pixel over its middle.
function breathe(f: Frame): Frame {
  const rows = [...f]
  const back = rows.findIndex(row => /B{6,}/.test(row))
  if (back <= 0) return f
  const above = [...rows[back - 1]!]
  for (let c = 3; c < 9; c++) if (above[c] === '.' && rows[back]![c] === 'B') above[c] = 'B'
  rows[back - 1] = above.join('')
  return rows
}

// Head down to the bowl: the head (right of column 9, above the legs) drops by `by` rows.
function eat(f: Frame, by: number): Frame {
  const rows = f.map(row => [...row])
  for (let r = 0; r < 9; r++) for (let c = 9; c < W; c++) rows[r]![c] = '.'
  for (let r = 8; r >= 0; r--) {
    for (let c = 9; c < W; c++) if (f[r]![c] !== '.' && r + by < H) rows[r + by]![c] = f[r]![c]!
  }
  return rows.map(row => row.join(''))
}

const sitting = (f: Frame) => [f, f, f, f, f, f, f, blink(f)]
const sleeping = (f: Frame) => [f, f, f, breathe(f), breathe(f), breathe(f)]
const hopping = (f: Frame) => [f, lower(f)]
const eating = (f: Frame) => [eat(f, 2), eat(f, 3)]

export type Breed = { label: string; skin: string; poses: Record<Pose, readonly Frame[]> }

function breed(label: string, skin: string, walkA: Frame, walkB: Frame, sit: Frame, sleep: Frame, happy: Frame): Breed {
  return {
    label,
    skin,
    poses: { walk: [walkA, walkB], sit: sitting(sit), sleep: sleeping(sleep), happy: hopping(happy), eat: eating(walkA), faint: [fainted(walkA)] },
  }
}

// Body shapes. Every skin of a species fits every breed of it; `skin` is the breed's usual look.
export const BREEDS: Record<Species, Record<string, Breed>> = {
  dog: {
    retriever: breed('Retriever', 'golden', DOG_WALK_A, DOG_WALK_B, DOG_SIT, DOG_SLEEP, DOG_HAPPY),
    dachshund: breed('Dachshund', 'choco', DACHS_WALK_A, DACHS_WALK_B, DACHS_SIT, DACHS_SLEEP, DACHS_HAPPY),
    corgi: breed('Corgi', 'corgi', CORGI_WALK_A, CORGI_WALK_B, CORGI_SIT, CORGI_SLEEP, CORGI_HAPPY),
  },
  cat: {
    shorthair: breed('Shorthair', 'ginger', CAT_WALK_A, CAT_WALK_B, CAT_SIT, CAT_SLEEP, CAT_HAPPY),
    mainecoon: breed('Maine Coon', 'gray', COON_WALK_A, COON_WALK_B, COON_SIT, COON_SLEEP, COON_HAPPY),
    kitten: breed('Kitten', 'white', KITTEN_WALK_A, KITTEN_WALK_B, KITTEN_SIT, KITTEN_SLEEP, KITTEN_HAPPY),
  },
  fox: {
    fox: breed('Fox', 'red', FOX_WALK_A, FOX_WALK_B, FOX_SIT, FOX_SLEEP, FOX_HAPPY),
  },
}

export function breedOf(species: Species, id: string | undefined): Breed {
  const all = BREEDS[species]
  return (id && all[id]) || Object.values(all)[0]!
}

// O, when given, is the outline (a two-color skin keeps it in its own colors); H is a heart.
// `mono` marks a two-color skin: its accessories and props are drawn in B and D only.
export type Skin = { label: string; B: string; D: string; L: string; E: string; N: string; P: string; O?: string; H?: string; mono?: true }

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// The outline around a pet: light around a dark coat, dark around everything else,
// so every skin stands out on a light or a dark background.
export function outlineOf(skin: Skin): string {
  if (skin.O) return skin.O
  return luminance(skin.B) < 0.36 ? '#A8A8B3' : '#2B2320'
}

// Add a skin by giving it a name and six colors.
export const SKINS: Record<Species, Record<string, Skin>> = {
  dog: {
    golden: { label: 'Golden retriever', B: '#D9A15B', D: '#9A6431', L: '#F6DDB3', E: '#1B1B1B', N: '#1B1B1B', P: '#F27C8A' },
    corgi: { label: 'Corgi', B: '#E8892E', D: '#B35F12', L: '#FFF6EA', E: '#1B1B1B', N: '#1B1B1B', P: '#F27C8A' },
    lab: { label: 'Black lab', B: '#2E2B2A', D: '#141212', L: '#5A5450', E: '#E8C26B', N: '#0A0A0A', P: '#F27C8A' },
    husky: { label: 'Husky', B: '#8C96A3', D: '#3E4650', L: '#F4F4F4', E: '#5BC0F8', N: '#1B1B1B', P: '#F27C8A' },
    choco: { label: 'Chocolate', B: '#7B4A2D', D: '#4A2A17', L: '#B07A55', E: '#1B1B1B', N: '#1B1B1B', P: '#F27C8A' },
    snow: { label: 'Samoyed', B: '#F2F2F2', D: '#C9C9C9', L: '#FFFFFF', E: '#1B1B1B', N: '#1B1B1B', P: '#F27C8A' },
    maltipoo: { label: 'Maltipoo', B: '#F1D2A6', D: '#C8956A', L: '#FFF4E4', E: '#1B1B1B', N: '#1B1B1B', P: '#F27C8A' },
  },
  cat: {
    ginger: { label: 'Ginger tabby', B: '#F09A3E', D: '#B8621A', L: '#FFE3C2', E: '#3D8B37', N: '#F27C8A', P: '#F27C8A' },
    black: { label: 'Black cat', B: '#24232A', D: '#111015', L: '#3A3842', E: '#F5D547', N: '#F27C8A', P: '#F27C8A' },
    gray: { label: 'Gray', B: '#9AA0A8', D: '#5E646C', L: '#E2E4E7', E: '#4FB3BF', N: '#F27C8A', P: '#F27C8A' },
    siamese: { label: 'Siamese', B: '#EFE2CC', D: '#5A4032', L: '#FFF8EC', E: '#4A90E2', N: '#5A4032', P: '#F27C8A' },
    white: { label: 'White', B: '#FAFAFA', D: '#D0D0D0', L: '#FFFFFF', E: '#6CA0DC', N: '#F27C8A', P: '#F27C8A' },
  },
  fox: {
    red: { label: 'Red fox', B: '#E5672D', D: '#6B3A22', L: '#FFF8F0', E: '#1B1B1B', N: '#1B1B1B', P: '#F27C8A' },
    arctic: { label: 'Arctic fox', B: '#EDEFF2', D: '#9AA3AD', L: '#FFFFFF', E: '#1B1B1B', N: '#1B1B1B', P: '#F27C8A' },
    silver: { label: 'Silver fox', B: '#4B4F57', D: '#1E2024', L: '#E8E8E8', E: '#F5D547', N: '#111111', P: '#F27C8A' },
  },
}

export function frameFor(species: Species, breedId: string | undefined, pose: Pose, tick: number): Frame {
  const frames = breedOf(species, breedId).poses[pose]
  return frames[tick % frames.length]!
}

// A two-color pet's bowl: its body color, with a contrast rim and kibble.
export function monoProps(skin: Skin): Skin {
  return { label: 'Props', B: skin.B, D: skin.D, L: skin.D, E: skin.D, N: skin.D, P: skin.D, O: skin.O, mono: true }
}

export const BOWL_SKIN: Skin = { label: 'Bowl', B: '#4A7BD0', D: '#2E4E8A', L: '#B5651D', E: '#000000', N: '#000000', P: '#000000' }

// The sprite's colors, row by row: null where the pixel is empty.
// An empty pixel beside the pet (up, down, left or right) becomes the outline.
// openGaps: a one-pixel gap between two filled pixels stays empty instead of
// being outlined, so the legs of the small pets don't melt into one block.
export function pixels(frame: Frame, skin: Skin, dir: 1 | -1, openGaps = false): (string | null)[][] {
  const width = frame[0]?.length ?? W
  const filled = (r: number, c: number) => c >= 0 && c < width && (frame[r]?.[c] ?? '.') !== '.'
  const edge = outlineOf(skin)
  return frame.map((row, r) => {
    const cells = [...row].map((ch, c) => {
      if (ch !== '.') return skin[ch as 'B' | 'D' | 'L' | 'E' | 'N' | 'P' | 'H'] ?? ACCENTS[ch] ?? null
      if (openGaps && filled(r, c - 1) && filled(r, c + 1)) return null
      return filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1) ? edge : null
    })
    return dir === 1 ? cells : cells.reverse()
  })
}

// Half the size: each 2x2 block of pixels becomes one, for narrow terminals.
// An eye in the block wins, so the face survives; otherwise the most common
// letter, and a block with only one pixel in it is left empty, except in the legs.
export function shrink(f: Frame): Frame {
  const h = Math.ceil(f.length / 2)
  const w = Math.ceil((f[0]?.length ?? 0) / 2)
  const out: string[] = []
  for (let r = 0; r < h; r++) {
    let row = ''
    for (let c = 0; c < w; c++) {
      const cells = [f[2 * r]?.[2 * c], f[2 * r]?.[2 * c + 1], f[2 * r + 1]?.[2 * c], f[2 * r + 1]?.[2 * c + 1]].filter(
        (ch): ch is string => ch !== undefined && ch !== '.',
      )
      // Legs are one pixel wide: in the bottom rows a lone pixel is kept, so they survive.
      const isLegRow = r >= h - 2
      if (cells.includes('E')) row += 'E'
      else if (cells.length >= 2 || (isLegRow && cells.length === 1)) {
        const counts = new Map<string, number>()
        for (const ch of cells) counts.set(ch, (counts.get(ch) ?? 0) + 1)
        row += [...counts].sort((a, b) => b[1] - a[1])[0]![0]
      } else row += '.'
    }
    out.push(row)
  }
  return out
}

// Mini pets for narrow terminals: their own 10×8 art (10 columns × 4 rows), not a shrunken copy.
export const MW = 10
export const MH = 8
export type MiniSet = { walk: [Frame, Frame]; sit: Frame; sleep: Frame }
const MINI_ART: Record<string, MiniSet> = {
  DOG: {
    walk: [
      ['.....DBB..', '.....BEBB.', 'D....BBLLN', '.D...BBP..', '.BBBBBBB..', '.BBLLLBB..', '.B.B.B.B..', '.D.D.D.D..'],
      ['.....DBB..', 'D....BEBB.', '.D...BBLLN', '..D..BBP..', '.BBBBBBB..', '.BBLLLBB..', '..BB.BB...', '..DD.DD...'],
    ],
    sit: ['....DBB...', '....BEBB..', '....BBLLN.', '....BBP...', '...BBBB...', '.D.BBLB...', '..BBBLB...', '..DD.DD...'],
    sleep: ['..........', '..........', '..........', '..........', '..........', '.....DBB..', 'D.BBBBDBLN', '.BBLLLBBB.'],
  },
  DACHS: {
    walk: [
      ['..........', '..........', '......DBB.', '......BEBB', 'D.....BBLN', '.BBBBBBBB.', '.BLLLLLLB.', '.D.D..D.D.'],
      ['..........', '..........', '......DBB.', '.D....BEBB', 'D.....BBLN', '.BBBBBBBB.', '.BLLLLLLB.', '..DD..DD..'],
    ],
    sit: ['..........', '....DBB...', '....BEBB..', '....BBLN..', '...BBBB...', '.D.BBLB...', '..BBBLB...', '..DD.DD...'],
    sleep: ['..........', '..........', '..........', '..........', '..........', '.....DBB..', 'D.BBBBDBLN', '.BLLLLLBB.'],
  },
  CORGI: {
    walk: [
      ['..........', '.....D.D..', '.....BBB..', '.....BEBB.', 'B....BBLLN', 'BBBBBBBB..', '.BLLLLLB..', '.DD...DD..'],
      ['..........', '.....D.D..', '.....BBB..', '.....BEBB.', 'B....BBLLN', 'BBBBBBBB..', '.BLLLLLB..', '..DD.DD...'],
    ],
    sit: ['....D.D...', '....BBB...', '....BEBB..', '....BBLLN.', '...BBBB...', '..BBLLB...', '.BBBLLB...', '.DDD.DD...'],
    sleep: ['..........', '..........', '..........', '..........', '..........', '.....D.D..', 'BBBBBBDBLN', '.BLLLLLBB.'],
  },
  CAT: {
    walk: [
      ['.....B.B..', 'B....BBB..', 'B....BEBB.', '.B...BBN..', '.BBBBBBB..', '.BBLLLBB..', '.B.B.B.B..', '.D.D.D.D..'],
      ['.....B.B..', '.B...BBB..', '.B...BEBB.', '.B...BBN..', '.BBBBBBB..', '.BBLLLBB..', '..BB.BB...', '..DD.DD...'],
    ],
    sit: ['....B.B...', '....BBB...', '....BEBB..', '....BBN...', '...BBBB...', '.B.BLLB...', '..BBLLB...', '..DD.DD...'],
    sleep: ['..........', '..........', '..........', '..........', '..........', '.....B.B..', 'BBBBBBDBN.', 'BBBLLLBB..'],
  },
  COON: {
    walk: [
      ['.....B.B..', 'BB...BBB..', 'BB...BEBB.', 'BB..LBBN..', '.BBBBBBB..', '.BBLLLBB..', '.B.B.B.B..', '.D.D.D.D..'],
      ['.B...B.B..', 'BBB..BBB..', '.BB..BEBB.', '.B..LBBN..', '.BBBBBBB..', '.BBLLLBB..', '..BB.BB...', '..DD.DD...'],
    ],
    sit: ['....B.B...', '....BBB...', '....BEBB..', '...LBBN...', 'BB.BBBB...', 'BBBBLLB...', '.BBBLLB...', '..DD.DD...'],
    sleep: ['..........', '..........', '..........', '..........', '..........', '.....B.B..', 'BBBBBBDBN.', 'BBBBLLBB..'],
  },
  KITTEN: {
    walk: [
      ['..........', '.....B.B..', '.....BBB..', '.B...BEBB.', '..B..BBN..', '..BBBBB...', '..BLLLB...', '..D.D.D...'],
      ['..........', '.....B.B..', '.B...BBB..', '..B..BEBB.', '..B..BBN..', '..BBBBB...', '..BLLLB...', '...D.DD...'],
    ],
    sit: ['..........', '..........', '....B.B...', '....BBB...', '....BEBB..', '.B..BBN...', '..BBBLB...', '..DD.D....'],
    sleep: ['..........', '..........', '..........', '..........', '..........', '..........', '......B.B.', '.BBBBBDBN.'],
  },
  FOX: {
    walk: [
      ['.....B.B..', '.....BBB..', 'L....BEBB.', 'BB...LLLN.', 'BBBBBBBB..', '.BBLLLBB..', '.D.D.D.D..', '.D.D.D.D..'],
      ['L....B.B..', 'BB...BBB..', 'BB...BEBB.', '.B...LLLN.', '.BBBBBBB..', '.BBLLLBB..', '..DD.DD...', '..DD.DD...'],
    ],
    sit: ['....B.B...', '....BBB...', '....BEBB..', '....LLLN..', '...BBBB...', 'L..BLLB...', 'BBBBLLB...', '..DD.DD...'],
    sleep: ['..........', '..........', '..........', '..........', '..........', '.....B.B..', 'LBBBBBDBB.', 'LLBBLLLLN.'],
  },
}
const MINI_OF: Record<string, keyof typeof MINI_ART> = {
  retriever: 'DOG',
  dachshund: 'DACHS',
  corgi: 'CORGI',
  shorthair: 'CAT',
  mainecoon: 'COON',
  kitten: 'KITTEN',
  fox: 'FOX',
}

export function miniFrame(species: Species, breedId: string | undefined, pose: Pose, tick: number): Frame {
  return compactFrame('small', species, breedId, pose, tick)
}

export function tinyFrame(species: Species, breedId: string | undefined, pose: Pose, tick: number): Frame {
  return compactFrame('tiny', species, breedId, pose, tick)
}

// The compact art for a pose (small: 10×8, tiny: 8×6): a two-frame walk, a sit that blinks, a sleep, a hop.
export function compactFrame(kind: 'small' | 'tiny', species: Species, breedId: string | undefined, pose: Pose, tick: number): Frame {
  const id = breedId && MINI_OF[breedId] ? breedId : Object.keys(BREEDS[species])[0]!
  const set = kind === 'tiny' ? TINY_ART : MINI_ART
  const art = set[MINI_OF[id] ?? 'DOG']!
  const [a, b] = art.walk
  const width = a[0]?.length ?? MW
  const up = (f: Frame) => [...f.slice(1), '.'.repeat(width)]
  switch (pose) {
    case 'walk':
      return tick % 2 ? b : a
    case 'sit':
      return tick % 8 === 7 ? art.sit.map(r => r.replace(/E/g, 'D')) : art.sit
    case 'sleep':
      return art.sleep
    case 'happy':
      return tick % 2 ? a : up(a)
    case 'eat':
      return tick % 2 ? a : up(a).map((r, i) => (i === 0 ? r : r))
    case 'faint':
      return fainted(a)
  }
}

// Tiny pets, the terminal's default: 8×6 art, 8 columns × 3 rows.
export const TW = 8
export const TH = 6
const TINY_ART: Record<string, MiniSet> = {
  DOG: {
    walk: [
      ['....DBB.', '....BEBB', 'D...BBLN', '.BBBBBL.', '.BBLLBB.', '.D.D.D.D'],
      ['....DBB.', 'D...BEBB', '.D..BBLN', '.BBBBBL.', '.BBLLBB.', '..D.D.D.'],
    ],
    sit: ['...DBB..', '...BEBB.', '...BBLN.', '..BBBL..', '.DBBLB..', '..DD.D..'],
    sleep: ['........', '........', '........', '....DBB.', 'D.BBBDBN', '.BBLLBB.'],
  },
  DACHS: {
    walk: [
      ['........', '.....DB.', 'D....BEB', '.BBBBBLN', '.BLLLLB.', '.D.D.D.D'],
      ['........', '.....DB.', '.D...BEB', 'DBBBBBLN', '.BLLLLB.', '..D.D.D.'],
    ],
    sit: ['........', '...DB...', '...BEB..', '..BBLN..', '.DBBLB..', '..DD.D..'],
    sleep: ['........', '........', '........', '.....DB.', 'D.BBBDBN', '.BLLLLB.'],
  },
  CORGI: {
    walk: [
      ['.....D.D', '.....BEB', 'B....BLN', 'BBBBBBL.', '.BLLLB..', '.DD..DD.'],
      ['.....D.D', '.....BEB', 'B....BLN', 'BBBBBBL.', '.BLLLB..', '..DD.DD.'],
    ],
    sit: ['...D.D..', '...BEB..', '...BLN..', '..BBL...', '.BBLB...', '.DD.D...'],
    sleep: ['........', '........', '........', '.....D.D', 'BBBBBDBN', '.BLLLBB.'],
  },
  CAT: {
    walk: [
      ['....B.B.', 'B...BEBB', '.B..BBN.', '..BBBBB.', '..BLLBB.', '..D.D.D.'],
      ['....B.B.', '.B..BEBB', 'B...BBN.', '..BBBBB.', '..BLLBB.', '...D.D.D'],
    ],
    sit: ['...B.B..', '...BEBB.', '...BBN..', '..BBBB..', '.BBLLB..', '.BDD.D..'],
    sleep: ['........', '........', '........', '....B.B.', 'BBBBBDBB', 'BBLLLBN.'],
  },
  COON: {
    walk: [
      ['B...B.B.', 'BB..BEBB', 'BB.LBBN.', '.BBBBBB.', '..BLLBB.', '..D.D.D.'],
      ['.B..B.B.', 'BBB.BEBB', '.B.LBBN.', '.BBBBBB.', '..BLLBB.', '...D.D.D'],
    ],
    sit: ['...B.B..', '...BEBB.', '..LBBN..', 'B.BBBB..', 'BBBLLB..', '..DD.D..'],
    sleep: ['........', '........', '........', '....B.B.', 'BBBBBDBB', 'BBBLLBN.'],
  },
  KITTEN: {
    walk: [
      ['...B.B..', '...BEBB.', 'B..BBN..', '.BBBBB..', '..BLLB..', '..D..D..'],
      ['...B.B..', '...BEBB.', '.B.BBN..', '.BBBBB..', '..BLLB..', '...DD...'],
    ],
    sit: ['........', '...B.B..', '...BEBB.', '...BBN..', '.BBBLB..', '..DD.D..'],
    sleep: ['........', '........', '........', '........', '...B.B..', '.BBBBDBN'],
  },
  FOX: {
    walk: [
      ['....B.B.', '....BEBB', 'LB..LLLN', 'BBBBBBB.', '.BBLLB..', '..D..D..'],
      ['....B.B.', 'L...BEBB', 'BB..LLLN', '.BBBBBB.', '.BBLLB..', '...DD...'],
    ],
    sit: ['...B.B..', '...BEBB.', '...LLLN.', 'L..BBB..', 'BBBBLB..', '..DD.D..'],
    sleep: ['........', '........', '........', '....B.B.', 'LBBBBDBB', 'LLBLLLLN'],
  },
}
