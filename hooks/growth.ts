// Pets that grow: XP and levels, the badges you earn together, personalities, friendships.
import type { Pet } from '../types'

export type Trait = 'chill' | 'lazy' | 'hyper' | 'grumpy' | 'clingy'
export const TRAITS: Trait[] = ['chill', 'lazy', 'hyper', 'grumpy', 'clingy']
export const TRAIT_LABEL: Record<Trait, string> = {
  chill: 'chill',
  lazy: 'lazy (naps a lot)',
  hyper: 'hyper (zoomies!)',
  grumpy: 'grumpy (very sassy)',
  clingy: 'clingy (sticks close to you)',
}

// Level 1 at 0 XP, 2 at 30, 3 at 120, 4 at 270 … 10 at 2430.
export const MAX_LEVEL = 10
export const levelOf = (xp: number) => Math.min(MAX_LEVEL, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 30)))
export const xpFor = (level: number) => 30 * (level - 1) ** 2

// What a pet wears for its level: a collar from 3, a scarf from 6, a crown at 10.
export function levelLook(level: number): 'collar' | 'scarf' | 'crown' | undefined {
  if (level >= MAX_LEVEL) return 'crown'
  if (level >= 6) return 'scarf'
  if (level >= 3) return 'collar'
  return undefined
}

export function xpBar(xp: number, width = 10): string {
  const level = levelOf(xp)
  if (level >= MAX_LEVEL) return '★'.repeat(width)
  const from = xpFor(level)
  const to = xpFor(level + 1)
  const filled = Math.round(((xp - from) / (to - from)) * width)
  return '▰'.repeat(filled) + '▱'.repeat(width - filled)
}

// Gives XP to the pets `who` picks; says who levelled up.
export function gainXp(pets: readonly Pet[], amount: number, who: (p: Pet) => boolean = () => true): { pets: Pet[]; ups: Array<{ name: string; id: string; level: number }> } {
  const ups: Array<{ name: string; id: string; level: number }> = []
  const next = pets.map(p => {
    if (!who(p)) return p
    const before = levelOf(p.xp)
    const xp = p.xp + amount
    const after = levelOf(xp)
    if (after > before) ups.push({ name: p.name, id: p.id, level: after })
    return { ...p, xp }
  })
  return { pets: next, ups }
}

export type Stats = {
  firstMet: number
  sessions: number
  minutes: number
  commits: number
  testsPassed: number
  testsFailed: number
  meals: number
  pats: number
  focusDone: number
  nightCommits: number
  balls: number
}

export const emptyStats = (now: number): Stats => ({
  firstMet: now,
  sessions: 0,
  minutes: 0,
  commits: 0,
  testsPassed: 0,
  testsFailed: 0,
  meals: 0,
  pats: 0,
  focusDone: 0,
  nightCommits: 0,
  balls: 0,
})

export type Badge = { id: string; emoji: string; label: string; earned: (s: Stats, ctx: { maxLevel: number; friends: number }) => boolean }

export const BADGES: Badge[] = [
  { id: 'first-commit', emoji: '🌱', label: 'First commit together', earned: s => s.commits >= 1 },
  { id: 'centurion', emoji: '💯', label: '100 commits together', earned: s => s.commits >= 100 },
  { id: 'green', emoji: '✅', label: 'Tests whisperer: 10 green test runs', earned: s => s.testsPassed >= 10 },
  { id: 'survivor', emoji: '🩹', label: 'Survivor: 10 red test runs, still here', earned: s => s.testsFailed >= 10 },
  { id: 'night-owl', emoji: '🦉', label: 'Night owl: a commit after midnight', earned: s => s.nightCommits >= 1 },
  { id: 'good-owner', emoji: '🍖', label: 'Good owner: 20 meals served', earned: s => s.meals >= 20 },
  { id: 'deep-work', emoji: '🍅', label: 'Deep work: 5 focus sessions', earned: s => s.focusDone >= 5 },
  { id: 'fetch', emoji: '🎾', label: 'Fetch champion: 10 balls caught', earned: s => s.balls >= 10 },
  { id: 'cuddles', emoji: '🤗', label: 'Cuddle expert: 25 pats', earned: s => s.pats >= 25 },
  { id: 'week', emoji: '📅', label: 'A week of sessions together', earned: s => s.sessions >= 7 },
  { id: 'hours', emoji: '⏳', label: '10 hours coding together', earned: s => s.minutes >= 600 },
  { id: 'friends', emoji: '💞', label: 'Best friends: two pets bonded', earned: (_s, c) => c.friends >= 1 },
  { id: 'legend', emoji: '👑', label: 'Legend: a pet reached level 10', earned: (_s, c) => c.maxLevel >= MAX_LEVEL },
]

export function newBadges(stats: Stats, ctx: { maxLevel: number; friends: number }, have: readonly string[]): Badge[] {
  return BADGES.filter(b => !have.includes(b.id) && b.earned(stats, ctx))
}

// Friendships grow a point for every minute two pets spend near each other.
export type Bonds = Record<string, number>
export const FRIENDS_AT = 10
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
export const areRivals = (a: Trait, b: Trait) =>
  (a === 'grumpy' && (b === 'hyper' || b === 'clingy')) || (b === 'grumpy' && (a === 'hyper' || a === 'clingy'))

export function friendsOf(p: Pet, pets: readonly Pet[], bonds: Bonds): Pet[] {
  return pets.filter(q => q.id !== p.id && !areRivals(p.trait, q.trait) && (bonds[pairKey(p.id, q.id)] ?? 0) >= FRIENDS_AT)
}

export function rivalsOf(p: Pet, pets: readonly Pet[]): Pet[] {
  return pets.filter(q => q.id !== p.id && areRivals(p.trait, q.trait))
}

// One minute passes: pets near each other bond. Returns the new bonds and the pairs that just became friends.
export function bond(pets: readonly Pet[], bonds: Bonds, near = 24): { bonds: Bonds; newFriends: Array<[Pet, Pet]> } {
  const next: Bonds = { ...bonds }
  const newFriends: Array<[Pet, Pet]> = []
  for (let i = 0; i < pets.length; i++) {
    for (let j = i + 1; j < pets.length; j++) {
      const a = pets[i]!
      const b = pets[j]!
      if (Math.abs(a.x - b.x) > near || areRivals(a.trait, b.trait)) continue
      const k = pairKey(a.id, b.id)
      const before = next[k] ?? 0
      next[k] = before + 1
      if (before < FRIENDS_AT && before + 1 >= FRIENDS_AT) newFriends.push([a, b])
    }
  }
  return { bonds: next, newFriends }
}

export const friendCount = (pets: readonly Pet[], bonds: Bonds) =>
  pets.reduce((n, p, i) => n + pets.slice(i + 1).filter(q => !areRivals(p.trait, q.trait) && (bonds[pairKey(p.id, q.id)] ?? 0) >= FRIENDS_AT).length, 0)
