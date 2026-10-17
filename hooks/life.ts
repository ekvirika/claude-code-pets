import type { Ball, Pet, PetMood } from '../types'
import { CORPORATE } from './sass'
import { BREEDS, SKINS, W, breedOf } from './sprites'
import type { Pose, Species } from './sprites'
import { TRAITS } from './growth'
import type { Trait } from './growth'
import { BED_W } from './world'

export const TICK_MS = 200
export const PER_MINUTE = 60_000 / TICK_MS
export const SLEEP_AFTER = 2 * PER_MINUTE
export const BOWL_W = 8
export const LAPTOP_W = 6
export const BALL_W = 4
// Full to empty in about two hours awake; rested to exhausted in about an hour.
const HUNGER_PER_TICK = 100 / (120 * PER_MINUTE)
const ENERGY_PER_TICK = 100 / (60 * PER_MINUTE)
const REST_PER_TICK = 100 / (8 * PER_MINUTE)
export const HUNGRY = 25

export const SPECIES: Species[] = ['dog', 'cat', 'fox']
export const NAMES: Record<Species, string[]> = {
  dog: ['Biscuit', 'Pickles', 'Waffles', 'Mochi', 'Pretzel', 'Nugget'],
  cat: ['Miso', 'Pixel', 'Noodle', 'Tofu', 'Saffron', 'Ziggy'],
  fox: ['Ember', 'Rusty', 'Juniper', 'Maple', 'Sly'],
}
export const CHEERS: Record<Species, string[]> = {
  dog: ['woof!', 'arf!', 'wuf wuf!', '♥'],
  cat: ['mrrp!', 'meow!', 'purr…', '♥'],
  fox: ['yip!', 'ring-ding!', 'hehe', '♥'],
}
const ALIASES: Record<string, string> = { maine: 'mainecoon', coon: 'mainecoon', 'maine-coon': 'mainecoon', doxie: 'dachshund', wiener: 'dachshund', golden: 'retriever' }
export const breedAlias = (raw: string) => ALIASES[raw] ?? raw

export const FIRST: Pet = {
  id: 'p0',
  species: 'dog',
  breed: 'retriever',
  skin: 'golden',
  name: 'Biscuit',
  x: 2,
  dir: 1,
  frame: 0,
  mood: 'walk',
  moodTicks: 0,
  bubble: '',
  bubbleTicks: 0,
  hunger: 80,
  energy: 90,
  bowl: null,
  hat: null,
  chasing: null,
  xp: 0,
  trait: 'chill',
  nameColor: null,
}

// What the rest of the band looks like to one pet this tick.
export type World = {
  width: number
  working: boolean
  idle: number
  boss: boolean
  ball: Ball | null
  positions: Readonly<Record<string, number>>
  /** A focus session is running: everyone naps quietly. */
  focus?: boolean
  /** Where the bed and the scratching post stand, when the toys are out. */
  bed?: number | null
  post?: number | null
}

// How each personality changes the day: tiredness, zoomies, sitting, pace.
const TRAIT_FX: Record<Trait, { tired: number; drain: number; zoom: number; sit: number; pace: number }> = {
  chill: { tired: 10, drain: 1, zoom: 0.0015, sit: 0.012, pace: 3 },
  lazy: { tired: 25, drain: 1.3, zoom: 0, sit: 0.03, pace: 4 },
  hyper: { tired: 8, drain: 1.5, zoom: 0.006, sit: 0.005, pace: 2 },
  grumpy: { tired: 12, drain: 1, zoom: 0.0008, sit: 0.02, pace: 3 },
  clingy: { tired: 10, drain: 1, zoom: 0.0015, sit: 0.012, pace: 3 },
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const pickWith = <T,>(list: readonly T[], roll: number) => list[Math.floor(roll * 997) % list.length] as T

// The column a pet's nose is at, for reaching a ball.
export const noseOf = (p: Pick<Pet, 'x' | 'dir'>) => (p.dir === 1 ? p.x + W - 2 : p.x + 1)

// Where a pet stands to eat: right beside its bowl, facing it.
export function eatingSpot(x: number, bowl: number, width: number): { x: number; dir: 1 | -1 } {
  const fromLeft = bowl - W
  const fromRight = bowl + BOWL_W
  const canLeft = fromLeft >= 0
  const canRight = fromRight + W <= width
  if (canLeft && (x <= bowl || !canRight)) return { x: fromLeft, dir: 1 }
  return { x: Math.min(fromRight, Math.max(0, width - W)), dir: -1 }
}

// Where boss mode puts the laptop: just in front of the pet.
export function laptopSpot(p: Pick<Pet, 'x' | 'dir'>, width: number): { x: number; dir: 1 | -1 } {
  if (p.dir === 1 && p.x + W + LAPTOP_W <= width) return { x: p.x + W, dir: 1 }
  if (p.x - LAPTOP_W >= 0) return { x: p.x - LAPTOP_W, dir: -1 }
  return { x: p.x + W, dir: 1 }
}

// Each pet has its own place by the bed, so a sleepy crowd doesn't end up in one heap.
export function bedSpot(bed: number, id: string, maxX: number): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return clamp(bed + BED_W + 1 + (h % 4) * (W + 2), 0, maxX)
}

