import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Ball, Pet } from '../types'
import { ACCESSORIES, LAPTOP, LAPTOP_MONO, dress } from './accessories'
import type { Accessory, Wearable } from './accessories'
import {
  BALL_W,
  BOWL_W,
  CHEERS,
  FIRST,
  HUNGRY,
  LAPTOP_W,
  PER_MINUTE,
  SPECIES,
  TICK_MS,
  adopt,
  breedAlias,
  clamp,
  feed,
  isFree,
  laptopSpot,
  nap,
  noseOf,
  parseAdopt,
  poseOf,
  roll,
  step,
  wake,
} from './life'
import { rasterCells, svgSource } from './paint'
import { react } from './sass'
import { CLAUDE_MOODS, CLAUDE_REACTIONS, PRAISE, SPEAK, USER_MOODS, USER_REACTIONS, asMood, lineFor, parsePetTalk } from './moods'
import type { PetTalk, Reaction } from './moods'
import { BOWL_FULL, BOWL_HALF, BOWL_SKIN, BREEDS, SKINS, W, breedOf, frameFor, monoProps, pixels } from './sprites'
import type { Frame, Species } from './sprites'

export { FIRST, eatingSpot, feed, nap, parseAdopt, step, wake } from './life'

const MAX_PETS = 5
const BALL: Frame = ['.RR.', 'RWRR', 'RRRR', '.RR.']

const pets = atom({ plugin: 'pets', key: 'pets' } as const, [FIRST])
const isShown = atom({ plugin: 'pets', key: 'isShown' } as const, true)
const idleTicks = atom({ plugin: 'pets', key: 'idleTicks' } as const, 0)
const boss = atom({ plugin: 'pets', key: 'boss' } as const, false)
const sass = atom({ plugin: 'pets', key: 'sass' } as const, true)
const ball = atom({ plugin: 'pets', key: 'ball' } as const, null)
const moods = atom({ plugin: 'pets', key: 'moods' } as const, true)

// The band's width as last drawn; pets turn around at its edges.
let room = 60
let isWorking = false
let walker: Timer | undefined
let ticks = 0
let lastQuipAt = 0

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)] as T

async function tick($: EngineInterface) {
  const idle = isWorking ? 0 : (await read($, idleTicks)) + 1
  await update($, idleTicks, () => idle)
  const isBoss = await read($, boss)
  let b = await read($, ball)
  if (b) {
    b = roll(b, room)
    const rolled = b
    await update($, ball, () => rolled)
  }
  const list = await read($, pets)
  const positions = Object.fromEntries(list.map(p => [p.id, p.x]))
  const world = { width: room, working: isWorking, idle, boss: isBoss, ball: b, positions }
  let next = list.map(p => step(p, world, Math.random()))

  if (!isBoss) {
    // A ball on the floor: the nearest free pet goes for it, and the first nose there wins.
    if (b) {
      const at = b.x + 1
      const catcher = next.find(p => p.chasing === 'ball' && Math.abs(noseOf(p) - at) <= 1.5)
      if (catcher) {
        await update($, ball, () => null)
        next = next.map(p =>
          p.id === catcher.id
            ? { ...p, chasing: null, mood: 'happy', moodTicks: 10, bubble: 'got it! 🎾', bubbleTicks: 15 }
            : p.chasing === 'ball'
              ? { ...p, chasing: null, mood: 'walk', bubble: 'aww', bubbleTicks: 8 }
              : p,
        )
      } else if (!next.some(p => p.chasing === 'ball')) {
        const free = next.filter(isFree)
        const nearest = free.sort((p, q) => Math.abs(noseOf(p) - at) - Math.abs(noseOf(q) - at))[0]
        if (nearest) next = next.map(p => (p.id === nearest.id ? { ...p, chasing: 'ball', mood: 'chase', moodTicks: 0, bubble: 'BALL!', bubbleTicks: 10 } : p))
      }
    }
    // Now and then one pet chases another round the band.
    const free = next.filter(p => isFree(p) && p.mood !== 'sleep')
    if (free.length >= 2 && Math.random() < 0.0008) {
      const [chaser, runner] = [...free].sort(() => Math.random() - 0.5) as [Pet, Pet]
      next = next.map(p => {
        if (p.id === chaser.id) return { ...p, chasing: runner.id, mood: 'chase', moodTicks: 35, bubble: 'come here!', bubbleTicks: 12 }
        if (p.id === runner.id) return { ...p, mood: 'zoom', moodTicks: 35, dir: runner.x < chaser.x ? -1 : 1, bubble: 'nope!', bubbleTicks: 12 }
        return p
      })
    }
    // Tag!
    for (const c of next.filter(p => p.mood === 'chase' && p.chasing && p.chasing !== 'ball')) {
      const r = next.find(p => p.id === c.chasing)
      if (r && Math.abs(r.x - c.x) <= 3) {
        next = next.map(p =>
          p.id === c.id
            ? { ...p, chasing: null, mood: 'happy', moodTicks: 8, bubble: "tag! you're it", bubbleTicks: 14 }
            : p.id === r.id
              ? { ...p, mood: 'happy', moodTicks: 8, bubble: 'hey!', bubbleTicks: 14 }
              : p,
        )
      }
    }
  }
  const settled = next
  await update($, pets, () => settled)
  ticks += 1
  if (ticks % PER_MINUTE === 0) await save($)
}

