import { expect, mock, test } from 'claude-code/testing'

import type { Pet } from '../types'
import { base64, rasterCells, svgSource } from '../hooks/paint'
import { FIRST, eatingSpot, feed, nap, parseAdopt, step, wake } from '../hooks/register'
import { laptopSpot, roll } from '../hooks/life'
import type { World } from '../hooks/life'
import { anchor, dress, fainted } from '../hooks/accessories'
import { react } from '../hooks/sass'
import { BOWL_FULL, BOWL_SKIN, BREEDS, H, MH, MW, SKINS, TH, TW, W, miniFrame, outlineOf, pixels, shrink, tinyFrame } from '../hooks/sprites'

const BAND = { component: 'AbovePrompt', requestId: 'band', props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 80, scroll: { offset: 0, bodyRows: 12 }, view: {} } } as const

const world = (over: Partial<World> = {}): World => ({ width: 80, working: false, idle: 0, boss: false, ball: null, positions: {}, ...over })
const run = (p: Pet, n: number, width = 80, working = false) => {
  for (let i = 0; i < n; i++) p = step(p, world({ width, working }), 0.5)
  return p
}

test('every breed has every pose at 16x12, and every skin fills every slot', async () => {
  expect(Object.keys(BREEDS.dog)).toEqual(['retriever', 'dachshund', 'corgi'])
  expect(Object.keys(BREEDS.cat)).toEqual(['shorthair', 'mainecoon', 'kitten'])
  for (const breeds of Object.values(BREEDS)) {
    for (const b of Object.values(breeds)) {
      for (const pose of ['walk', 'sit', 'sleep', 'happy', 'eat'] as const) {
        expect(b.poses[pose].length > 0).toBe(true)
        for (const f of b.poses[pose]) {
          expect(f.length).toBe(H)
          for (const row of f) expect(row.length).toBe(W)
        }
      }
    }
  }
  for (const skins of Object.values(SKINS)) {
    for (const s of Object.values(skins)) for (const k of ['B', 'D', 'L', 'E', 'N', 'P'] as const) expect(s[k]).toMatch(/^#[0-9A-F]{6}$/i)
  }
})

test('pets blink, breathe, hop and chew', async () => {
  const sit = BREEDS.dog.retriever!.poses.sit
  expect(sit.some(f => f.join('').includes('E'))).toBe(true)
  expect(sit.some(f => !f.join('').includes('E'))).toBe(true)
  const [up, down] = BREEDS.cat.kitten!.poses.happy
  expect(down![1]).toBe(up![0])
  const sleep = BREEDS.dog.corgi!.poses.sleep
  expect(sleep[0]).not.toEqual(sleep[sleep.length - 1])
  const [chewA, chewB] = BREEDS.dog.dachshund!.poses.eat
  expect(chewA).not.toEqual(chewB)
})

test('paints pets and bowls in half blocks and svg, with outlines', async () => {
  expect(base64(new Uint8Array([1, 2, 3, 4]))).toBe('AQIDBA==')
  const grid = pixels(BREEDS.dog.retriever!.poses.walk[0]!, SKINS.dog.golden!, 1)
  expect(rasterCells(grid).length).toBe(Math.ceil((W * (H / 2) * 12) / 3) * 4)
  expect(svgSource(grid)).toContain('fill="#D9A15B"')
  const bowl = pixels(BOWL_FULL, BOWL_SKIN, 1)
  expect(bowl[0]!.length).toBe(8)
  expect(rasterCells(bowl).length).toBe(Math.ceil((8 * 2 * 12) / 3) * 4)
  expect(pixels(['B...............'], SKINS.dog.golden!, 1)[0]![1]).toBe(outlineOf(SKINS.dog.golden!))
  expect(outlineOf(SKINS.cat.black!)).toBe('#A8A8B3')
})

test('feeding: walks to the bowl, eats, is full and the bowl goes away', async () => {
  let p: Pet = { ...FIRST, x: 10, dir: 1, hunger: 5 }
  p = feed(p, 80)
  expect(p.bowl).toBe(29)
  expect(p.mood).toBe('toBowl')
  const spot = eatingSpot(p.x, p.bowl!, 80)
  expect(spot).toEqual({ x: 13, dir: 1 })
  p = run(p, 10)
  expect(p.mood).toBe('eat')
  expect(p.x).toBe(13)
  p = run(p, 30)
  expect(p.bowl).toBe(null)
  expect(p.hunger > 99).toBe(true)
  expect(p.bubble).toContain('yum')
  // a pet coming from the right eats facing left
  expect(eatingSpot(60, 30, 80)).toEqual({ x: 38, dir: -1 })
})

test('sleep: tired pets nap by themselves, nap on command, wake on command', async () => {
  let p: Pet = { ...FIRST, energy: 5 }
  p = step(p, world({ working: true }), 0.5)
  expect(p.mood).toBe('nap')
  expect(p.bubble).toContain('yawn')
  p = run(p, 50, 80, true)
  expect(p.mood).toBe('nap')
  expect(p.energy > 5).toBe(true)
  const napping = nap({ ...FIRST, energy: 100 })
  expect(run(napping, 100).mood).toBe('nap')
  expect(wake(napping).mood).toBe('happy')
  // hunger falls while awake
  expect(run({ ...FIRST, hunger: 50 }, 3000).hunger < 50).toBe(true)
})

test('reads breed, skin and name in any order', async () => {
  expect(parseAdopt('dog', ['dachshund', 'choco', 'Peanut'])).toEqual({ breed: 'dachshund', skin: 'choco', name: 'Peanut' })
  expect(parseAdopt('dog', ['corgi'])).toEqual({ breed: 'corgi', skin: 'corgi', name: undefined })
  expect(parseAdopt('cat', ['Mr', 'Fluff', 'maine', 'gray'])).toEqual({ breed: 'mainecoon', skin: 'gray', name: 'Mr Fluff' })
})

test('commands: adopt a breed, feed, sleep, wake, and the band draws pets and a bowl', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>other band</Text>
  })
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', () => ({ cwd: '/x' }))
  await $.session.start({ cwd: '/x' } as never)
  const added = await $.command.run({ command: 'pet', args: 'add cat kitten siamese Miso' } as never)
  expect(added.text).toContain('Siamese kitten')
  expect((await $.command.run({ command: 'pet', args: 'feed Miso' } as never)).text).toContain('Miso')
  expect((await $.command.run({ command: 'pet', args: 'sleep Biscuit' } as never)).text).toContain('Biscuit')
  expect((await $.command.run({ command: 'pet', args: 'wake all' } as never)).text).toContain('Rise and shine')
  const roster = await $.command.run({ command: 'pet', args: '' } as never)
  expect(roster.text).toMatch(/Miso: Kitten, Siamese · lv \d+ \w+ · food .* energy/)
  expect((await $.command.run({ command: 'pet', args: 'hat Miso crown' } as never)).text).toContain('crown')
  expect((await $.command.run({ command: 'pet', args: 'boss on' } as never)).text).toContain('look busy')
  const bossUi = await $.ui.mount({ plugin: 'prompt-pets', surface: 'terminal', ...BAND })
  expect((await bossUi.findAll({ type: 'Raster' })).length).toBe(4) // 2 pets, 2 laptops (toys are off by default)
  await bossUi.unmount()
  expect((await $.command.run({ command: 'pet', args: 'boss off' } as never)).text).toContain('off')
  expect((await $.command.run({ command: 'pet', args: 'ball' } as never)).text).toContain('Fetch')
  expect((await $.command.run({ command: 'pet', args: 'remove dog' } as never)).text).toContain('Biscuit went home')

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'prompt-pets', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: 'other band' })).toBeDefined()
    expect(await ui.find({ type: surface === 'terminal' ? 'Raster' : 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test('accessories sit on the head; fainting puts the pet on its back', async () => {
  const walk = BREEDS.dog.retriever!.poses.walk[0]!
  const eye = anchor(walk)
  const hatted = dress(walk, ['crown'])
  expect(hatted.length).toBe(H + 4)
  expect(hatted.slice(0, eye.row + 4).join('')).toContain('Y')
  const shades = dress(walk, ['shades'])
  expect(shades[eye.row]![eye.col]).toBe('G')
  const flat = fainted(walk)
  expect(flat.length).toBe(H)
  expect(flat[H - 1]).not.toMatch(/^\.+$/)
  expect(flat[0]).toMatch(/^\.+$/)
})

test('boss mode: everyone sits at a laptop looking busy', async () => {
  let p: Pet = { ...FIRST, x: 10, dir: 1 }
  p = step(p, world({ boss: true }), 0.001)
  expect(p.mood).toBe('work')
  expect(laptopSpot(p, 80)).toEqual({ x: 26, dir: 1 })
  expect(laptopSpot({ x: 70, dir: 1 }, 80)).toEqual({ x: 64, dir: -1 })
})

test('reactions: tests pass = party, fail = faint, blast radius = hide, small stuff = sass', async () => {
  expect(react('Bash', { command: 'npm test' }, true, '', 0.1)?.kind).toBe('party')
  expect(react('Bash', { command: 'pytest -q' }, false, '', 0.1)?.kind).toBe('faint')
  expect(react('Bash', { command: 'git commit -m x' }, true, '', 0.1)?.kind).toBe('party')
  expect(react('Bash', { command: 'rm -rf build' }, false, 'blast-radius: the user cancelled', 0.1)?.kind).toBe('hide')
  expect(react('Edit', { new_string: 'console.log(x)' }, true, '', 0.1)?.text).toContain('console.log')
  expect(react('Bash', { command: 'git push --force' }, true, '', 0.1)?.kind).toBe('quip')
  expect(react('Bash', { command: 'ls' }, true, '', 0.1)).toBe(undefined)
})

test('antics: zoomies are fast, chasers close in on the ball, the ball slows down', async () => {
  const zoomer = step({ ...FIRST, x: 10, dir: 1, mood: 'zoom', moodTicks: 10 }, world(), 0.5)
  expect(zoomer.x).toBe(12)
  const chaser = run({ ...FIRST, x: 0, dir: 1, mood: 'chase', chasing: 'ball' }, 1)
  expect(chaser.mood).toBe('walk')
  const toBall = step({ ...FIRST, x: 0, dir: 1, mood: 'chase', chasing: 'ball' }, world({ ball: { x: 40, vx: 0 } }), 0.5)
  expect(toBall.x).toBe(1)
  let b = { x: 2, vx: 3 }
  for (let i = 0; i < 200; i++) b = roll(b, 80)
  expect(b.vx).toBe(0)
})

test('mini art in the terminal, full art on desktop; name tags in your colors', async ($, on) => {
  for (const breeds of Object.values(BREEDS)) {
    for (const id of Object.keys(breeds)) {
      for (const pose of ['walk', 'sit', 'sleep', 'happy', 'eat', 'faint'] as const) {
        const sp = 'retriever' in breeds ? 'dog' : 'shorthair' in breeds ? 'cat' : 'fox'
        const f = miniFrame(sp, id, pose, 0)
        expect(f.length).toBe(MH)
        for (const row of f) expect(row.length).toBe(MW)
        const t = tinyFrame(sp, id, pose, 0)
        expect(t.length).toBe(TH)
        for (const row of t) expect(row.length).toBe(TW)
      }
    }
  }
  expect(miniFrame('cat', 'kitten', 'walk', 0).join('')).toContain('E')
  expect(shrink(BREEDS.dog.retriever!.poses.walk[0]!).length).toBe(6)

  mock.clock(on)
  mock.store(on)
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>other band</Text>
  })
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', () => ({ cwd: '/x' }))
  await $.session.start({ cwd: '/x' } as never)
  const cols = async (surface: 'terminal' | 'desktop') => {
    const ui = await $.ui.mount({ plugin: 'prompt-pets', surface, ...BAND })
    const el = (await ui.find({ type: surface === 'terminal' ? 'Raster' : 'Svg' })) as unknown as { props: { columns?: number; width?: number } }
    await ui.unmount()
    return el.props.columns ?? el.props.width
  }
  expect(await cols('terminal')).toBe(10)
  expect(await cols('desktop')).toBe(48)
  await $.command.run({ command: 'pet', args: 'size small' } as never)
  expect(await cols('terminal')).toBe(10)
  await $.command.run({ command: 'pet', args: 'size tiny' } as never)
  expect(await cols('terminal')).toBe(8)
  await $.command.run({ command: 'pet', args: 'size large' } as never)
  expect(await cols('terminal')).toBe(16)

  // name tags: on, colored, back to auto
  expect((await $.command.run({ command: 'pet', args: 'namecolor Biscuit pink' } as never)).text).toContain('pink')
  const ui = await $.ui.mount({ plugin: 'prompt-pets', surface: 'terminal', ...BAND })
  const tag = (await ui.find({ type: 'Text', text: 'Biscuit' })) as unknown as { props: { color: string } }
  expect(tag.props.color).toBe('#FF8CC6')
  await ui.unmount()
  expect((await $.command.run({ command: 'pet', args: 'namecolor Biscuit nope' } as never)).text).toContain('Colors:')
  expect((await $.command.run({ command: 'pet', args: 'names off' } as never)).text).toContain('off')
})

test('several sessions share one roster: a removal in one is not undone by another', async ($, on) => {
  mock.clock(on)
  const store = new Map<string, unknown>()
  on('store.get', ($, e) => ({ value: store.get((e as { key: string }).key) }) as never)
  on('store.set', ($, e) => {
    const { key, value } = e as { key: string; value: unknown }
    store.set(key, JSON.parse(JSON.stringify(value)))
    return { value: undefined } as never
  })
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', () => ({ cwd: '/x' }))
  await $.session.start({ cwd: '/x' } as never)
  await $.command.run({ command: 'pet', args: 'add cat Miso' } as never)
  const before = store.get('pets') as { rosterVersion: number; pets: Array<{ name: string }> }
  expect(before.pets.map(p => p.name)).toEqual(['Biscuit', 'Miso'])
  // another session removes Miso and writes a newer roster
  store.set('pets', { ...before, rosterVersion: before.rosterVersion + 1, pets: before.pets.filter(p => p.name !== 'Miso') })
  // this session's next save takes the newer roster instead of writing Miso back
  await $.command.run({ command: 'pet', args: 'feed' } as never)
  const after = store.get('pets') as { pets: Array<{ name: string }> }
  expect(after.pets.map(p => p.name)).toEqual(['Biscuit'])
  const roster = await $.command.run({ command: 'pet', args: '' } as never)
  expect(roster.text).not.toContain('Miso')
})