// One step of one pet: needs, where it is, which way it faces, what it is doing.
export function step(p: Pet, world: World, roll: number): Pet {
  const { width, working, idle, boss, ball, positions } = world
  const fx = TRAIT_FX[p.trait] ?? TRAIT_FX.chill
  const maxX = Math.max(0, width - W)
  let { x, dir, mood, moodTicks, bubble, bubbleTicks, hunger, energy, bowl, chasing } = p
  const frame = p.frame + 1
  bubbleTicks = Math.max(0, bubbleTicks - 1)
  if (bubbleTicks === 0) bubble = ''
  moodTicks = Math.max(0, moodTicks - 1)

  const isResting = mood === 'nap' || mood === 'sleep'
  const isRushing = mood === 'run' || mood === 'zoom' || mood === 'chase' || mood === 'hide'
  hunger = Math.max(0, hunger - HUNGER_PER_TICK)
  energy = clamp(energy + (isResting ? REST_PER_TICK : (isRushing ? -2 : -1) * ENERGY_PER_TICK * fx.drain), 0, 100)
  const say = (text: string, forTicks = 14) => {
    bubble = text
    bubbleTicks = forTicks
  }
  const become = (m: PetMood, ticks = 0) => {
    mood = m
    moodTicks = ticks
  }

  let speed = 0
  let isBounded = true
  if (boss) {
    // Very serious. Very busy.
    become('work')
    chasing = null
    bowl = null
    if (!bubble && roll < (working ? 0.03 : 0.006)) say(working ? pickWith(['⌨️⌨️⌨️', 'typing furiously', 'in the zone', 'deploying synergy'], roll) : pickWith(CORPORATE, roll), 18)
  } else if (world.focus) {
    // Focus time: everyone naps quietly where they are, no bubbles.
    if (mood !== 'nap') become('nap')
    chasing = null
    bowl = null
    bubble = ''
    bubbleTicks = 0
  } else if (mood === 'eat') {
    if (moodTicks === 0) {
      hunger = 100
      bowl = null
      become('happy', 10)
      say('yum! ♥')
    }
  } else if (bowl !== null) {
    const spot = eatingSpot(x, bowl, width)
    if (x === spot.x) {
      dir = spot.dir
      become('eat', 25)
      say('nom nom', 25)
    } else {
      mood = 'toBowl'
      dir = spot.x > x ? 1 : -1
      speed = 1
      isBounded = false
    }
  } else if (mood === 'faint') {
    if (moodTicks === 0) {
      become('happy', 6)
      say("I'm okay!", 12)
    }
  } else if (mood === 'hide') {
    const edge = x + W / 2 < width / 2 ? 0 : maxX
    if (x !== edge) {
      dir = edge > x ? 1 : -1
      speed = 2
    } else if (moodTicks === 0) {
      become('walk')
      say('is it safe?', 12)
    }
  } else if (mood === 'party') {
    if (moodTicks === 0) become('walk')
  } else if (mood === 'nap') {
    if (moodTicks === 0 && energy >= 95) {
      become('happy', 6)
      say('*stretch*', 10)
    }
  } else if (mood === 'gather' && chasing?.startsWith('spot:')) {
    // Going somewhere on purpose (to comfort you, to cuddle up), then sitting there.
    const spot = clamp(Number(chasing.slice(5)), 0, maxX)
    if (x !== spot) {
      dir = spot > x ? 1 : -1
      speed = 1
    } else if (moodTicks === 0) {
      chasing = null
      become('walk')
    }
  } else if (mood === 'gather' && (chasing === 'bed' || chasing === 'post' || chasing?.startsWith('napnear:'))) {
    // Off to a toy, or to nap beside a friend.
    const spot =
      chasing === 'bed'
        ? bedSpot(world.bed ?? 0, p.id, maxX)
        : chasing === 'post'
          ? clamp((world.post ?? maxX) - W, 0, maxX)
          : clamp(Number(chasing.slice(8)), 0, maxX)
    if ((chasing === 'bed' && world.bed == null) || (chasing === 'post' && world.post == null)) {
      chasing = null
      become('walk')
    } else if (x !== spot) {
      dir = spot > x ? 1 : -1
      speed = 1
    } else if (chasing === 'post') {
      chasing = null
      dir = 1
      become('sit', 18)
      say('*scratch scratch*', 16)
    } else {
      const wasBed = chasing === 'bed'
      chasing = null
      dir = -1
      become('nap')
      say(wasBed ? 'my bed ♥' : '*snuggles up*', 12)
    }
  } else if (mood === 'chase' && chasing !== null) {
    const target = chasing === 'ball' ? (ball ? ball.x + 1 : undefined) : positions[chasing]
    if (target === undefined || (chasing !== 'ball' && moodTicks === 0)) {
      chasing = null
      become('walk')
    } else {
      const from = chasing === 'ball' ? noseOf({ x, dir }) : x
      if (Math.abs(target - from) > 1) {
        dir = target > from ? 1 : -1
        speed = 1
      }
    }
  } else if (mood === 'zoom') {
    speed = 2
    if (moodTicks === 0) {
      become('walk')
      say('*pant pant*', 10)
    }
  } else if (mood === 'happy' && moodTicks > 0) {
    // stays happy, hopping in place
  } else if (energy < fx.tired) {
    // Tired: to the bed if there is one, else a nap right here.
    if (world.bed != null && x !== bedSpot(world.bed, p.id, maxX)) {
      become('gather')
      chasing = 'bed'
    } else become('nap')
    say('yawn…', 12)
  } else if (working) {
    mood = 'run'
    speed = 1
  } else if (idle >= SLEEP_AFTER) {
    mood = 'sleep'
  } else if (mood === 'sit' && moodTicks > 0) {
    mood = 'sit'
  } else if (roll < fx.zoom && energy > 50) {
    become('zoom', 30)
    say('ZOOMIES!', 12)
    speed = 2
  } else if (p.species === 'cat' && world.post != null && roll > 0.4 && roll < 0.4015) {
    // Cats visit the scratching post now and then.
    become('gather')
    chasing = 'post'
  } else if (p.trait === 'clingy' && roll > 0.6 && roll < 0.6025) {
    // Clingy pets drift back to the middle, near you.
    become('gather', 30)
    chasing = `spot:${Math.floor(maxX / 2)}`
    say('*leans on you*', 12)
  } else if (roll < fx.sit) {
    become('sit', 15 + Math.round(roll * 2000))
  } else {
    if (roll > 0.995) dir = dir === 1 ? -1 : 1
    mood = 'walk'
    // A hungry pet drags its paws.
    speed = frame % (hunger < HUNGRY ? fx.pace + 2 : fx.pace) === 0 ? 1 : 0
    if (hunger < HUNGRY && !bubble && roll > 0.5 && roll < 0.503) say('hungry… 🍖', 15)
  }

  x += speed * dir
  if (isBounded) {
    if (x >= maxX) {
      x = maxX
      dir = mood === 'hide' ? dir : -1
    } else if (x <= 0) {
      x = 0
      dir = mood === 'hide' ? dir : 1
    }
  }
  x = clamp(x, 0, maxX)
  return { ...p, x, dir, frame, mood, moodTicks, bubble, bubbleTicks, hunger, energy, bowl, chasing }
}

