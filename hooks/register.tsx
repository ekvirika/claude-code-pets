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
  spread,
  parseAdopt,
  poseOf,
  roll,
  step,
  wake,
} from './life'
import { rasterCells, svgSource } from './paint'
import { isCommitCommand, isTestCommand, react } from './sass'
import { BADGES, TRAIT_LABEL, bond, emptyStats, friendCount, friendsOf, gainXp, levelLook, levelOf, newBadges, rivalsOf, xpBar } from './growth'
import type { Bonds, Stats, Trait } from './growth'
import { BED, BED_SKIN, BED_W, POST, POST_SKIN, POST_W, PUMPKIN, PUMPKIN_SKIN, PUMPKIN_W, WEATHER_ICON, isLateNight, isNight, particles, seasonOf, toySpots, weatherFromCode } from './world'
import { parsePr, prChanges } from './watch'
import type { PrSnapshot } from './watch'
import { NAME_COLORS, autoNameColor, colorName, parseColor, talkColor } from './tags'
import { BARK, contextLevel, contextLines, keysUpTo, limitAlerts, limitLines, type ContextLevel, type RateWindow } from './limits'
import { CLAUDE_MOODS, CLAUDE_REACTIONS, PRAISE, SPEAK, USER_MOODS, USER_REACTIONS, asMood, lineFor, parsePetTalk } from './moods'
import type { PetTalk, Reaction } from './moods'
import { BOWL_FULL, BOWL_HALF, BOWL_SKIN, BREEDS, MW, SKINS, TW, W, breedOf, frameFor, miniFrame, monoProps, pixels, shrink, tinyFrame } from './sprites'
import type { Frame, Species } from './sprites'

export { FIRST, eatingSpot, feed, nap, parseAdopt, step, wake } from './life'

const MAX_PETS = 5
const BALL: Frame = ['.RR.', 'RWRR', 'RRRR', '.RR.']

const pets = atom({ plugin: 'prompt-pets', key: 'pets' } as const, [FIRST])
const isShown = atom({ plugin: 'prompt-pets', key: 'isShown' } as const, true)
const idleTicks = atom({ plugin: 'prompt-pets', key: 'idleTicks' } as const, 0)
const boss = atom({ plugin: 'prompt-pets', key: 'boss' } as const, false)
const sass = atom({ plugin: 'prompt-pets', key: 'sass' } as const, true)
const ball = atom({ plugin: 'prompt-pets', key: 'ball' } as const, null)
const moods = atom({ plugin: 'prompt-pets', key: 'moods' } as const, true)
// Name tags over the pets' heads.
const nameTags = atom({ plugin: 'prompt-pets', key: 'names' } as const, false)
// auto: tiny art in the terminal (block characters draw big), full-size art in the desktop app.
const size = atom({ plugin: 'prompt-pets', key: 'size' } as const, 'auto')
const focus = atom({ plugin: 'prompt-pets', key: 'focus' } as const, 0)
const toys = atom({ plugin: 'prompt-pets', key: 'toys' } as const, false)
const weather = atom({ plugin: 'prompt-pets', key: 'weather' } as const, 'none')
const counted = atom({ plugin: 'prompt-pets', key: 'counted' } as const, false)
// Usage-limit levels the pets already barked about, so a reload doesn't bark again.
const limitWarned = atom({ plugin: 'prompt-pets', key: 'limitWarned' } as const, [] as string[])
// How full this conversation was when the pets last warned about it (0, 75 or 90).
const contextWarned = atom({ plugin: 'prompt-pets', key: 'contextWarned' } as const, 0 as ContextLevel)