function startWalking($: EngineInterface) {
  walker?.cancel()
  walker = $.clock.every(TICK_MS, () => void tick($))
}

function stopWalking() {
  walker?.cancel()
  walker = undefined
}

async function cheer($: EngineInterface, text?: (p: Pet) => string) {
  await update($, idleTicks, () => 0)
  await update($, pets, list =>
    list.map(p =>
      p.mood === 'nap' || p.mood === 'eat' || p.mood === 'toBowl' || p.mood === 'work' || p.mood === 'faint' || p.mood === 'gather'
        ? p
        : { ...p, mood: 'happy' as const, moodTicks: 10, bubble: text ? text(p) : pick(CHEERS[p.species]), bubbleTicks: 14 },
    ),
  )
}

// A big moment for the whole crew (or, for a faint, one unlucky pet).
async function moment($: EngineInterface, kind: 'party' | 'faint' | 'hide', text: string) {
  if (await read($, boss)) return
  await update($, idleTicks, () => 0)
  const list = await read($, pets)
  const awake = list.filter(p => p.mood !== 'nap' && p.mood !== 'eat')
  if (awake.length === 0) return
  if (kind === 'faint') {
    const victim = pick(awake)
    await update($, pets, l =>
      l.map(p =>
        p.id === victim.id
          ? { ...p, mood: 'faint' as const, moodTicks: 30, chasing: null, bubble: text, bubbleTicks: 20 }
          : awake.some(a => a.id === p.id)
            ? { ...p, bubble: pick(['oh no', `${victim.name}!!`, 'call the vet']), bubbleTicks: 12 }
            : p,
      ),
    )
    return
  }
  const ids = new Set(awake.map(p => p.id))
  await update($, pets, l =>
    l.map((p, i) =>
      ids.has(p.id)
        ? { ...p, mood: kind, moodTicks: kind === 'party' ? 25 : 45, chasing: null, bubble: i === 0 ? text : kind === 'party' ? pick(['🎉', 'woo!', 'yay!', '🥳']) : pick(['😱', 'eek!', 'run!']), bubbleTicks: 18 }
        : p,
    ),
  )
}

async function quip($: EngineInterface, text: string) {
  if (!(await read($, sass)) || (await read($, boss))) return
  const now = await $.clock.now()
  if (now - lastQuipAt < 40_000) return
  const awake = (await read($, pets)).filter(p => p.mood !== 'nap' && p.mood !== 'sleep' && !p.bubble)
  if (awake.length === 0) return
  lastQuipAt = now
  const who = pick(awake)
  await update($, pets, l => l.map(p => (p.id === who.id ? { ...p, bubble: text, bubbleTicks: 22 } : p)))
}

const awakeOf = (list: readonly Pet[]) => list.filter(p => p.mood !== 'nap' && p.mood !== 'eat' && p.mood !== 'faint' && p.mood !== 'work')
const middle = () => Math.max(0, Math.floor((room - W) / 2))