export function poseOf(p: Pick<Pet, 'mood' | 'x'>, moving = false): Pose {
  switch (p.mood) {
    case 'run':
    case 'toBowl':
    case 'zoom':
    case 'chase':
      return 'walk'
    case 'hide':
    case 'gather':
      return moving ? 'walk' : 'sit'
    case 'nap':
      return 'sleep'
    case 'work':
      return 'sit'
    case 'party':
      return 'happy'
    default:
      return p.mood
  }
}

// Spreads pets out evenly across the band, each facing a random way, so nobody starts in a heap.
export function spread(pets: readonly Pet[], width: number, roll = Math.random): Pet[] {
  const room = Math.max(0, width - W)
  const slot = room / Math.max(1, pets.length)
  return pets.map((p, i) => ({
    ...p,
    x: clamp(Math.round(slot * i + slot / 2 - W / 2 + (roll() - 0.5) * Math.min(6, slot / 3)), 0, room),
    dir: roll() < 0.5 ? 1 : -1,
  }))
}

// Puts a bowl down a little ahead of the pet.
export function feed(p: Pet, width: number): Pet {
  if (p.bowl !== null || p.mood === 'eat') return p
  const ahead = p.dir === 1 ? p.x + W + 3 : p.x - BOWL_W - 3
  const bowl = clamp(ahead, 0, Math.max(0, width - BOWL_W))
  return { ...p, bowl, chasing: null, mood: 'toBowl', moodTicks: 0, bubble: p.hunger < HUNGRY ? 'FOOD!!' : 'ooh, food!', bubbleTicks: 10 }
}

