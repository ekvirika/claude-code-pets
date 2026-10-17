// What the pets make of what Claude does. Canned lines only: no model calls, no cost.

export type Reaction = { kind: 'party' | 'faint' | 'hide' | 'quip'; text: string }

const TESTS = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\bpytest\b|\bjest\b|\bvitest\b|\bgo test\b|\bcargo test\b|\bmocha\b|\brspec\b|\bplugin test\b|\bmake test\b/
const COMMIT = /\bgit\s+commit\b/

export const CORPORATE = [
  'per my last email…',
  "let's circle back",
  'quick sync?',
  'synergy!',
  "let's take this offline",
  'LGTM 👍',
  'ship it',
  'moving the needle',
  'low-hanging fruit',
  'can you see my screen?',
  "you're on mute",
  'action items!',
  'touching base',
  'bandwidth is tight',
  'let me loop in legal',
]

const pick = (lines: readonly string[], roll: number) => lines[Math.floor(roll * lines.length) % lines.length]!

const str = (v: unknown) => (typeof v === 'string' ? v : '')

// Reads a finished tool call: big moments get a reaction, small ones a quip, most nothing.
export function react(tool: string, input: Record<string, unknown>, ok: boolean, denial: string, roll: number): Reaction | undefined {
  const command = str(input.command)
  if (denial && /blast-radius|destructive/i.test(denial)) return { kind: 'hide', text: pick(['😱', 'NOT THE FILES', 'hide!!', 'nope nope nope'], roll) }
  if (tool === 'Bash' && TESTS.test(command)) {
    return ok
      ? { kind: 'party', text: pick(['TESTS PASS! 🎉', 'all green! 🎉', 'flawless 💅', 'ship it! 🚀'], roll) }
      : { kind: 'faint', text: pick(['x_x', '*faints*', 'red… so much red', 'it was working yesterday'], roll) }
  }
  if (tool === 'Bash' && COMMIT.test(command) && ok) return { kind: 'party', text: pick(['committed! 🎉', 'into the history books', 'git gud 😎'], roll) }

  const quips: string[] = []
  const added = str(input.new_string) + str(input.content)
  if (tool === 'Bash') {
    if (/push\b.*(--force|-f\b)/.test(command)) quips.push('living dangerously, I see', 'force push on a Friday?')
    else if (/\brm\s/.test(command)) quips.push('bye bye files 👋', 'deleting things. bold.')
    else if (/\b(npm|pnpm|yarn|bun)\s+(i|install|add)\b/.test(command)) quips.push('downloading half the internet', 'node_modules: now heavier than the sun')
    else if (/\bgit\s+push\b/.test(command)) quips.push('pushing to prod? 👀', 'off it goes')
    else if (/\bsudo\b/.test(command)) quips.push('sudo?? who are you')
    else if (!ok) quips.push('uh oh', 'have you tried turning it off and on again?', 'that looked expensive', 'error? never heard of her')
  } else if (/^(Edit|MultiEdit|Write)$/.test(tool)) {
    if (/console\.log|print\(|println!|fmt\.Print/.test(added)) quips.push('another console.log? bold.', 'debugging by print. classic.')
    else if (/TODO|FIXME|HACK/.test(added)) quips.push("a TODO. sure. 'later'.", 'future you will love that TODO')
    else if (/any\b/.test(added) && /:\s*any\b/.test(added)) quips.push('`any`? really?')
    else if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(added)) quips.push('empty catch block. brave.')
    else if (added.split('\n').length > 150) quips.push('that is a LOT of code', 'scrolling… still scrolling…')
  } else if (tool === 'Read' && roll < 0.15) {
    quips.push('reading the docs? who are you', 'ooh, reading')
  }
  if (quips.length === 0) return undefined
  return { kind: 'quip', text: pick(quips, roll) }
}