// What the pets do about a mood they picked up.
async function reactMood($: EngineInterface, r: Reaction) {
  if ((await read($, boss)) || !(await read($, isShown))) return
  const list = await read($, pets)
  const awake = awakeOf(list)
  if (awake.length === 0) return
  const line = lineFor(r, Math.random())
  const ids = new Set(awake.map(p => p.id))
  const lead = pick(awake).id
  const say = (p: Pet, text = line) => ({ bubble: p.id === lead ? text : p.bubble, bubbleTicks: p.id === lead ? 20 : p.bubbleTicks })
  if (r.kind === 'hide' || r.kind === 'party') return moment($, r.kind, line)
  await update($, idleTicks, () => 0)
  if (r.kind === 'comfort' || r.kind === 'cuddle') {
    // Comfort: the two nearest come over. Cuddle: everyone huddles together.
    const center = middle()
    const near = [...awake].sort((a, b) => Math.abs(a.x - center) - Math.abs(b.x - center)).slice(0, r.kind === 'comfort' ? 2 : awake.length)
    const spots = new Map(near.map((p, i) => [p.id, center + Math.round((i - (near.length - 1) / 2) * (r.kind === 'comfort' ? 18 : 10))]))
    const ticks = r.kind === 'comfort' ? 45 : 60
    await update($, pets, l =>
      l.map(p =>
        spots.has(p.id)
          ? { ...p, mood: 'gather' as const, chasing: `spot:${spots.get(p.id)}`, moodTicks: ticks, bowl: null, ...say(p, p.id === lead ? line : r.kind === 'cuddle' ? '*snuggles*' : '♥') }
          : p,
      ),
    )
    // The one who leads always speaks, even if it wasn't among the nearest.
    await update($, pets, l => l.map(p => (p.id === near[0]?.id ? { ...p, bubble: line, bubbleTicks: 20 } : p)))
    return
  }
  await update($, pets, l =>
    l.map(p => {
      if (!ids.has(p.id)) return p
      if (r.kind === 'love') return { ...p, mood: 'happy' as const, moodTicks: 12, bubble: p.id === lead ? line : '♥', bubbleTicks: 16 }
      if (r.kind === 'zoom') return isFree(p) ? { ...p, mood: 'zoom' as const, moodTicks: 35, ...say(p) } : p
      if (r.kind === 'tilt') return p.id === lead ? { ...p, mood: 'sit' as const, moodTicks: 14, ...say(p) } : p
      if (r.kind === 'worried') return { ...p, mood: 'sit' as const, moodTicks: 15, ...say(p) }
      if (r.kind === 'cheer') return { ...p, mood: 'happy' as const, moodTicks: 10, ...say(p) }
      return { ...p, mood: 'sit' as const, moodTicks: 30, ...say(p) } // look: everyone waits for your answer
    }),
  )
}

async function readUserMood($: EngineInterface, text: string) {
  let label: string | undefined
  try {
    label = await $.model.classify(
      `The mood of this message a developer typed to their AI coding assistant:\n${text}`,
      USER_MOODS,
      { model: 'haiku' },
    )
  } catch {
    return
  }
  const r = USER_REACTIONS[asMood(label, USER_MOODS)]
  if (r) await reactMood($, r)
}

async function readClaudeMood($: EngineInterface, answer: string) {
  let label: string | undefined
  try {
    label = await $.model.classify(
      `How this reply from an AI coding assistant ends (did it apologize, hit an error, succeed, or ask the user a question?):\n${answer}`,
      CLAUDE_MOODS,
      { model: 'haiku' },
    )
  } catch {
    return
  }
  const r = CLAUDE_REACTIONS[asMood(label, CLAUDE_MOODS)]
  if (r) await reactMood($, r)
}

// Someone talked to the pets: the ones addressed do as they're told (more or less).
async function obey($: EngineInterface, talk: PetTalk): Promise<string> {
  const list = await read($, pets)
  const chosen = list.filter(p => talk.ids.includes(p.id))
  const ids = new Set(chosen.map(p => p.id))
  const names = chosen.map(p => p.name).join(', ')
  await update($, idleTicks, () => 0)
  const all = (fn: (p: Pet) => Pet) => update($, pets, l => l.map(p => (ids.has(p.id) ? fn(p) : p)))
  switch (talk.command) {
    case 'praise':
      await all(p => ({ ...p, mood: 'happy', moodTicks: 14, bubble: pick(PRAISE[p.species] ?? ['♥']), bubbleTicks: 18 }))
      return `🐾 ${names} ${chosen.length === 1 ? 'is' : 'are'} very happy about that.`
    case 'sit':
      await all(p => ({ ...p, mood: 'sit', moodTicks: 50, chasing: null, bubble: p.species === 'cat' ? '*sits… eventually*' : '*sits*', bubbleTicks: 14 }))
      return `🐾 ${names} sat down. Good ${chosen.length === 1 ? 'pet' : 'pets'}.`
    case 'come': {
      const center = middle()
      await all(p => ({ ...p, mood: 'gather', chasing: `spot:${center + Math.round((chosen.indexOf(p) - (chosen.length - 1) / 2) * 18)}`, moodTicks: 25, bowl: null, bubble: 'coming!', bubbleTicks: 12 }))
      return `🐾 ${names} ${chosen.length === 1 ? 'comes' : 'come'} running.`
    }
    case 'roll':
      await all(p => ({ ...p, mood: 'faint', moodTicks: 12, chasing: null, bubble: '*rolls over*', bubbleTicks: 14 }))
      return `🐾 ${names} rolled over.`
    case 'speak':
      await all(p => ({ ...p, mood: 'happy', moodTicks: 8, bubble: pick(SPEAK[p.species] ?? ['!']), bubbleTicks: 14 }))
      return `🐾 ${names} said something.`
    case 'jump':
      await all(p => ({ ...p, mood: 'party', moodTicks: 20, chasing: null, bubble: '💃', bubbleTicks: 14 }))
      return `🐾 ${names} ${chosen.length === 1 ? 'is' : 'are'} dancing.`
    case 'fetch': {
      const thrown: Ball = { x: 2, vx: 3 + Math.random() }
      await update($, ball, () => thrown)
      return '🎾 Ball thrown!'
    }
    case 'nap':
      await all(nap)
      return `💤 ${names} ${chosen.length === 1 ? 'is' : 'are'} napping.`
    case 'feed':
      await all(p => feed(p, room))
      return `🍖 Food's down for ${names}.`
  }
}

