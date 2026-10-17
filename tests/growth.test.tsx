import { expect, mock, test } from 'claude-code/testing'

import type { Pet } from '../types'
import { BADGES, bond, emptyStats, friendsOf, gainXp, levelLook, levelOf, newBadges, rivalsOf, xpBar, xpFor } from '../hooks/growth'
import { FIRST, bedSpot, spread, step } from '../hooks/life'
import type { World } from '../hooks/life'
import { BED_W, dim, isNight, particles, seasonOf, toySpots, weatherFromCode } from '../hooks/world'
import { ciOf, parsePr, prChanges } from '../hooks/watch'
import { dress } from '../hooks/accessories'
import { autoNameColor, colorName, parseColor } from '../hooks/tags'
import { BREEDS } from '../hooks/sprites'

const world = (over: Partial<World> = {}): World => ({ width: 120, working: false, idle: 0, boss: false, ball: null, positions: {}, ...over })
const pet = (over: Partial<Pet>): Pet => ({ ...FIRST, ...over })

test('levels: XP curve, looks, and level-ups announced once', async () => {
  expect([0, 30, 120, 270, 2430].map(levelOf)).toEqual([1, 2, 3, 4, 10])
  expect(levelOf(99_999)).toBe(10)
  expect(xpFor(3)).toBe(120)
  expect([1, 3, 6, 10].map(levelLook)).toEqual([undefined, 'collar', 'scarf', 'crown'])
  expect(xpBar(75, 10)).toBe('▰▰▰▰▰▱▱▱▱▱')
  const { pets, ups } = gainXp([pet({ id: 'a', name: 'Biscuit', xp: 25 }), pet({ id: 'b', name: 'Pixel', xp: 0 })], 10, p => p.id === 'a')
  expect(pets.map(p => p.xp)).toEqual([35, 0])
  expect(ups).toEqual([{ name: 'Biscuit', id: 'a', level: 2 }])
})

test('badges unlock from your history together', async () => {
  const s = { ...emptyStats(0), commits: 1, nightCommits: 1 }
  expect(newBadges(s, { maxLevel: 1, friends: 0 }, []).map(b => b.id)).toEqual(['first-commit', 'night-owl'])
  expect(newBadges(s, { maxLevel: 10, friends: 1 }, ['first-commit', 'night-owl']).map(b => b.id)).toEqual(['friends', 'legend'])
  expect(BADGES.length).toBe(13)
})

test('friendships grow minute by minute; rivals never bond', async () => {
  const a = pet({ id: 'a', name: 'A', x: 10, trait: 'chill' })
  const b = pet({ id: 'b', name: 'B', x: 20, trait: 'lazy' })
  const c = pet({ id: 'c', name: 'C', x: 15, trait: 'grumpy' })
  const d = pet({ id: 'd', name: 'D', x: 12, trait: 'hyper' })
  let bonds = {}
  let made: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = bond([a, b, c, d], bonds)
    bonds = r.bonds
    made = [...made, ...r.newFriends.map(([x, y]) => x.name + y.name)]
  }
  expect(made).toContain('AB')
  expect(made.some(m => m.includes('C') && m.includes('D'))).toBe(false)
  expect(friendsOf(a, [a, b, c, d], bonds).map(p => p.name)).toContain('B')
  expect(rivalsOf(c, [a, b, c, d]).map(p => p.name)).toEqual(['D'])
})

test('personalities: hyper pets zoom more, lazy pets get tired sooner', async () => {
  const hyper = step(pet({ trait: 'hyper', energy: 90 }), world(), 0.004)
  const chill = step(pet({ trait: 'chill', energy: 90 }), world(), 0.004)
  expect(hyper.mood).toBe('zoom')
  expect(chill.mood).not.toBe('zoom')
  expect(step(pet({ trait: 'lazy', energy: 20 }), world(), 0.5).mood).toBe('nap')
  expect(step(pet({ trait: 'chill', energy: 20 }), world(), 0.5).mood).not.toBe('nap')
})

test('focus naps everyone quietly; tired pets head to the bed; cats visit the post', async () => {
  const focused = step(pet({ mood: 'walk', bubble: 'hi', bubbleTicks: 9 }), world({ focus: true }), 0.5)
  expect(focused.mood).toBe('nap')
  expect(focused.bubble).toBe('')
  let tired = step(pet({ x: 40, energy: 5 }), world({ bed: 2 }), 0.5)
  expect(tired.chasing).toBe('bed')
  for (let i = 0; i < 40; i++) tired = step(tired, world({ bed: 2 }), 0.5)
  expect(tired.x).toBe(bedSpot(2, FIRST.id, 120 - 16))
  // pets get different places by the bed
  const spots = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(id => bedSpot(2, id, 200)))
  expect(spots.size > 1).toBe(true)
  expect([...spots].every(x => x >= 2 + BED_W)).toBe(true)
  expect(tired.mood).toBe('nap')
  const cat = step(pet({ species: 'cat', breed: 'shorthair', skin: 'ginger' }), world({ post: 100 }), 0.401)
  expect(cat.chasing).toBe('post')
})