export function nap(p: Pet): Pet {
  return { ...p, bowl: null, chasing: null, mood: 'nap', moodTicks: 3 * PER_MINUTE, bubble: 'goodnight… 💤', bubbleTicks: 12 }
}

export function wake(p: Pet): Pet {
  if (p.mood !== 'nap' && p.mood !== 'sleep' && p.mood !== 'faint') return p
  return { ...p, mood: 'happy', moodTicks: 6, bubble: p.energy < 40 ? 'five more minutes…' : 'good morning!', bubbleTicks: 12 }
}

// Busy pets (eating, napping, fainted) sit out the fun.
export const isFree = (p: Pet) => ['walk', 'sit', 'happy', 'run', 'sleep'].includes(p.mood) && p.bowl === null

export function adopt(
  species: Species,
  opts: { breed?: string; skin?: string; name?: string; hat?: string | null; xp?: number; trait?: Trait; nameColor?: string | null },
  taken: readonly Pet[],
  width: number,
  roll = Math.random,
): Pet {
  const breedId = opts.breed && BREEDS[species][opts.breed] ? opts.breed : Object.keys(BREEDS[species])[0]!
  const skins = Object.keys(SKINS[species])
  const skin = opts.skin && skins.includes(opts.skin) ? opts.skin : opts.breed ? breedOf(species, breedId).skin : pickWith(skins, roll())
  const free = NAMES[species].filter(n => !taken.some(p => p.name === n))
  return {
    ...FIRST,
    id: `p${taken.length}-${Math.floor(roll() * 1e6)}`,
    species,
    breed: breedId,
    skin,
    name: opts.name || pickWith(free.length ? free : NAMES[species], roll()),
    x: Math.floor(roll() * Math.max(1, width - W)),
    dir: roll() < 0.5 ? 1 : -1,
    hunger: 70 + Math.round(roll() * 30),
    energy: 80 + Math.round(roll() * 20),
    hat: opts.hat ?? null,
    xp: opts.xp ?? 0,
    trait: opts.trait && TRAITS.includes(opts.trait) ? opts.trait : pickWith(TRAITS, roll()),
    nameColor: opts.nameColor ?? null,
  }
}

// Reads "dachshund choco Peanut" in any order: known breeds and skins, the rest is the name.
export function parseAdopt(species: Species, words: readonly string[]): { breed?: string; skin?: string; name?: string } {
  let breed: string | undefined
  let skin: string | undefined
  const name: string[] = []
  for (const raw of words) {
    const w = raw.toLowerCase()
    const asBreed = breedAlias(w)
    const isBreed = !breed && asBreed in BREEDS[species]
    const isSkin = !skin && w in SKINS[species]
    if (isBreed) breed = asBreed
    if (isSkin) skin = w
    if (!isBreed && !isSkin) name.push(raw)
  }
  return { breed, skin, name: name.join(' ').slice(0, 20) || undefined }
}

// The ball rolls, slows and bounces off the edges.
export function roll(ball: Ball, width: number): Ball {
  let x = ball.x + ball.vx
  let vx = ball.vx * 0.92
  const max = Math.max(0, width - BALL_W)
  if (x <= 0 || x >= max) {
    x = clamp(x, 0, max)
    vx = -vx * 0.7
  }
  if (Math.abs(vx) < 0.15) vx = 0
  return { x: Math.round(x * 10) / 10, vx }
}
