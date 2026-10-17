import type { Ball, Pet, PetMood } from '../types'
import { CORPORATE } from './sass'
import { BREEDS, SKINS, W, breedOf } from './sprites'
import type { Pose, Species } from './sprites'

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
const TIRED = 10

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
}

// What the rest of the band looks like to one pet this tick.
export type World = { width: number; working: boolean; idle: number; boss: boolean; ball: Ball | null; positions: Readonly<Record<string, number>> }

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

// One step of one pet: needs, where it is, which way it faces, what it is doing.
export function step(p: Pet, world: World, roll: number): Pet {
  const { width, working, idle, boss, ball, positions } = world
  const maxX = Math.max(0, width - W)
  let { x, dir, mood, moodTicks, bubble, bubbleTicks, hunger, energy, bowl, chasing } = p
  const frame = p.frame + 1
  bubbleTicks = Math.max(0, bubbleTicks - 1)
  if (bubbleTicks === 0) bubble = ''
  moodTicks = Math.max(0, moodTicks - 1)

  const isResting = mood === 'nap' || mood === 'sleep'
  const isRushing = mood === 'run' || mood === 'zoom' || mood === 'chase' || mood === 'hide'
  hunger = Math.max(0, hunger - HUNGER_PER_TICK)
  energy = clamp(energy + (isResting ? REST_PER_TICK : isRushing ? -2 * ENERGY_PER_TICK : -ENERGY_PER_TICK), 0, 100)
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
  } else if (energy < TIRED) {
    become('nap')
    say('yawn…', 12)
  } else if (working) {
    mood = 'run'
    speed = 1
  } else if (idle >= SLEEP_AFTER) {
    mood = 'sleep'
  } else if (mood === 'sit' && moodTicks > 0) {
    mood = 'sit'
  } else if (roll < 0.0015 && energy > 50) {
    become('zoom', 30)
    say('ZOOMIES!', 12)
    speed = 2
  } else if (roll < 0.012) {
    become('sit', 15 + Math.round(roll * 2000))
  } else {
    if (roll > 0.995) dir = dir === 1 ? -1 : 1
    mood = 'walk'
    // A hungry pet drags its paws.
    speed = frame % (hunger < HUNGRY ? 5 : 3) === 0 ? 1 : 0
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

export function adopt(species: Species, opts: { breed?: string; skin?: string; name?: string; hat?: string | null }, taken: readonly Pet[], width: number, roll = Math.random): Pet {
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