// Your history together and the pets' settings, kept in the store across sessions.
let stats: Stats = emptyStats(0)
let badges: string[] = []
let bonds: Bonds = {}
const settings = { watch: true, seasons: true, care: true, limits: true, weatherCity: null as string | null }
let pr: PrSnapshot | undefined
let watchTimer: Timer | undefined
let weatherTimer: Timer | undefined
let streak = 0
let minutes = 0
let lastNudge = -1e9
let lastLateNudge = -1e9
// Which roster this session holds. Several Claude Code sessions share the store: only a roster
// change (add, remove, rename, restyle) writes the roster, and the others pick it up.
let rosterVersion = 0
const ROSTER_VERBS = new Set(['add', 'remove', 'breed', 'skin', 'name', 'hat', 'wear', 'dress', 'namecolor', 'color', 'colour'])

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
  const focusLeft = await read($, focus)
  const spots = (await read($, toys)) ? toySpots(room) : null
  const world = { width: room, working: isWorking, idle, boss: isBoss, ball: b, positions, focus: focusLeft > 0, bed: spots?.bed ?? null, post: spots?.post ?? null }
  let next = list.map(p => step(p, world, Math.random()))

  if (!isBoss) {
    // A ball on the floor: the nearest free pet goes for it, and the first nose there wins.
    if (b) {
      const at = b.x + 1
      const catcher = next.find(p => p.chasing === 'ball' && Math.abs(noseOf(p) - at) <= 1.5)
      if (catcher) {
        await update($, ball, () => null)
        stats.balls += 1
        next = gainXp(next, 5, p => p.id === catcher.id).pets
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
        // Rivals never let the other one have it: they race.
        const racers = nearest ? new Set([nearest.id, ...rivalsOf(nearest, free).map(r => r.id)]) : new Set<string>()
        next = next.map(p => (racers.has(p.id) ? { ...p, chasing: 'ball', mood: 'chase', moodTicks: 0, bubble: p.id === nearest?.id ? 'BALL!' : 'mine!!', bubbleTicks: 10 } : p))
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
  // A pet that just lay down: tired friends come and nap beside it.
  if (focusLeft === 0 && !isBoss) {
    for (const p of next) {
      const before = list.find(q => q.id === p.id)
      if (p.mood !== 'nap' || before?.mood === 'nap') continue
      const side = p.x + W * 2 <= room ? p.x + W : Math.max(0, p.x - W)
      const sleepy = friendsOf(p, next, bonds).filter(f => isFree(f) && f.energy < 75)
      next = next.map(q => (sleepy.some(f => f.id === q.id) ? { ...q, mood: 'gather', chasing: `napnear:${side}`, moodTicks: 0 } : q))
    }
  }
  const settled = next
  await update($, pets, () => settled)
  if (focusLeft > 0) {
    await update($, focus, n => Math.max(0, n - 1))
    if (focusLeft === 1) await focusDone($)
  }
  ticks += 1
  if (ticks % PER_MINUTE === 0) {
    await minuteTick($)
    await save($)
  }
}

// Gives XP and says so when someone levels up.
async function giveXp($: EngineInterface, amount: number, who: (p: Pet) => boolean = () => true) {
  let ups: Array<{ name: string; id: string; level: number }> = []
  await update($, pets, l => {
    const r = gainXp(l, amount, who)
    ups = r.ups
    return r.pets
  })
  await announceUps($, ups)
}

async function announceUps($: EngineInterface, ups: ReadonlyArray<{ name: string; id: string; level: number }>) {
  if (ups.length === 0) return
  const ids = new Map(ups.map(u => [u.id, u.level]))
  await update($, pets, l =>
    l.map(p => {
      const level = ids.get(p.id)
      return level === undefined ? p : { ...p, mood: p.mood === 'nap' || p.mood === 'eat' ? p.mood : ('happy' as const), moodTicks: 12, bubble: `LEVEL UP! lv ${level} ✨`, bubbleTicks: 22 }
    }),
  )
  for (const u of ups) {
    const look = levelLook(u.level)
    const extra = u.level === 3 ? ' (new collar!)' : u.level === 6 ? ' (new scarf!)' : u.level === 10 ? ' (a crown! 👑)' : ''
    $.ui.toast(`⭐ ${u.name} reached level ${u.level}${look ? extra : ''}`)
  }
  await checkBadges($)
}

async function checkBadges($: EngineInterface) {
  const list = await read($, pets)
  const maxLevel = list.reduce((m, p) => Math.max(m, levelOf(p.xp)), 1)
  const fresh = newBadges(stats, { maxLevel, friends: friendCount(list, bonds) }, badges)
  for (const b of fresh) {
    badges.push(b.id)
    $.ui.toast(`🏅 Badge unlocked: ${b.emoji} ${b.label}`)
  }
  if (fresh.length) await moment($, 'party', `🏅 ${fresh[0]!.label}`)
}

async function focusDone($: EngineInterface) {
  stats.focusDone += 1
  await update($, pets, l =>
    l.map((p, i) => ({ ...p, mood: 'happy' as const, moodTicks: 12, bubble: i === 0 ? 'break time! 🙆 stretch' : '*stretch*', bubbleTicks: 20 })),
  )
  $.ui.toast('🍅 Focus session done. Time for a break!')
  await giveXp($, 15)
  await checkBadges($)
}

// Once a minute: time together, friendships, and looking after you.
async function minuteTick($: EngineInterface) {
  minutes += 1
  const idle = await read($, idleTicks)
  const active = isWorking || idle < 5 * PER_MINUTE
  if (active) {
    stats.minutes += 1
    await giveXp($, 1)
  }
  const b = bond(await read($, pets), bonds)
  bonds = b.bonds
  for (const [x, y] of b.newFriends) {
    await update($, pets, l => l.map(p => (p.id === x.id || p.id === y.id ? { ...p, mood: 'happy' as const, moodTicks: 10, bubble: '♥ best friends', bubbleTicks: 20 } : p)))
    $.ui.toast(`💞 ${x.name} and ${y.name} are best friends now`)
  }
  if (b.newFriends.length) await checkBadges($)
  if (!settings.care || (await read($, focus)) > 0 || (await read($, boss))) return
  streak = active ? streak + 1 : 0
  const hour = new Date(await $.clock.now()).getHours()
  if (streak >= 90 && minutes - lastNudge >= 45) {
    lastNudge = minutes
    await careNudge($, pick(['hydrate! 💧', 'water break? 💧', 'stretch time 🙆']), `💧 ${Math.floor(streak / 60)}h${String(streak % 60).padStart(2, '0')} nonstop. Water and a stretch?`)
  } else if (active && isLateNight(hour) && minutes - lastLateNudge >= 30) {
    lastLateNudge = minutes
    await careNudge($, pick(["it's late… 🌙", 'go to bed 🥱', '*yawns pointedly*']), "🌙 It's past midnight. The pets think you should sleep.")
  }
}

// Your 5-hour or weekly limit is running low: everyone barks, and at 100% they nap until it resets.
async function watchLimits($: EngineInterface, windows: readonly RateWindow[]) {
  if (!settings.limits || !(await read($, isShown))) return
  const alerts = limitAlerts(windows, await read($, limitWarned))
  if (!alerts.length) return
  const alert = alerts.reduce((a, b) => (b.level > a.level ? b : a))
  await update($, limitWarned, w => [...new Set([...w, ...alerts.flatMap(keysUpTo)])].slice(-40))
  const list = await read($, pets)
  if (!list.length) return
  const { say, toast } = limitLines(alert, await $.clock.now())
  const lead = list[0]!.id
  const out = alert.level === 100
  await update($, pets, l =>
    l.map(p => ({
      ...p,
      bowl: null,
      chasing: out ? null : p.chasing,
      mood: out ? ('nap' as const) : ('happy' as const),
      moodTicks: out ? 10 * PER_MINUTE : 14,
      bubble: p.id === lead ? say : BARK[p.species],
      bubbleTicks: p.id === lead ? 40 : 20,
    })),
  )
  $.ui.toast(toast)
}

// The conversation is filling up: one pet walks over and says so.
async function watchContext($: EngineInterface, percent: number | undefined) {
  const { level, alert } = contextLevel(percent, await read($, contextWarned))
  await update($, contextWarned, () => level)
  if (!alert || level === 0 || percent === undefined || !settings.limits || !(await read($, isShown))) return
  const { say, toast } = contextLines(level, percent)
  await careNudge($, say, toast)
}

async function careNudge($: EngineInterface, line: string, toast: string) {
  const awake = awakeOf(await read($, pets))
  const who = pick(awake.length ? awake : await read($, pets))
  if (!who) return
  await update($, pets, l => l.map(p => (p.id === who.id ? { ...p, mood: 'gather' as const, chasing: `spot:${middle()}`, moodTicks: 30, bubble: line, bubbleTicks: 25 } : p)))
  $.ui.toast(toast)
}

// Your PR, through the GitHub CLI: new reviews, CI going red or green.
async function pollPr($: EngineInterface) {
  if (!settings.watch) return
  let out: { exitCode: number; stdout: string }
  try {
    out = await $.process.run(['gh', 'pr', 'view', '--json', 'number,reviews,statusCheckRollup'], { timeoutMs: 20_000 })
  } catch {
    return
  }
  if (out.exitCode !== 0) {
    pr = undefined
    return
  }
  const snap = parsePr(out.stdout)
  if (!snap) return
  const events = prChanges(pr, snap)
  pr = snap
  for (const ev of events) {
    $.ui.toast(ev.text)
    if (ev.kind === 'ci-fail') await moment($, 'hide', ev.text)
    else if (ev.kind === 'ci-pass') await moment($, 'party', ev.text)
    else await careNudge($, ev.text.length > 28 ? '📬 mail for you!' : ev.text, ev.text)
  }
}

function startWatching($: EngineInterface) {
  watchTimer?.cancel()
  watchTimer = undefined
  if (!settings.watch) return
  $.clock.after(5_000, () => void pollPr($))
  watchTimer = $.clock.every(180_000, () => void pollPr($))
}

// Weather where you are (wttr.in), when you've switched it on.
async function fetchWeather($: EngineInterface) {
  if (settings.weatherCity === null) return
  try {
    const res = await $.http.fetch(`https://wttr.in/${encodeURIComponent(settings.weatherCity)}?format=j1`, { headers: { 'user-agent': 'curl/8.0 (claude-code-pets)' } })
    if (!res.ok) return
    const data = JSON.parse(res.text) as { current_condition?: Array<{ weatherCode?: string }> }
    const kind = weatherFromCode(Number(data.current_condition?.[0]?.weatherCode))
    await update($, weather, () => kind)
  } catch {
    // no weather today
  }
}

function startWeather($: EngineInterface) {
  weatherTimer?.cancel()
  weatherTimer = undefined
  if (settings.weatherCity === null) return
  void fetchWeather($)
  weatherTimer = $.clock.every(30 * 60_000, () => void fetchWeather($))
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
  if ((await read($, focus)) > 0) return
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
  if ((await read($, boss)) || (await read($, focus)) > 0) return
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
  if (!(await read($, sass)) || (await read($, boss)) || (await read($, focus)) > 0) return
  const now = await $.clock.now()
  if (now - lastQuipAt < 40_000) return
  const awake = (await read($, pets)).filter(p => p.mood !== 'nap' && p.mood !== 'sleep' && !p.bubble)
  if (awake.length === 0) return
  lastQuipAt = now
  // Grumpy pets get the last word.
  const grumpy = awake.filter(p => p.trait === 'grumpy')
  const who = pick(grumpy.length && Math.random() < 0.7 ? grumpy : awake)
  await update($, pets, l => l.map(p => (p.id === who.id ? { ...p, bubble: text, bubbleTicks: 22 } : p)))
}

const awakeOf = (list: readonly Pet[]) => list.filter(p => p.mood !== 'nap' && p.mood !== 'eat' && p.mood !== 'faint' && p.mood !== 'work')
const middle = () => Math.max(0, Math.floor((room - W) / 2))

// What the pets do about a mood they picked up.
async function reactMood($: EngineInterface, r: Reaction) {
  if ((await read($, boss)) || !(await read($, isShown)) || (await read($, focus)) > 0) return
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
      await all(p => ({ ...p, mood: 'happy', moodTicks: 14, bubble: p.trait === 'grumpy' ? 'hmph. fine. ♥' : pick(PRAISE[p.species] ?? ['♥']), bubbleTicks: 18 }))
      stats.pats += chosen.length
      await giveXp($, 2, p => ids.has(p.id))
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

type Saved = { species: Species; breed?: string; skin: string; name: string; hunger?: number; energy?: number; hat?: string | null; xp?: number; trait?: Trait; nameColor?: string | null }

// Another session changed the roster: take it, keeping our own live pets where they match.
async function adoptRoster($: EngineInterface, saved: readonly Saved[]) {
  await update($, pets, current => {
    const next: Pet[] = []
    for (const s of saved.slice(0, MAX_PETS)) {
      if (!SPECIES.includes(s.species)) continue
      const live = current.find(p => p.name === s.name && p.species === s.species)
      if (live) next.push({ ...live, breed: s.breed ?? live.breed, skin: s.skin, hat: s.hat ?? null, nameColor: s.nameColor ?? null })
      else next.push(adopt(s.species, { breed: s.breed, skin: s.skin, name: s.name, hat: s.hat, xp: s.xp, trait: s.trait, nameColor: s.nameColor }, next, room))
    }
    return next
  })
}

async function save($: EngineInterface, rosterChanged = false) {
  const stored = (await $.store.get('pets')) as { rosterVersion?: number; pets?: Saved[] } | undefined
  const storedVersion = stored?.rosterVersion ?? 0
  if (rosterChanged) rosterVersion = Math.max(rosterVersion, storedVersion) + 1
  else if (storedVersion > rosterVersion && Array.isArray(stored?.pets)) {
    await adoptRoster($, stored.pets)
    rosterVersion = storedVersion
  }
  const list = await read($, pets)
  await $.store.set('pets', {
    rosterVersion,
    isShown: await read($, isShown),
    boss: await read($, boss),
    sass: await read($, sass),
    moods: await read($, moods),
    size: await read($, size),
    toys: await read($, toys),
    artReset: 2,
    settings,
    stats,
    badges,
    bonds,
    savedAt: await $.clock.now(),
    names: await read($, nameTags),
    pets: list.map(({ species, breed, skin, name, hunger, energy, hat, xp, trait, nameColor }): Saved => ({ species, breed, skin, name, hunger, energy, hat, xp, trait, nameColor })),
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

// The breeds the pets come in, spelled out for /pet and for anyone asking for one we don't have.
const BREED_LINES = SPECIES.map(
  sp => `${sp}: ${Object.entries(BREEDS[sp]).map(([id, b]) => (id === b.label.toLowerCase() ? id : `${id} (${b.label})`)).join(', ')}`,
)
const BREED_LIST = `Supported breeds:\n${BREED_LINES.map(l => `  ${l}`).join('\n')}\nColors: /pet skins`
// Breeds people ask for that aren't drawn yet (skins with these names, like husky or maltipoo, are fine).
const NOT_YET = /^(poodle|labrador|beagle|pug|bulldog|frenchie|chihuahua|shiba|maltese|terrier|yorkie|shepherd|collie|rottweiler|doberman|greyhound|dalmatian|pomeranian|bichon|shihtzu|havanese|boxer|akita|persian|sphynx|ragdoll|bengal|tabby|abyssinian|birman|scottish|munchkin)s?$/i

function statsText(list: readonly Pet[]): string {
  const days = Math.max(1, Math.round((Date.now() - stats.firstMet) / 86_400_000))
  const h = Math.floor(stats.minutes / 60)
  const lines = [
    `🐾 Together for ${days} day${days === 1 ? '' : 's'} · ${stats.sessions} session${stats.sessions === 1 ? '' : 's'} · ${h}h${String(stats.minutes % 60).padStart(2, '0')} coding together`,
    `   commits ${stats.commits}${stats.nightCommits ? ` (${stats.nightCommits} after midnight)` : ''} · tests ✅ ${stats.testsPassed} ❌ ${stats.testsFailed} · meals ${stats.meals} · pats ${stats.pats} · focus ${stats.focusDone} · balls ${stats.balls}`,
    '',
    'Pets:',
    ...list.map(p => {
      const level = levelOf(p.xp)
      const look = levelLook(level)
      return `  ${p.name.padEnd(10)} lv ${String(level).padStart(2)} ${xpBar(p.xp)} ${p.xp} xp · ${TRAIT_LABEL[p.trait]}${look ? ` · ${look}` : ''}`
    }),
  ]
  const friends: string[] = []
  const rivals: string[] = []
  list.forEach((p, i) =>
    list.slice(i + 1).forEach(q => {
      if (friendsOf(p, [q], bonds).length) friends.push(`${p.name} ♥ ${q.name}`)
      else if (rivalsOf(p, [q]).length) rivals.push(`${p.name} ⚔ ${q.name}`)
    }),
  )
  if (friends.length) lines.push('', `Best friends: ${friends.join(', ')}`)
  if (rivals.length) lines.push(`Rivals: ${rivals.join(', ')}`)
  const earned = BADGES.filter(b => badges.includes(b.id))
  const locked = BADGES.filter(b => !badges.includes(b.id))
  lines.push('', `Badges ${earned.length}/${BADGES.length}: ${earned.map(b => `${b.emoji} ${b.label}`).join(' · ') || 'none yet'}`)
  if (locked.length) lines.push(`Still to earn: ${locked.map(b => `${b.emoji} ${b.label}`).join(' · ')}`)
  return lines.join('\n')
}

const HELP = [
  'Pets:',
  '  /pet add <dog|cat|fox> [breed] [skin] [name]   adopt one (up to 5)',
  ...BREED_LINES.map(l => `      ${l}`),
  '  /pet feed [name|all]                           put food down',
  '  /pet sleep [name|all]  /pet wake [name|all]    bedtime and wake-up',
  '  /pet pat <name>                                a little love',
  '  /pet hat <name|all> <hat|none>                 party, crown, wizard, santa, tophat, shades, bowtie',
  '  /pet ball                                      throw a ball',
  '  /pet zoomies [name|all]                        go wild',
  '  /pet party                                     celebrate',
  '  /pet boss [on|off]                             look busy, the boss is coming',
  '  /pet sass on|off                               comments on your code',
  '  /pet stats                                     your history together: levels, badges, friends',
  '  /pet focus [minutes|stop]                      a focus session: pets nap, then call a break',
  '  /pet toys on|off                               a bed and a scratching post',
  '  /pet weather <city>|on|off                     live weather on the band (off by default)',
  '  /pet seasons|care|watch on|off                 seasons, wellbeing nudges, PR/CI watcher',
  '  /pet limits on|off                             warn when your usage limit or the conversation runs low',
  '  /pet names on|off                              name tags over their heads',
  '  /pet namecolor <name|all> <color|#hex|auto>    color a name tag (red, pink, gold, blue, …)',
  '  /pet size auto|tiny|small|large               auto: small in the terminal, full size in the desktop app',
  '  /pet moods on|off                              react to the mood of the chat (a tiny AI check per message)',
  '  …or just talk to them: "good boy", "Biscuit sit", "Pixel come here", "everyone dance"',
  '  /pet breed <name> <breed>  /pet skin <name> <skin>  /pet name <name> <new name>',
  '  /pet remove <name>   /pet breeds | skins   /pet off | on',
].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = (await $.store.get('pets')) as
      | {
          isShown?: boolean
          boss?: boolean
          sass?: boolean
          moods?: boolean
          size?: string
          toys?: boolean
          settings?: Partial<typeof settings>
          stats?: Partial<Stats>
          badges?: string[]
          bonds?: Bonds
          artReset?: number | boolean
          names?: boolean
          rosterVersion?: number
          savedAt?: number
          pets?: Saved[]
        }
      | undefined
    const now = await $.clock.now()
    rosterVersion = saved?.rosterVersion ?? 0
    stats = { ...emptyStats(now), ...(saved?.stats ?? {}) }
    badges = Array.isArray(saved?.badges) ? [...saved.badges] : []
    bonds = saved?.bonds && typeof saved.bonds === 'object' ? { ...saved.bonds } : {}
    Object.assign(settings, saved?.settings ?? {})
    // The art went back to full size, original colors and no toys: older saves follow once.
    const isReset = saved?.artReset === 2
    if (isReset && typeof saved?.toys === 'boolean') {
      const toysOut = saved.toys
      await update($, toys, () => toysOut)
    } else if (!isReset) {
      // A reload keeps the session's values, so the reset is applied, not just defaulted.
      await update($, toys, () => false)
      await update($, size, () => 'auto')
      await update($, pets, l => spread(l.map(p => (p.chasing === 'bed' || p.chasing === 'post' ? { ...p, chasing: null, mood: 'walk' as const } : p)), room))
    }
    // A session is counted once, not again on every reload of the mod.
    if (!(await read($, counted))) {
      stats.sessions += 1
      await update($, counted, () => true)
    }
    if (saved?.pets?.length) {
      // Time away: they got hungrier, and they slept.
      const awayMin = saved.savedAt ? Math.max(0, ((await $.clock.now()) - saved.savedAt) / 60_000) : 0
      const restored: Pet[] = []
      for (const s of saved.pets.slice(0, MAX_PETS)) {
        if (!SPECIES.includes(s.species)) continue
        const pet = adopt(s.species, { breed: s.breed, skin: s.skin, name: s.name, hat: s.hat, xp: s.xp, trait: s.trait, nameColor: s.nameColor }, restored, room)
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
    if (typeof saved?.names === 'boolean') {
      const shown = saved.names
      await update($, nameTags, () => shown)
    }
    if (isReset && (saved?.size === 'tiny' || saved?.size === 'small' || saved?.size === 'large' || saved?.size === 'auto')) {
      const chosen = saved.size
      await update($, size, () => chosen)
    }
    await $.command.register({
      name: 'pet',
      description: 'Adopt, feed, dress up and play with your pixel pets (or make them look busy)',
      argumentHint: 'add | feed | sleep | wake | stats | focus | hat | ball | toys | weather | boss | sass | moods | size | …',
    })
    if (await read($, isShown)) startWalking($)
    startWatching($)
    startWeather($)
    await checkBadges($)
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
          return `  ${p.name}: ${b}, ${k}${worn} · lv ${levelOf(p.xp)} ${p.trait} · food ${bar(p.hunger)} · energy ${bar(p.energy)} · ${status(p)}`
        })
        .join('\n')
      const modes = [(await read($, boss)) ? 'boss mode ON' : '', (await read($, sass)) ? 'sass on' : 'sass off', (await read($, moods)) ? 'moods on' : 'moods off'].filter(Boolean).join(' · ')
      return { text: `${roster || '  (no pets)'}\n  (${modes})\n\n${HELP}` }
    } else if (verb === 'skins') {
      return { text: SPECIES.map(s => `${s}: ${Object.entries(SKINS[s]).map(([id, k]) => `${id} (${k.label})`).join(', ')}`).join('\n') }
    } else if (verb === 'breeds') {
      return { text: BREED_LIST }
    } else if (verb === 'hats') {
      return { text: `Accessories: ${ACCESSORIES.join(', ')}, none` }
    } else if (verb === 'add') {
      const species = rest[0]?.toLowerCase() as Species
      if (!SPECIES.includes(species)) return { text: `Which pet? /pet add dog, cat or fox.\n${BREED_LIST}` }
      if (list.length >= MAX_PETS) return { text: `That's a full house (${MAX_PETS} pets). /pet remove one first.` }
      const wanted = parseAdopt(species, rest.slice(1))
      const missing = rest.slice(1).find(w => NOT_YET.test(w))
      if (missing && !wanted.breed) {
        return { text: `Sorry, ${missing.toLowerCase()} isn't a breed I can draw yet.\n${BREED_LIST}\nTip: pick a breed and a skin, e.g. /pet add dog retriever maltipoo` }
      }
      const pet = adopt(species, wanted, list, room)
      await update($, pets, l => [...l, { ...pet, mood: 'happy' as const, moodTicks: 10, bubble: 'hi!', bubbleTicks: 15 }])
      reply = `Welcome ${pet.name}, a ${SKINS[species][pet.skin]?.label ?? pet.skin} ${breedOf(species, pet.breed).label.toLowerCase()}!`
    } else if (verb === 'feed') {
      const some = targets(rest.join(' '))
      if (some.length === 0) return noOne()
      await apply(some, p => feed(p, room))
      stats.meals += some.length
      await giveXp($, 5, p => some.some(q => q.id === p.id))
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
      if (some.length === list.length) await update($, pets, l => spread(l, room))
      reply = `☀️ Rise and shine, ${names(some)}.`
    } else if (verb === 'pat' || verb === 'pet') {
      const some = targets(rest.join(' '))
      if (some.length === 0) return noOne()
      await apply(some, p => (p.mood === 'eat' ? p : { ...p, mood: 'happy' as const, moodTicks: 12, bubble: p.trait === 'grumpy' ? 'hmph. ♥' : '♥ ♥ ♥', bubbleTicks: 15 }))
      stats.pats += some.length
      await giveXp($, 3, p => some.some(q => q.id === p.id))
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
    } else if (verb === 'names') {
      const arg = rest[0]?.toLowerCase()
      const now = arg === 'on' ? true : arg === 'off' ? false : !(await read($, nameTags))
      await update($, nameTags, () => now)
      reply = now ? '🏷️ Name tags on. Change a color with /pet namecolor <name|all> <color>.' : 'Name tags off.'
    } else if (verb === 'namecolor' || verb === 'color' || verb === 'colour') {
      const raw = rest[rest.length - 1] ?? ''
      const color = parseColor(raw)
      const some = rest.length >= 2 ? targets(rest.slice(0, -1).join(' ')) : list
      if (color === undefined || !raw) {
        return { text: `Colors: ${Object.keys(NAME_COLORS).join(', ')}, any hex like #FF8800, or auto.\nUsage: /pet namecolor <name|all> <color>` }
      }
      if (some.length === 0) return noOne()
      await apply(some, p => ({ ...p, nameColor: color }))
      await update($, nameTags, () => true)
      reply = `🏷️ ${some.map(p => p.name).join(', ')}: name tag ${colorName(color)}.`
    } else if (verb === 'stats') {
      return { text: statsText(list) }
    } else if (verb === 'focus') {
      const arg = rest[0]?.toLowerCase()
      if (arg === 'stop' || arg === 'off') {
        await update($, focus, () => 0)
        await cheer($, () => 'awake!')
        reply = '🍅 Focus stopped.'
      } else {
        const mins = clamp(Math.round(Number(arg ?? 25) || 25), 1, 120)
        await update($, focus, () => mins * PER_MINUTE)
        await update($, ball, () => null)
        reply = `🍅 Focus for ${mins} min. The pets will nap quietly and wake you for a break. (/pet focus stop to end early)`
      }
    } else if (verb === 'toys') {
      const arg = rest[0]?.toLowerCase()
      const now = arg === 'on' ? true : arg === 'off' ? false : !(await read($, toys))
      await update($, toys, () => now)
      if (!now) await update($, pets, l => spread(l.map(p => (p.chasing === 'bed' || p.chasing === 'post' ? { ...p, chasing: null, mood: 'walk' as const } : p)), room))
      reply = now ? '🛏️ Toys out: a bed to nap by and a scratching post for the cats.' : 'Toys put away.'
    } else if (verb === 'weather') {
      const arg = rest.join(' ').trim()
      if (!arg) return { text: `Weather is ${settings.weatherCity === null ? 'off' : settings.weatherCity || 'auto (by your IP)'}. /pet weather <city> | auto | off` }
      if (arg.toLowerCase() === 'off') {
        settings.weatherCity = null
        await update($, weather, () => 'none')
        reply = 'Weather off.'
      } else {
        settings.weatherCity = ['auto', 'on'].includes(arg.toLowerCase()) ? '' : arg
        reply = settings.weatherCity
          ? `🌦️ Weather on for ${settings.weatherCity} (from wttr.in, checked every 30 min).`
          : '🌦️ Weather on, located by your IP address (sent to wttr.in). Use /pet weather <city> to name a place instead.'
      }
      startWeather($)
    } else if (verb === 'seasons' || verb === 'care' || verb === 'watch' || verb === 'limits') {
      const key = verb as 'seasons' | 'care' | 'watch' | 'limits'
      const arg = rest[0]?.toLowerCase()
      settings[key] = arg === 'on' ? true : arg === 'off' ? false : !settings[key]
      if (key === 'watch') startWatching($)
      const what = { seasons: 'Seasons (snow and santa hats in December, a pumpkin at Halloween)', care: 'Wellbeing nudges (water after 90 min nonstop, bedtime after midnight)', watch: 'PR watcher (reviews and CI, via the gh CLI every 3 min)', limits: 'Limit warnings (your 5-hour and weekly limits at 80/95/100%, and the conversation at 75/90% full)' }[key]
      reply = `${what}: ${settings[key] ? 'on' : 'off'}.`
    } else if (verb === 'size') {
      const arg = rest[0]?.toLowerCase()
      if (arg !== 'tiny' && arg !== 'small' && arg !== 'large' && arg !== 'auto') {
        return { text: `Pet size is ${await read($, size)}. /pet size auto (small in the terminal, full size in the desktop app), tiny (8×3), small (10×4) or large (16×6)` }
      }
      await update($, size, () => arg)
      reply =
        arg === 'auto'
          ? 'Pets size themselves: small in the terminal, full size in the desktop app.'
          : arg === 'tiny'
            ? 'Pets are now tiny (8×3).'
            : arg === 'small'
              ? 'Pets are now small (10×4).'
              : 'Pets are now full size (16×6).'
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
    await save($, ROSTER_VERBS.has(verb))
    return { text: reply }
  })

  // Watch what Claude does and have opinions about it.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined && (await read($, isShown))) {
      const ok = !ran.deny && ran.isError !== true
      const command = String((e as { command?: unknown }).command ?? '')
      if (String(e.tool) === 'Bash' && !ran.deny) {
        if (isTestCommand(command)) {
          if (ok) stats.testsPassed += 1
          else stats.testsFailed += 1
          if (ok) await giveXp($, 10)
        } else if (isCommitCommand(command) && ok) {
          stats.commits += 1
          if (isLateNight(new Date(await $.clock.now()).getHours())) stats.nightCommits += 1
          await giveXp($, 10)
        }
        await checkBadges($)
      }
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

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await watchLimits($, e.rateLimits)
    if (e.changed.includes('context')) await watchContext($, e.context.percent)
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
    // Small pets walk a band twice as wide as it looks, so they cross it at a natural pace.
    const chosen = await read($, size)
    // Compact pets have art of their own (small 10 columns, tiny 8); the band's units stay
    // full-size and are scaled down on screen.
    const compact = chosen === 'tiny' ? 'tiny' : chosen === 'small' || (chosen === 'auto' && e.surface === 'terminal') ? 'small' : null
    const isMini = compact !== null
    const scale = compact === 'tiny' ? W / TW : compact === 'small' ? W / MW : 1
    // Seasons dress the pets on their own.
    const date = new Date(await $.clock.now())
    const night = isNight(date.getHours())
    const season = settings.seasons ? seasonOf(date) : { snow: false, santa: false, pumpkin: false, label: '' }
    // Pets have mini art of their own; props (bowl, ball, laptop, toys) shrink to fit beside them.
    const paint = (frame: readonly string[], skin: Parameters<typeof pixels>[1], dir: 1 | -1) => pixels(isMini ? shrink(frame) : frame, skin, dir)
    room = Math.max(W, e.props.bodyColumns * scale)
    const isBoss = await read($, boss)
    const focusLeft = await read($, focus)
    const toysOn = await read($, toys)
    const sky = await read($, weather)
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
    type Label = { parts: Array<{ text: string; color: string }>; at: number }
    type Item = { key: string; x: number; width: number; node: unknown; label?: Label }
    const showNames = await read($, nameTags)
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
      const pose = poseOf(p, moving)
      // Small and asleep, a lying-down pet is a sliver: draw it curled up sitting, eyes closed.
      const tick = fast ? p.frame : Math.floor(p.frame / 2)
      let frame =
        compact === 'tiny'
          ? tinyFrame(p.species, p.breed, pose, tick)
          : compact === 'small'
            ? miniFrame(p.species, p.breed, pose, tick)
            : frameFor(p.species, p.breed, pose, tick)
      // A pet with a heart (H) on its chest: it beats lub-dub, then rests.
      const beat = p.frame % 10
      if (!(beat < 2 || (beat >= 3 && beat < 5))) frame = frame.map(row => row.replace(/H/g, 'B'))
      const worn: Wearable[] = []
      if (p.hat) worn.push(p.hat as Accessory)
      if (p.mood === 'party') worn.splice(0, worn.length, ...worn.filter(w => w === 'shades' || w === 'bowtie'), 'party')
      if (isBoss) worn.push('shades', 'tie')
      // Level looks: collar, scarf, then a crown, unless a hat is already on.
      const look = levelLook(levelOf(p.xp))
      const hasHat = worn.some(w => w === 'party' || w === 'crown' || w === 'wizard' || w === 'santa' || w === 'tophat')
      if (look === 'crown' && !hasHat) worn.push('crown')
      else if (look === 'collar' || look === 'scarf') worn.push(look)
      if (season.santa && !hasHat && look !== 'crown') worn.push('santa')
      // Hats and looks are drawn for the full-size art; mini pets go without.
      if (worn.length && !isMini) frame = dress(frame, worn, skin.mono === true)
      const grid = pixels(frame, skin, dir, isMini)
      // Name tag in its own color; what the pet says follows it.
      const tagColor = p.nameColor ?? autoNameColor(skin)
      const asleep = p.mood === 'sleep' || p.mood === 'nap'
      const talk = talkColor(skin)
      const parts: Array<{ text: string; color: string }> = p.bubble
        ? showNames
          ? [{ text: p.name, color: tagColor }, { text: `: ${p.bubble}`, color: talk }]
          : [{ text: `${p.name}: ${p.bubble}`, color: talk }]
        : showNames
          ? [{ text: p.name, color: tagColor }, ...(asleep ? [{ text: ' z', color: talk }] : [])]
          : asleep
            ? [{ text: isMini ? 'z' : 'z Z', color: talk }]
            : []
      const text = parts.map(t => t.text).join('')
      const width = W / scale
      // A plain name tag sits centered over the head; a speech line starts near the face.
      const labelAt = !p.bubble && showNames ? x + Math.floor(((width - text.length) * scale) / 2) : x + (dir === 1 ? 6 : 0)
      const emoji = p.species === 'dog' ? '🐕' : p.species === 'cat' ? '🐈' : '🦊'
      items.push({
        key: p.id,
        x,
        width: W,
        node: draw(`pet-${p.id}`, grid, emoji),
        label: text ? { parts, at: clamp(labelAt, 0, Math.max(0, room - text.length)) } : undefined,
      })
      if (p.bowl !== null && !isBoss) {
        const bowlGrid = paint(p.mood === 'eat' && p.moodTicks < 12 ? BOWL_HALF : BOWL_FULL, skin.mono ? monoProps(skin) : BOWL_SKIN, 1)
        items.push({ key: `bowl-${p.id}`, x: clamp(p.bowl, 0, Math.max(0, room - BOWL_W)), width: BOWL_W, node: draw(`bowl-${p.id}`, bowlGrid, '🥣') })
      }
      if (desk) {
        items.push({ key: `desk-${p.id}`, x: desk.x, width: LAPTOP_W, node: draw(`desk-${p.id}`, skin.mono ? paint(LAPTOP_MONO, skin, desk.dir === 1 ? 1 : -1) : paint(LAPTOP, BOWL_SKIN, desk.dir === 1 ? 1 : -1), '💻') })
      }
    }
    // Toys stay on the band; a pumpkin turns up for Halloween.
    if (toysOn) {
      const spots = toySpots(room)
      items.push({ key: 'bed', x: spots.bed, width: BED_W, node: draw('bed', paint(BED, BED_SKIN, 1), '🛏️') })
      items.push({ key: 'post', x: spots.post, width: POST_W, node: draw('post', paint(POST, POST_SKIN, 1), '🪵') })
    }
    if (season.pumpkin) {
      const at = toysOn ? Math.max(0, toySpots(room).post - PUMPKIN_W - 2) : Math.floor(room / 2)
      items.push({ key: 'pumpkin', x: at, width: PUMPKIN_W, node: draw('pumpkin', paint(PUMPKIN, PUMPKIN_SKIN, 1), '🎃') })
    }
    if (b && !isBoss) items.push({ key: 'ball', x: clamp(Math.round(b.x), 0, Math.max(0, room - BALL_W)), width: BALL_W, node: draw('ball', paint(BALL, BOWL_SKIN, 1), '🎾') })
    items.sort((a, c) => a.x - c.x)

    // Positions are in the walking band's units; on screen they shrink with the pets.
    let end = 0
    const row = items.map(item => {
      const at = Math.floor(item.x / scale)
      const width = Math.ceil(item.width / scale)
      const gap = Math.max(0, at - end)
      end += gap + width
      return (
        <Box key={`s-${item.key}`} marginLeft={gap} width={width} flexShrink={0}>
          {item.node as never}
        </Box>
      )
    })

    let labelEnd = 0
    const labels = items
      .filter(item => item.label)
      .sort((a, c) => a.label!.at - c.label!.at)
      .map(item => {
        const { parts } = item.label!
        const length = parts.reduce((n, t) => n + t.text.length, 0)
        const at = Math.max(0, Math.min(Math.floor(item.label!.at / scale), e.props.bodyColumns - length))
        const gap = Math.max(labelEnd === 0 ? 0 : 1, at - labelEnd)
        labelEnd += gap + length
        return (
          <Box key={`l-${item.key}`} marginLeft={gap} flexShrink={0} flexDirection="row">
            {parts.map((t, i) => (
              <Text key={`l-${item.key}-${i}`} color={t.color} bold wrap="truncate-end">
                {t.text}
              </Text>
            ))}
          </Box>
        )
      })

    // A status row for the focus timer and the weather: rain or snow falls across it.
    const fall = sky === 'rain' || sky === 'storm' ? sky : sky === 'snow' || season.snow ? 'snow' : null
    const secs = Math.ceil((focusLeft * TICK_MS) / 1000)
    const timer = focusLeft > 0 ? `🍅 ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} focus ` : ''
    const icon = sky !== 'none' ? WEATHER_ICON[sky as keyof typeof WEATHER_ICON] : night ? '☾' : ''
    const showStatus = focusLeft > 0 || fall !== null || sky !== 'none'
    const spare = Math.max(0, e.props.bodyColumns - timer.length - icon.length - 3)
    const drops = fall ? particles(spare, list[0]?.frame ?? 0, fall) : ' '.repeat(spare)
    const status = showStatus ? (
      <Box key="pet-status" flexDirection="row" height={1}>
        {timer ? <Text color="warning">{timer}</Text> : null}
        <Text color={fall === 'snow' ? '#E8EEF5' : fall === 'storm' ? '#9AA9FF' : '#6CA0DC'}>{drops}</Text>
        {icon ? <Text color={night ? '#B8C0FF' : 'warning'}> {icon}</Text> : null}
      </Box>
    ) : null

    return (
      <Box flexDirection="column">
        {below}
        {status}
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
