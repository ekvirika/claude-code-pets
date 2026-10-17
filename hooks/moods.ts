// How the pets read the room: your messages, Claude's replies, and things said to them.
import type { Pet } from '../types'

export const USER_MOODS = ['frustrated', 'angry', 'sad', 'happy', 'grateful', 'excited', 'confused', 'neutral'] as const
export type UserMood = (typeof USER_MOODS)[number]

export const CLAUDE_MOODS = ['apologetic', 'error', 'success', 'question', 'neutral'] as const
export type ClaudeMood = (typeof CLAUDE_MOODS)[number]

// What each mood makes the pets do, and what they say.
export type Reaction = { kind: 'comfort' | 'hide' | 'cuddle' | 'party' | 'love' | 'zoom' | 'tilt' | 'worried' | 'cheer' | 'look'; lines: string[] }

export const USER_REACTIONS: Record<UserMood, Reaction | undefined> = {
  frustrated: { kind: 'comfort', lines: ["it's okay 🫂", 'deep breaths', 'you got this', 'want a treat?', 'bugs fear you', 'we believe in you'] },
  angry: { kind: 'hide', lines: ['😬', 'eep', "*hides*", 'not it'] },
  sad: { kind: 'cuddle', lines: ['here for you 🥺', '*snuggles*', '*leans on you*', 'hug?'] },
  happy: { kind: 'party', lines: ['yay!', '🎉', 'woo!', 'good vibes'] },
  grateful: { kind: 'love', lines: ['aww ♥', 'anytime!', 'teamwork ♥', '*happy wiggle*'] },
  excited: { kind: 'zoom', lines: ['LETS GOOO', 'ZOOMIES!', 'hype!!'] },
  confused: { kind: 'tilt', lines: ['?', '🤔 huh?', '*head tilt*'] },
  neutral: undefined,
}

export const CLAUDE_REACTIONS: Record<ClaudeMood, Reaction | undefined> = {
  apologetic: { kind: 'worried', lines: ['uh oh…', "it's fine, it's fine", 'oops'] },
  error: { kind: 'worried', lines: ['oof', 'that looked painful', 'yikes'] },
  success: { kind: 'cheer', lines: ['nailed it!', 'done ✨', 'ship it!'] },
  question: { kind: 'look', lines: ['👀 your turn', 'well?', '*waits patiently*'] },
  neutral: undefined,
}

// Things you can say to the pets in chat.
export type PetCommand = 'praise' | 'sit' | 'come' | 'roll' | 'speak' | 'jump' | 'fetch' | 'nap' | 'feed'

const COMMANDS: Array<[RegExp, PetCommand]> = [
  [/\b(good|best|cute|sweet)\s+(boy|girl|doggo|dog|pup|puppy|kitty|kitten|fox)\b|\bwho'?s\s+a\s+good\b|\bi\s+love\s+my\s+pets?\b|\b(pats?|scritches|belly rubs?)\b/i, 'praise'],
  [/\b(sit|stay)\b/i, 'sit'],
  [/\b(come|here|heel)\b/i, 'come'],
  [/\broll(\s+over)?\b/i, 'roll'],
  [/\b(speak|bark|meow|talk)\b/i, 'speak'],
  [/\b(jump|dance|spin|party)\b/i, 'jump'],
  [/\b(fetch|play|ball)\b/i, 'fetch'],
  [/\b(nap|sleep|bed(time)?)\b/i, 'nap'],
  [/\b(treat|snack|food|dinner|eat)\b/i, 'feed'],
]

export type PetTalk = { ids: string[]; command: PetCommand; isOnlyPetTalk: boolean }

// "Biscuit sit", "good boy", "Pixel come here": who is addressed and what they are told.
// Only short messages count as being only for the pets, so real prompts still reach Claude.
export function parsePetTalk(text: string, pets: readonly Pick<Pet, 'id' | 'name' | 'species'>[]): PetTalk | undefined {
  const t = text.trim()
  if (!t || t.startsWith('/')) return undefined
  const words = t.split(/\s+/)
  const named = pets.filter(p => new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t))
  const toAll = /\b(everyone|all of you|pets|guys|y'?all|team)\b/i.test(t)
  const hit = COMMANDS.find(([re]) => re.test(t))
  if (!hit) return undefined
  const command = hit[1]
  // Without a name, only praise and clearly pet-directed lines count.
  if (named.length === 0 && !toAll && command !== 'praise') return undefined
  const ids = (named.length ? named : pets).map(p => p.id)
  const isOnlyPetTalk = words.length <= 7 && !/\b(code|file|function|bug|test|error|build|deploy|fix|why|how|what)\b/i.test(t)
  return { ids, command, isOnlyPetTalk }
}

const pick = (lines: readonly string[], roll: number) => lines[Math.floor(roll * 997) % lines.length]!

export function lineFor(r: Reaction, roll: number): string {
  return pick(r.lines, roll)
}

export const SPEAK: Record<string, string[]> = {
  dog: ['woof!', 'arf arf!', 'BORK'],
  cat: ['meow.', 'mrrrp?', '…mew'],
  fox: ['yip yip!', 'ring-ding-ding!', 'ahee!'],
}

export const PRAISE: Record<string, string[]> = {
  dog: ['♥ wag wag ♥', '*tail goes brrr*', 'ME?? ♥'],
  cat: ['purr ♥', '*slow blink*', 'acceptable. ♥'],
  fox: ['hehe ♥', '*happy yip*', '♥♥♥'],
}

// Turns a model's one-word answer into a known mood, or neutral.
export function asMood<T extends string>(label: string | undefined, known: readonly T[]): T {
  const l = (label ?? '').trim().toLowerCase()
  return (known.find(k => l === k || l.startsWith(k)) ?? known[known.length - 1]!) as T
}