test('level looks and seasons dress the pet', async () => {
  const walk = BREEDS.dog.retriever!.poses.walk[0]!
  expect(dress(walk, ['collar']).join('')).toContain('Y')
  expect(dress(walk, ['scarf']).join('')).toContain('V')
  expect(seasonOf(new Date(2026, 11, 20))).toMatchObject({ snow: true, santa: true, pumpkin: false })
  expect(seasonOf(new Date(2026, 9, 30))).toMatchObject({ pumpkin: true, santa: false })
  expect(seasonOf(new Date(2026, 5, 1))).toMatchObject({ snow: false, santa: false, pumpkin: false })
})

test('world: night, dimming, weather codes, falling rain and snow, toy spots', async () => {
  expect([22, 3, 12].map(isNight)).toEqual([true, true, false])
  expect(dim('#FFFFFF', 0.5)).toBe('#808080')
  expect([113, 296, 338, 389, 119, 999].map(weatherFromCode)).toEqual(['clear', 'rain', 'snow', 'storm', 'cloudy', 'none'])
  const rain = particles(60, 3, 'rain')
  expect(rain.length).toBe(60)
  expect(rain).toContain('╷')
  expect(particles(60, 3, 'snow')).toMatch(/[*·]/)
  expect(toySpots(120)).toEqual({ bed: 2, post: 114 })
})

test('PR watcher: reviews and CI changes become news, a new PR is a fresh start', async () => {
  expect(ciOf([])).toBe('none')
  expect(ciOf([{ conclusion: 'SUCCESS' }, { status: 'IN_PROGRESS' }])).toBe('pending')
  expect(ciOf([{ conclusion: 'FAILURE' }, { status: 'IN_PROGRESS' }])).toBe('failure')
  const before = parsePr(JSON.stringify({ number: 7, reviews: [], statusCheckRollup: [{ status: 'IN_PROGRESS' }] }))!
  const after = parsePr(JSON.stringify({ number: 7, reviews: [{ author: { login: 'ana' }, state: 'APPROVED' }], statusCheckRollup: [{ conclusion: 'SUCCESS' }] }))!
  expect(prChanges(before, after).map(e => e.kind)).toEqual(['review', 'ci-pass'])
  expect(prChanges(before, after)[0]!.text).toContain('@ana approved')
  expect(prChanges(undefined, after)).toEqual([])
  expect(prChanges({ ...before, number: 8 }, after)).toEqual([])
  expect(parsePr('no pull requests found')).toBe(undefined)
})

test('in a session: focus counts down and calls a break; stats and unsupported breeds', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  on('command.register', () => ({ value: undefined }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: 'no PR' } }) as never)
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.start', () => ({ cwd: '/x' }))
  await $.session.start({ cwd: '/x' } as never)

  const poodle = await $.command.run({ command: 'pet', args: 'add dog poodle' } as never)
  expect(poodle.text).toContain("poodle isn't a breed I can draw yet")
  expect(poodle.text).toContain('dog: retriever, dachshund, corgi')
  expect((await $.command.run({ command: 'pet', args: 'add dog retriever maltipoo Coco' } as never)).text).toContain('Maltipoo retriever')

  expect((await $.command.run({ command: 'pet', args: 'focus 1' } as never)).text).toContain('Focus for 1 min')
  await clock.advance(61_000)
  const stats = await $.command.run({ command: 'pet', args: 'stats' } as never)
  expect(stats.text).toContain('focus 1')
  expect(stats.text).toContain('Badges')
  expect(stats.text).toContain('Coco')
})

test('name tag colors: names, hex codes, auto, and a readable default for dark coats', async () => {
  expect(parseColor('pink')).toBe('#FF8CC6')
  expect(parseColor('#f80')).toBe('#FF8800')
  expect(parseColor('00ff00')).toBe('#00FF00')
  expect(parseColor('auto')).toBe(null)
  expect(parseColor('banana')).toBe(undefined)
  expect(colorName('#FF8CC6')).toBe('pink')
  expect(autoNameColor({ B: '#D9A15B', L: '#F6DDB3' })).toBe('#D9A15B')
  expect(autoNameColor({ B: '#24232A', L: '#3A3842' })).toBe('#C8C8D0')
})

test('spread: pets start evenly across the band, not in a heap', async () => {
  const heap = ['a', 'b', 'c', 'd', 'e'].map(id => pet({ id, x: 3 }))
  const xs = spread(heap, 200, () => 0.5).map(p => p.x)
  expect(new Set(xs).size).toBe(5)
  expect(Math.min(...xs) < 30).toBe(true)
  expect(Math.max(...xs) > 140).toBe(true)
  expect(xs.every(x => x >= 0 && x <= 184)).toBe(true)
})
