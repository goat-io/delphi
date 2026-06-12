import type { Candidate } from '@goatlab/delphi-protocol'

export function canonicalize(c: Candidate): Candidate {
  // Collapse internal whitespace and trim
  const normalizeText = (s: string) => s.replace(/\s+/g, ' ').trim()

  const title = (() => {
    let t = normalizeText(c.title)
    // No trailing punctuation except "?"
    t = t.replace(/[.,;:!]+$/, '')
    return t
  })()

  const statement = (() => {
    if (c.statement === undefined) {
      return undefined
    }
    let s = normalizeText(c.statement)
    // For BELIEF: ensure ends with "."
    if (c.kind === 'BELIEF') {
      if (!s.endsWith('.')) {
        s = `${s}.`
      }
    }
    return s
  })()

  // Dedupe aliases case-insensitively
  const seen = new Set<string>()
  const aliases = c.aliases.filter(a => {
    const key = a.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })

  return {
    ...c,
    title,
    ...(statement !== undefined ? { statement } : {}),
    aliases,
  }
}