type Saved = { species: Species; breed?: string; skin: string; name: string; hunger?: number; energy?: number; hat?: string | null }

async function save($: EngineInterface) {
  const list = await read($, pets)
  await $.store.set('pets', {
    isShown: await read($, isShown),
    boss: await read($, boss),
    sass: await read($, sass),
    moods: await read($, moods),
    savedAt: await $.clock.now(),
    pets: list.map(({ species, breed, skin, name, hunger, energy, hat }): Saved => ({ species, breed, skin, name, hunger, energy, hat })),
  })
}

const bar = (n: number) => '▰'.repeat(Math.round(n / 20)) + '▱'.repeat(5 - Math.round(n / 20))

function status(p: Pet): string {
  if (p.mood === 'work') return 'in a meeting'
  if (p.mood === 'eat') return 'eating'
  if (p.mood === 'toBowl') return 'heading to the bowl'
  if (p.mood === 'nap' || p.mood === 'sleep') return 'asleep'
  if (p.mood === 'faint') return 'fainted (dramatically)'
  if (p.mood === 'chase') return p.chasing === 'ball' ? 'chasing the ball' : 'chasing someone'
  if (p.hunger < HUNGRY) return 'hungry!'
  if (p.energy < 25) return 'sleepy'
  return 'happy'
}

