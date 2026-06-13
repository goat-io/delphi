/**
 * Noise-question predicate for QUESTION leaf extraction.
 *
 * Returns true  → the text is noise (reject / skip).
 * Returns false → the text looks like a genuine interrogative question.
 *
 * Genuine questions are single, clean interrogative sentences ending in '?'
 * with a clear subject and no heading / list / frontmatter artefacts.
 */

/** RFC-section heading prefixes that appear in extraction noise. */
const RFC_HEADING_RE =
  /^(Core questions?|Examples?|Questions?|Decision answers?|Evaluation answers?|Ontology defines?|Indexes? answers?|Maps? answers?|[A-Z][a-z]+ answers?)\s*:/i

/**
 * isNoiseQuestion — true means "this is noise, reject it".
 */
export function isNoiseQuestion(text: string): boolean {
  const t = text.trim()

  // 1. Too short or too long
  if (t.length < 12 || t.length > 200) {
    return true
  }

  // 2. Frontmatter / heading separator
  if (t.includes('---')) {
    return true
  }

  // 3. List-dash artefacts: contains ' - ' (list separator) or starts with '-'
  if (t.startsWith('-') || t.includes(' - ')) {
    return true
  }

  // 4. RFC section-heading prefix  e.g. "Core questions:", "Examples:"
  if (RFC_HEADING_RE.test(t)) {
    return true
  }

  // 5. Colon followed immediately by a dash  ": -"  (heading → list artefact)
  if (/:\s*-/.test(t)) {
    return true
  }

  // 6. Colon followed by two consecutive title-cased words — heading list
  //    e.g. "Examples: Legal Argument Architecture Research"
  if (/:\s+[A-Z][a-z]+\s+[A-Z]/.test(t)) {
    return true
  }

  // 7. Strip a leading "Word:" prefix and inspect the remainder
  const withoutLeadingLabel = t.replace(/^[A-Z][a-zA-Z ]{1,30}:\s*/, '')

  // 8. Must end with '?' — check within the last 80 chars
  const tail = t.slice(-80)
  if (!tail.includes('?')) {
    return true
  }

  // 9. More than one '?' → likely a multi-question list fragment
  if ((t.match(/\?/g) ?? []).length > 1) {
    return true
  }

  // 10. After stripping any leading label, the remainder must have ≥ 3 words
  const wordCount = withoutLeadingLabel.trim().split(/\s+/).length
  if (wordCount < 3) {
    return true
  }

  // 11. A second colon inside the remaining text → heading artefact
  if ((withoutLeadingLabel.match(/:/g) ?? []).length >= 1) {
    return true
  }

  return false
}
