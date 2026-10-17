export type PetMood =
  | 'walk'
  | 'run'
  | 'sit'
  | 'sleep'
  | 'nap'
  | 'happy'
  | 'toBowl'
  | 'eat'
  | 'work'
  | 'party'
  | 'faint'
  | 'hide'
  | 'zoom'
  | 'chase'
  | 'gather'
export type Pet = {
  id: string
  species: 'dog' | 'cat' | 'fox'
  breed: string
  skin: string
  name: string
  x: number
  dir: 1 | -1
  frame: number
  mood: PetMood
  moodTicks: number
  bubble: string
  bubbleTicks: number
  /** 100 is full, 0 is starving. */
  hunger: number
  /** 100 is rested, 0 is exhausted. */
  energy: number
  /** Where this pet's food bowl stands, in columns; null with no bowl down. */
  bowl: number | null
  /** What it wears: a hat, shades or a bow tie; null for nothing. */
  hat: string | null
  /** Who it chases: another pet's id, 'ball', 'spot:<column>' to go somewhere, or null. */
  chasing: string | null
}
export type Ball = { x: number; vx: number }

declare module 'claude-code' {
  interface PluginState {
    pets: { pets: Pet[]; isShown: boolean; idleTicks: number; boss: boolean; sass: boolean; moods: boolean; ball: Ball | null }
  }
}
