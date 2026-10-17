import { expect, mock, test } from 'claude-code/testing'

import { keysUpTo, limitAlerts, limitLines, resetText, windowName } from '../hooks/limits'

const RESET = '2026-10-17T20:00:00Z'
const NOW = Date.parse('2026-10-17T17:55:00Z')

test('usage limits: bark once per level per window, highest level first', async () => {
  expect(limitAlerts([{ kind: 'five_hour', percentUsed: 79.9, resetsAt: RESET }], [])).toEqual([])
  const [a] = limitAlerts([{ kind: 'five_hour', percentUsed: 81, resetsAt: RESET }], [])
  expect(a!.level).toBe(80)
  expect(a!.window).toBe('5-hour limit')
  // Already barked at 80: no more until 95.
  expect(limitAlerts([{ kind: 'five_hour', percentUsed: 90, resetsAt: RESET }], keysUpTo(a!))).toEqual([])
  const [b] = limitAlerts([{ kind: 'five_hour', percentUsed: 96, resetsAt: RESET }], keysUpTo(a!))
  expect(b!.level).toBe(95)
  // A jump straight to 100 barks once, and covers 80 and 95 too.
  const [c] = limitAlerts([{ kind: 'seven_day', percentUsed: 100, resetsAt: RESET }], [])
  expect(c!.level).toBe(100)
  expect(keysUpTo(c!).length).toBe(3)
  // The next window (a new reset time) starts fresh.
  expect(limitAlerts([{ kind: 'five_hour', percentUsed: 85, resetsAt: '2026-10-18T01:00:00Z' }], keysUpTo(a!)).length).toBe(1)
  expect(windowName('seven_day')).toBe('weekly limit')
})

test('usage limits: what the pets say', async () => {
  expect(resetText(RESET, NOW)).toBe('back in 2h 05m')
  expect(resetText(undefined, NOW)).toBe('')
  const [out] = limitAlerts([{ kind: 'five_hour', percentUsed: 100, resetsAt: RESET }], [])
  expect(limitLines(out!, NOW).say).toContain('nap time')
  expect(limitLines(out!, NOW).toast).toContain("You've hit your 5-hour limit. Claude is back in 2h 05m.")
  const [warn] = limitAlerts([{ kind: 'five_hour', percentUsed: 82, resetsAt: RESET }], [])
  expect(limitLines(warn!, NOW).toast).toContain('It resets in 2h 05m.')
})

test('in a session: the pets bark when the 5-hour limit runs low, once', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  const toasts: string[] = []
  on('command.register', () => ({ value: undefined }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: 'no PR' } }) as never)
  on('ui.toast', (_$, e) => {
    toasts.push(e.text)
    return { value: undefined } as never
  })
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('session.start', () => ({ cwd: '/x' }))
  await $.session.start({ cwd: '/x' } as never)
  const measure = (percentUsed: number) =>
    $.session.measure({ context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt: RESET }], changed: ['rateLimits'] } as never)

  await measure(50)
  expect(toasts.filter(t => t.includes('limit')).length).toBe(0)
  await measure(83)
  await measure(84)
  expect(toasts.filter(t => t.includes('80% of your 5-hour limit')).length).toBe(1)
  await measure(100)
  expect(toasts.some(t => t.includes("You've hit your 5-hour limit"))).toBe(true)

  expect((await $.command.run({ command: 'pet', args: 'limits off' } as never)).text).toContain('weekly limit): off')
})
