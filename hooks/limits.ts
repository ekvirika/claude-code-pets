// Your plan's usage limits (the 5-hour and weekly windows): the pets bark when one runs low.

export type RateWindow = { kind: string; percentUsed: number; resetsAt?: string }
export type LimitLevel = 80 | 95 | 100
export type LimitAlert = { key: string; level: LimitLevel; window: string; resetsAt?: string }

const LEVELS: LimitLevel[] = [100, 95, 80]

export const windowName = (kind: string) =>
  kind === 'five_hour' ? '5-hour limit' : kind === 'seven_day' ? 'weekly limit' : kind === 'spend_limit' ? 'spend limit' : `${kind.replace(/_/g, ' ')} limit`

// The highest level each window has crossed that we haven't barked about yet in this window.
// A key carries the reset time, so the next window starts fresh.
export function limitAlerts(windows: readonly RateWindow[], warned: readonly string[]): LimitAlert[] {
  const alerts: LimitAlert[] = []
  for (const w of windows) {
    const level = LEVELS.find(l => w.percentUsed >= l)
    if (level === undefined) continue
    const key = `${w.kind}@${w.resetsAt ?? ''}:${level}`
    if (warned.includes(key)) continue
    alerts.push({ key, level, window: windowName(w.kind), resetsAt: w.resetsAt })
  }
  return alerts
}

// Every level at or below the one we barked about, so dropping back from 95 doesn't bark 80 again.
export function keysUpTo(alert: LimitAlert): string[] {
  const base = alert.key.slice(0, alert.key.lastIndexOf(':'))
  return LEVELS.filter(l => l <= alert.level).map(l => `${base}:${l}`)
}

export const BARK: Record<'dog' | 'cat' | 'fox', string> = { dog: 'WOOF! WOOF!', cat: 'MEOW!!', fox: 'YIP YIP!' }

export function resetText(resetsAt: string | undefined, now: number): string {
  if (!resetsAt) return ''
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return ''
  const mins = Math.max(0, Math.round((at - now) / 60_000))
  if (mins < 60) return `back in ${mins} min`
  if (mins < 48 * 60) return `back in ${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`
  return `back in ${Math.round(mins / (24 * 60))} days`
}

// What the lead pet says, and the toast.
export function limitLines(alert: LimitAlert, now: number): { say: string; toast: string } {
  const back = resetText(alert.resetsAt, now)
  if (alert.level === 100)
    return {
      say: `out of tokens! nap time 💤${back ? ` (${back})` : ''}`,
      toast: `🐶 You've hit your ${alert.window}.${back ? ` Claude is ${back}.` : ''} The pets are napping until then.`,
    }
  if (alert.level === 95)
    return { say: `95% of the ${alert.window}!! save some for me`, toast: `🐶 95% of your ${alert.window} is used.${back ? ` It resets ${back.replace('back ', '')}.` : ''}` }
  return { say: `psst… 80% of the ${alert.window} is gone`, toast: `🐶 80% of your ${alert.window} is used.${back ? ` It resets ${back.replace('back ', '')}.` : ''}` }
}