const HELP = [
  'Pets:',
  '  /pet add <dog|cat|fox> [breed] [skin] [name]   adopt one (up to 5)',
  '  /pet feed [name|all]                           put food down',
  '  /pet sleep [name|all]  /pet wake [name|all]    bedtime and wake-up',
  '  /pet pat <name>                                a little love',
  '  /pet hat <name|all> <hat|none>                 party, crown, wizard, santa, tophat, shades, bowtie',
  '  /pet ball                                      throw a ball',
  '  /pet zoomies [name|all]                        go wild',
  '  /pet party                                     celebrate',
  '  /pet boss [on|off]                             look busy, the boss is coming',
  '  /pet sass on|off                               comments on your code',
  '  /pet moods on|off                              react to the mood of the chat (a tiny AI check per message)',
  '  …or just talk to them: "good boy", "Biscuit sit", "Pixel come here", "everyone dance"',
  '  /pet breed <name> <breed>  /pet skin <name> <skin>  /pet name <name> <new name>',
  '  /pet remove <name>   /pet breeds | skins   /pet off | on',
].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = (await $.store.get('pets')) as { isShown?: boolean; boss?: boolean; sass?: boolean; moods?: boolean; savedAt?: number; pets?: Saved[] } | undefined
    if (saved?.pets?.length) {
      // Time away: they got hungrier, and they slept.
      const awayMin = saved.savedAt ? Math.max(0, ((await $.clock.now()) - saved.savedAt) / 60_000) : 0
      const restored: Pet[] = []
      for (const s of saved.pets.slice(0, MAX_PETS)) {
        if (!SPECIES.includes(s.species)) continue
        const pet = adopt(s.species, { breed: s.breed, skin: s.skin, name: s.name, hat: s.hat }, restored, room)
        pet.hunger = clamp((s.hunger ?? 80) - awayMin * (100 / 120), 0, 100)
        pet.energy = awayMin > 10 ? 100 : clamp(s.energy ?? 90, 0, 100)
        restored.push(pet)
      }
      if (restored.length) await update($, pets, () => restored)
    }
    if (typeof saved?.isShown === 'boolean') await update($, isShown, () => saved.isShown as boolean)
    if (typeof saved?.boss === 'boolean') await update($, boss, () => saved.boss as boolean)
    if (typeof saved?.sass === 'boolean') await update($, sass, () => saved.sass as boolean)
    if (typeof saved?.moods === 'boolean') await update($, moods, () => saved.moods as boolean)
    await $.command.register({
      name: 'pet',
      description: 'Adopt, feed, dress up and play with your pixel pets (or make them look busy)',
      argumentHint: 'add | feed | sleep | wake | hat | ball | zoomies | party | boss | sass | pat | breed | skin | name | remove',
    })
    if (await read($, isShown)) startWalking($)
    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/).filter(Boolean)
    const list = await read($, pets)
    const find = (name: string | undefined) => list.find(p => p.name.toLowerCase() === (name ?? '').toLowerCase())
    // "", "all", a name, or a species: who a care command is for.
    const targets = (arg: string): Pet[] => {
      const a = arg.toLowerCase()
      if (a === '' || a === 'all' || a === 'everyone') return list
      const one = find(arg)
      if (one) return [one]
      return list.filter(p => p.species === a)
    }
    const names = (some: readonly Pet[]) => some.map(p => p.name).join(', ')
    const apply = (some: readonly Pet[], fn: (p: Pet) => Pet) => {
      const ids = new Set(some.map(p => p.id))
      return update($, pets, l => l.map(p => (ids.has(p.id) ? fn(p) : p)))
    }
    const noOne = () => ({ text: `No pet called ${rest.join(' ')}.` })
    let reply: string

    if (verb === '' || verb === 'help' || verb === 'list') {
      const roster = list
        .map(p => {
          const b = breedOf(p.species, p.breed).label
          const k = SKINS[p.species][p.skin]?.label ?? p.skin
          const worn = p.hat ? ` · wearing ${p.hat}` : ''
          return `  ${p.name}: ${b}, ${k}${worn} · food ${bar(p.hunger)} · energy ${bar(p.energy)} · ${status(p)}`
        })
        .join('\n')
      const modes = [(await read($, boss)) ? 'boss mode ON' : '', (await read($, sass)) ? 'sass on' : 'sass off', (await read($, moods)) ? 'moods on' : 'moods off'].filter(Boolean).join(' · ')
      return { text: `${roster || '  (no pets)'}\n  (${modes})\n\n${HELP}` }
    } else if (verb === 'skins') {
      return { text: SPECIES.map(s => `${s}: ${Object.entries(SKINS[s]).map(([id, k]) => `${id} (${k.label})`).join(', ')}`).join('\n') }
    } else if (verb === 'breeds') {
      return { text: SPECIES.map(s => `${s}: ${Object.entries(BREEDS[s]).map(([id, b]) => `${id} (${b.label})`).join(', ')}`).join('\n') }
    } else if (verb === 'hats') {
      return { text: `Accessories: ${ACCESSORIES.join(', ')}, none` }
    } else if (verb === 'add') {
      const species = rest[0]?.toLowerCase() as Species
      if (!SPECIES.includes(species)) return { text: 'Which pet? /pet add dog, /pet add cat or /pet add fox' }
      if (list.length >= MAX_PETS) return { text: `That's a full house (${MAX_PETS} pets). /pet remove one first.` }
      const pet = adopt(species, parseAdopt(species, rest.slice(1)), list, room)
      await update($, pets, l => [...l, { ...pet, mood: 'happy' as const, moodTicks: 10, bubble: 'hi!', bubbleTicks: 15 }])
      reply = `Welcome ${pet.name}, a ${SKINS[species][pet.skin]?.label ?? pet.skin} ${breedOf(species, pet.breed).label.toLowerCase()}!`
    } else if (verb === 'feed') {
      const some = targets(rest.join(' '))
      if (some.length === 0) return noOne()
      await apply(some, p => feed(p, room))
      reply = `🍖 Food's down for ${names(some)}.`
    } else if (verb === 'sleep' || verb === 'nap' || verb === 'bed') {
      const some = targets(rest.join(' '))
      if (some.length === 0) return noOne()
      await apply(some, nap)
      reply = `💤 ${names(some)} ${some.length === 1 ? 'is' : 'are'} off to bed. /pet wake to get them up.`
    } else if (verb === 'wake') {
      const some = targets(rest.join(' '))
      if (some.length === 0) return noOne()
      await update($, idleTicks, () => 0)
      await apply(some, wake)
      reply = `☀️ Rise and shine, ${names(some)}.`
    } else if (verb === 'pat' || verb === 'pet') {
      const some = targets(rest.join(' '))
      if (some.length === 0) return noOne()
      await apply(some, p => (p.mood === 'eat' ? p : { ...p, mood: 'happy' as const, moodTicks: 12, bubble: '♥ ♥ ♥', bubbleTicks: 15 }))
      reply = `${names(some)} loved that.`
    } else if (verb === 'hat' || verb === 'wear' || verb === 'dress') {
      const item = rest[rest.length - 1]?.toLowerCase() ?? ''
      const some = targets(rest.slice(0, -1).join(' '))
      if (!(ACCESSORIES as string[]).includes(item) && item !== 'none' && item !== 'off') {
        return { text: `Try: /pet hat <name|all> <${ACCESSORIES.join('|')}|none>` }
      }
      if (some.length === 0) return noOne()
      const hat = item === 'none' || item === 'off' ? null : item
      await apply(some, p => ({ ...p, hat, mood: p.mood === 'work' ? p.mood : ('happy' as const), moodTicks: 8, bubble: hat ? 'how do I look?' : 'ahh, freedom', bubbleTicks: 14 }))
      reply = hat ? `${names(some)} ${some.length === 1 ? 'is' : 'are'} now wearing ${hat === 'shades' ? 'shades 😎' : `a ${hat}`}.` : `${names(some)} took it off.`
    } else if (verb === 'ball' || verb === 'throw') {
      if (await read($, boss)) return { text: 'Not now, everyone is in a meeting. (/pet boss off)' }
      const fromLeft = Math.random() < 0.5
      const thrown: Ball = { x: fromLeft ? 2 : Math.max(0, room - BALL_W - 2), vx: (fromLeft ? 1 : -1) * (2.5 + Math.random() * 1.5) }
      await update($, ball, () => thrown)
      reply = '🎾 Fetch!'
    } else if (verb === 'zoomies' || verb === 'zoom') {
      const some = targets(rest.join(' ')).filter(isFree)
      if (some.length === 0) return { text: 'Nobody is up for zoomies right now.' }
      await apply(some, p => ({ ...p, mood: 'zoom' as const, moodTicks: 40, bubble: 'ZOOMIES!', bubbleTicks: 12 }))
      reply = `💨 ${names(some)} ${some.length === 1 ? 'has' : 'have'} the zoomies.`
    } else if (verb === 'party' || verb === 'celebrate') {
      await moment($, 'party', '🎉 PARTY 🎉')
      reply = '🥳'
    } else if (verb === 'boss') {
      const arg = rest[0]?.toLowerCase()
      const now = arg === 'on' ? true : arg === 'off' ? false : !(await read($, boss))
      await update($, boss, () => now)
      if (now) await update($, ball, () => null)
      if (!now) await cheer($, () => pick(['phew!', 'is he gone?', 'meeting over!', 'freedom!']))
      reply = now ? '🕴️ Boss mode: everyone look busy.' : '🎉 Boss mode off. Back to the fun.'
    } else if (verb === 'sass') {
      const arg = rest[0]?.toLowerCase()
      const now = arg === 'on' ? true : arg === 'off' ? false : !(await read($, sass))
      await update($, sass, () => now)
      reply = now ? '😏 Sass on: the pets will comment on what Claude does.' : '🤐 Sass off.'
    } else if (verb === 'moods' || verb === 'mood') {
      const arg = rest[0]?.toLowerCase()
      const now = arg === 'on' ? true : arg === 'off' ? false : !(await read($, moods))
      await update($, moods, () => now)
      reply = now
        ? '🫶 Moods on: the pets read the mood of your messages and Claude\'s replies (one tiny Haiku check each).'
        : '😶 Moods off: no AI checks. Talking to them ("good boy", "Biscuit sit") still works.'
    } else if (verb === 'breed') {
      const pet = rest.length >= 2 ? find(rest[0]) : list[0]
      const id = breedAlias((rest.length >= 2 ? rest[1] : rest[0])?.toLowerCase() ?? '')
      if (!pet) return noOne()
      if (!(id in BREEDS[pet.species])) return { text: `${pet.species} breeds: ${Object.keys(BREEDS[pet.species]).join(', ')}` }
      await apply([pet], p => ({ ...p, breed: id, mood: 'happy' as const, moodTicks: 8, bubble: '✨', bubbleTicks: 10 }))
      reply = `${pet.name} is now a ${breedOf(pet.species, id).label.toLowerCase()}.`
    } else if (verb === 'skin') {
      const pet = rest.length >= 2 ? find(rest[0]) : list[0]
      const skin = rest.length >= 2 ? rest[1] : rest[0]
      if (!pet) return noOne()
      if (!skin || !(skin in SKINS[pet.species])) return { text: `${pet.species} skins: ${Object.keys(SKINS[pet.species]).join(', ')}` }
      await apply([pet], p => ({ ...p, skin, mood: 'happy' as const, moodTicks: 8, bubble: '✨', bubbleTicks: 10 }))
      reply = `${pet.name} is now ${SKINS[pet.species][skin]?.label}.`
    } else if (verb === 'name') {
      const pet = find(rest[0])
      const newName = rest.slice(1).join(' ').slice(0, 20)
      if (!pet || !newName) return { text: 'Usage: /pet name <name> <new name>' }
      await apply([pet], p => ({ ...p, name: newName, mood: 'happy' as const, moodTicks: 8, bubble: `I'm ${newName}!`, bubbleTicks: 15 }))
      reply = `${pet.name} is now called ${newName}.`
    } else if (verb === 'remove') {
      const arg = rest.join(' ')
      if (!arg) return { text: list.length ? `Remove which pet? ${names(list)} (/pet remove <name>)` : 'No pets to remove.' }
      let pet = find(arg)
      if (!pet && SPECIES.includes(arg.toLowerCase() as Species)) {
        const ofKind = list.filter(p => p.species === arg.toLowerCase())
        if (ofKind.length > 1) return { text: `You have ${ofKind.length} ${arg}s: ${names(ofKind)}. Which one? /pet remove <name>` }
        pet = ofKind[0]
      }
      if (!pet) return { text: `No pet called ${arg}.` }
      const goner = pet
      await update($, pets, l => l.filter(p => p.id !== goner.id))
      reply = `${pet.name} went home for a nap. 👋`
    } else if (verb === 'off') {
      await update($, isShown, () => false)
      stopWalking()
      reply = 'Pets hidden. /pet on to bring them back.'
    } else if (verb === 'on') {
      await update($, isShown, () => true)
      startWalking($)
      await cheer($, () => 'hi!')
      reply = 'Pets are back!'
    } else {
      return { text: HELP }
    }
    await save($)
    return { text: reply }
  })

  // Watch what Claude does and have opinions about it.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined && (await read($, isShown))) {
      const ok = !ran.deny && ran.isError !== true
      const said = react(String(e.tool), e as unknown as Record<string, unknown>, ok, ran.deny ?? '', Math.random())
      if (said?.kind === 'quip') await quip($, said.text)
      else if (said) await moment($, said.kind, said.text)
    }
    return ran
  })

  on('turn.start', async ($, e, next) => {
    isWorking = true
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, idleTicks, () => 0)
    if (e.origin?.kind === 'plugin' || !(await read($, isShown))) return next(e)
    const talk = parsePetTalk(e.text, await read($, pets))
    if (talk) {
      const said = await obey($, talk)
      // A message only for the pets stays with the pets: no turn is spent on it.
      if (talk.isOnlyPetTalk) return { drop: said }
      return next(e)
    }
    const text = e.text.trim()
    if ((await read($, moods)) && !(await read($, boss)) && text.length >= 3 && !text.startsWith('/')) {
      const sample = text.slice(0, 2000)
      // Off the prompt's own path, so reading the mood never slows your message down.
      $.clock.after(0, () => void readUserMood($, sample))
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      isWorking = false
      if (e.durationMs > 3 * 60_000 && Math.random() < 0.5) await quip($, pick(['that took a while… just saying', 'I aged 7 dog years', 'finally!']))
      await cheer($, e.reason === 'answer' ? undefined : () => '…?')
      if (e.reason === 'answer' && e.answer.trim() && (await read($, moods)) && !(await read($, boss))) {
        const tail = e.answer.slice(-4000)
        $.clock.after(1200, () => void readClaudeMood($, tail))
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Pets walk under whatever the other mods show in the band, never instead of it.
    const below = await next(e)
    if (e.props.hasSurvey || !(await read($, isShown))) return below
    const list = await read($, pets)
    if (list.length === 0) return below
    room = Math.max(W, e.props.bodyColumns)
    const isBoss = await read($, boss)
    const b = await read($, ball)
    const R = $.ui.resolve(e)
    const { Box, Text } = R

    const draw = (key: string, grid: (string | null)[][], alt: string) => {
      const cols = grid[0]?.length ?? W
      return e.surface === 'terminal' && 'Raster' in R ? (
        <R.Raster key={key} columns={cols} rows={Math.ceil(grid.length / 2)} cells={rasterCells(grid)} />
      ) : 'Svg' in R ? (
        <R.Svg source={svgSource(grid)} alt={alt} width={cols * 3} height={grid.length * 3} />
      ) : (
        <Text>{alt}</Text>
      )
    }

    // Pets and their things flow left to right in one row, each pushed to its spot by a
    // margin, so the band is exactly as tall as the pets.
    type Item = { key: string; x: number; width: number; node: unknown; label?: { text: string; color: string; at: number } }
    const items: Item[] = []
    for (const p of list) {
      const skin = SKINS[p.species][p.skin] ?? Object.values(SKINS[p.species])[0]!
      const fast = ['run', 'toBowl', 'eat', 'zoom', 'chase', 'hide', 'gather'].includes(p.mood)
      const x = clamp(p.x, 0, Math.max(0, room - W))
      const desk = isBoss ? laptopSpot(p, room) : undefined
      const dir = desk ? desk.dir : p.dir
      const moving =
        (p.mood === 'hide' && x !== 0 && x !== Math.max(0, room - W)) ||
        (p.mood === 'gather' && !!p.chasing?.startsWith('spot:') && clamp(Number(p.chasing.slice(5)), 0, Math.max(0, room - W)) !== x)
      let frame = frameFor(p.species, p.breed, poseOf(p, moving), fast ? p.frame : Math.floor(p.frame / 2))
      // A pet with a heart (H) on its chest: it beats lub-dub, then rests.
      const beat = p.frame % 10
      if (!(beat < 2 || (beat >= 3 && beat < 5))) frame = frame.map(row => row.replace(/H/g, 'B'))
      const worn: Wearable[] = []
      if (p.hat) worn.push(p.hat as Accessory)
      if (p.mood === 'party') worn.splice(0, worn.length, ...worn.filter(w => w === 'shades' || w === 'bowtie'), 'party')
      if (isBoss) worn.push('shades', 'tie')
      if (worn.length) frame = dress(frame, worn, skin.mono === true)
      const grid = pixels(frame, skin, dir)
      const text = p.bubble ? `${p.name}: ${p.bubble}` : p.mood === 'sleep' || p.mood === 'nap' ? 'z Z' : ''
      const emoji = p.species === 'dog' ? '🐕' : p.species === 'cat' ? '🐈' : '🦊'
      items.push({
        key: p.id,
        x,
        width: W,
        node: draw(`pet-${p.id}`, grid, emoji),
        label: text ? { text, color: skin.D, at: clamp(x + (dir === 1 ? 6 : 0), 0, Math.max(0, room - text.length)) } : undefined,
      })
      if (p.bowl !== null && !isBoss) {
        const bowlGrid = pixels(p.mood === 'eat' && p.moodTicks < 12 ? BOWL_HALF : BOWL_FULL, skin.mono ? monoProps(skin) : BOWL_SKIN, 1)
        items.push({ key: `bowl-${p.id}`, x: clamp(p.bowl, 0, Math.max(0, room - BOWL_W)), width: BOWL_W, node: draw(`bowl-${p.id}`, bowlGrid, '🥣') })
      }
      if (desk) {
        items.push({ key: `desk-${p.id}`, x: desk.x, width: LAPTOP_W, node: draw(`desk-${p.id}`, skin.mono ? pixels(LAPTOP_MONO, skin, desk.dir === 1 ? 1 : -1) : pixels(LAPTOP, BOWL_SKIN, desk.dir === 1 ? 1 : -1), '💻') })
      }
    }
    if (b && !isBoss) items.push({ key: 'ball', x: clamp(Math.round(b.x), 0, Math.max(0, room - BALL_W)), width: BALL_W, node: draw('ball', pixels(BALL, BOWL_SKIN, 1), '🎾') })
    items.sort((a, c) => a.x - c.x)

    let end = 0
    const row = items.map(item => {
      const gap = Math.max(0, item.x - end)
      end += gap + item.width
      return (
        <Box key={`s-${item.key}`} marginLeft={gap} width={item.width} flexShrink={0}>
          {item.node as never}
        </Box>
      )
    })

    let labelEnd = 0
    const labels = items
      .filter(item => item.label)
      .sort((a, c) => a.label!.at - c.label!.at)
      .map(item => {
        const { text, color, at } = item.label!
        const gap = Math.max(labelEnd === 0 ? 0 : 1, at - labelEnd)
        labelEnd += gap + text.length
        return (
          <Box key={`l-${item.key}`} marginLeft={gap} flexShrink={0}>
            <Text color={color} bold wrap="truncate-end">
              {text}
            </Text>
          </Box>
        )
      })

    return (
      <Box flexDirection="column">
        {below}
        {labels.length > 0 && (
          <Box key="pet-labels" flexDirection="row" height={1} overflow="hidden">
            {labels}
          </Box>
        )}
        <Box key="pets" flexDirection="row" alignItems="flex-end" overflow="hidden">
          {row}
        </Box>
      </Box>
    )
  })
}
