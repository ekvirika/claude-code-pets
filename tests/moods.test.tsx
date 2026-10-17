import { expect, mock, test } from 'claude-code/testing'

import type { Pet } from '../types'
import { step } from '../hooks/register'
import type { World } from '../hooks/life'
import { CLAUDE_MOODS, USER_MOODS, USER_REACTIONS, asMood, parsePetTalk } from '../hooks/moods'
import { FIRST } from '../hooks/life'

const crew = [
  { id: 'a', name: 'Biscuit', species: 'dog' as const },
  { id: 'b', name: 'Pixel', species: 'cat' as const },
]
const world = (over: Partial<World> = {}): World => ({ width: 80, working: false, idle: 0, boss: false, ball: null, positions: {}, ...over })

test('reads what you say to the pets, and leaves real prompts alone', async () => {
  expect(parsePetTalk('Biscuit sit', crew)).toEqual({ ids: ['a'], command: 'sit', isOnlyPetTalk: true })
  expect(parsePetTalk("who's a good boy", crew)).toEqual({ ids: ['a', 'b'], command: 'praise', isOnlyPetTalk: true })
  expect(parsePetTalk('Pixel come here', crew)?.command).toBe('come')
  expect(parsePetTalk('everyone dance!', crew)?.ids).toEqual(['a', 'b'])
  // a pet's name in a real request still reaches Claude
  expect(parsePetTalk('Biscuit sit while I fix the build error in the login code please', crew)?.isOnlyPetTalk).toBe(false)
  // no name, no pet command: it's just a prompt
  expect(parsePetTalk('can you sit down and refactor this', crew)).toBe(undefined)
  expect(parsePetTalk('which is the best one?', crew)).toBe(undefined)
  expect(parsePetTalk('/pet feed', crew)).toBe(undefined)
})

test('turns a classifier answer into a mood, falling back to neutral', async () => {
  expect(asMood('Frustrated', USER_MOODS)).toBe('frustrated')
  expect(asMood('grateful.', USER_MOODS)).toBe('grateful')
  expect(asMood('banana', USER_MOODS)).toBe('neutral')
  expect(asMood(undefined, CLAUDE_MOODS)).toBe('neutral')
  expect(USER_REACTIONS.frustrated?.kind).toBe('comfort')
  expect(USER_REACTIONS.neutral).toBe(undefined)
})

test('gathering: a pet walks to its spot, sits there, then goes back to walking', async () => {
  let p: Pet = { ...FIRST, x: 10, dir: 1, mood: 'gather', chasing: 'spot:20', moodTicks: 15 }
  for (let i = 0; i < 10; i++) p = step(p, world(), 0.5)
  expect(p.x).toBe(20)
  expect(p.mood).toBe('gather')
  for (let i = 0; i < 10; i++) p = step(p, world(), 0.5)
  expect(p.mood).toBe('walk')
  expect(p.chasing).toBe(null)
})

test('in a session: pet talk stays with the pets, moods are read off the prompt path', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  const asked: string[][] = []
  on('model.classify', ($, e) => {
    asked.push([...e.labels])
    return { value: e.labels.includes('frustrated') ? 'frustrated' : 'question' } as never
  })
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', () => ({ cwd: '/x' }))
  await $.session.start({ cwd: '/x' } as never)

  const sat = await $.prompt.submit({ text: 'Biscuit sit', origin: { kind: 'composer' }, wait: false } as never)
  expect(sat.drop).toContain('Biscuit sat down')
  expect(asked.length).toBe(0)

  const real = await $.prompt.submit({ text: 'ugh why is this STILL broken', origin: { kind: 'composer' }, wait: false } as never)
  expect(real.drop).toBe(undefined)
  await clock.advance(5)
  expect(asked.length).toBe(1)
  expect(asked[0]).toContain('frustrated')

  // moods off: no more AI checks
  await $.command.run({ command: 'pet', args: 'moods off' } as never)
  await $.prompt.submit({ text: 'this is so annoying', origin: { kind: 'composer' }, wait: false } as never)
  await clock.advance(5)
  expect(asked.length).toBe(1)
})
