import { isNoiseQuestion } from '@goatlab/delphi-extraction'
import { describe, expect, it } from 'vitest'

describe('isNoiseQuestion', () => {
  // ── Noise cases (should return true = reject) ──────────────────────────────

  it('rejects "--- Decision answers: What should we do?" (frontmatter separator + RFC heading)', () => {
    expect(isNoiseQuestion('--- Decision answers: What should we do?')).toBe(
      true,
    )
  })

  it('rejects "Core questions: - Why do we believe this?" (RFC heading prefix)', () => {
    expect(isNoiseQuestion('Core questions: - Why do we believe this?')).toBe(
      true,
    )
  })

  it('rejects "- What breaks if it becomes false?" (starts with dash)', () => {
    expect(isNoiseQuestion('- What breaks if it becomes false?')).toBe(true)
  })

  it('rejects "--- Evaluation answers: How good is this?" (frontmatter separator)', () => {
    expect(isNoiseQuestion('--- Evaluation answers: How good is this?')).toBe(
      true,
    )
  })

  it('rejects "Examples: Legal Argument Architecture Research Design Strategy" (heading list, no ?)', () => {
    expect(
      isNoiseQuestion(
        'Examples: Legal Argument Architecture Research Design Strategy',
      ),
    ).toBe(true)
  })

  it('rejects long multi-artefact noise with --- and list dashes', () => {
    expect(
      isNoiseQuestion(
        'Ontology defines: - Types - Relationships - Validation Rules --- Capability answers: What can an agent do?',
      ),
    ).toBe(true)
  })

  it('rejects "Indexes answer: - What exists here?" (RFC heading + list dash)', () => {
    expect(isNoiseQuestion('Indexes answer: - What exists here?')).toBe(true)
  })

  // ── Genuine cases (should return false = keep) ─────────────────────────────

  it('keeps "Can TigerBeetle recover after node failure?"', () => {
    expect(isNoiseQuestion('Can TigerBeetle recover after node failure?')).toBe(
      false,
    )
  })

  it('keeps "How does Swedish law differ from EU law?"', () => {
    expect(isNoiseQuestion('How does Swedish law differ from EU law?')).toBe(
      false,
    )
  })
})
