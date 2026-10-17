// Watching your pull request through the GitHub CLI: new reviews and CI turning red or green.

export type Ci = 'none' | 'pending' | 'success' | 'failure'
export type PrSnapshot = { number: number; reviews: number; lastReviewer?: string; lastState?: string; ci: Ci }

type Check = { conclusion?: string | null; status?: string | null; state?: string | null }
type Review = { author?: { login?: string }; state?: string }

export function ciOf(checks: readonly Check[]): Ci {
  if (checks.length === 0) return 'none'
  const outcome = (c: Check) => (c.conclusion || c.state || '').toUpperCase()
  if (checks.some(c => ['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED'].includes(outcome(c)))) return 'failure'
  const pending = (c: Check) =>
    ['IN_PROGRESS', 'QUEUED', 'PENDING', 'WAITING', 'REQUESTED'].includes((c.status || '').toUpperCase()) ||
    (c.state || '').toUpperCase() === 'PENDING' ||
    (!c.conclusion && !c.state)
  if (checks.some(pending)) return 'pending'
  return 'success'
}

// `gh pr view --json number,reviews,statusCheckRollup` → what matters to the pets.
export function parsePr(json: string): PrSnapshot | undefined {
  try {
    const pr = JSON.parse(json) as { number?: number; reviews?: Review[]; statusCheckRollup?: Check[] }
    if (typeof pr.number !== 'number') return undefined
    const reviews = (pr.reviews ?? []).filter(r => r.state !== 'PENDING')
    const last = reviews[reviews.length - 1]
    return { number: pr.number, reviews: reviews.length, lastReviewer: last?.author?.login, lastState: last?.state, ci: ciOf(pr.statusCheckRollup ?? []) }
  } catch {
    return undefined
  }
}

export type PrEvent = { kind: 'review' | 'ci-fail' | 'ci-pass'; text: string }

export function prChanges(prev: PrSnapshot | undefined, next: PrSnapshot): PrEvent[] {
  // A different PR (you switched branches) is a fresh start, not news.
  if (!prev || prev.number !== next.number) return []
  const events: PrEvent[] = []
  if (next.reviews > prev.reviews) {
    const who = next.lastReviewer ? `@${next.lastReviewer}` : 'someone'
    const what = next.lastState === 'APPROVED' ? 'approved your PR! 🎉' : next.lastState === 'CHANGES_REQUESTED' ? 'wants changes' : 'left a review'
    events.push({ kind: 'review', text: `📬 ${who} ${what}` })
  }
  if (next.ci === 'failure' && prev.ci !== 'failure') events.push({ kind: 'ci-fail', text: 'CI is red 😱' })
  if (next.ci === 'success' && (prev.ci === 'pending' || prev.ci === 'failure')) events.push({ kind: 'ci-pass', text: 'CI is green ✅' })
  return events
}
