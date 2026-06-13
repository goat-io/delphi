import { useEffect, useState, useRef } from 'react'
import { useIsMobile } from '../useIsMobile.js'

/* Pulse keyframe (once) */
const PULSE_ID = 'missions-pulse'
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(PULSE_ID)) return
  const el = document.createElement('style')
  el.id = PULSE_ID
  el.textContent =
    '@keyframes mPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.35)}}'
  document.head.appendChild(el)
}

/* Turn coverage "gaps" into a plain statement of what the area is working toward. */
function humanizeAim(gaps) {
  if (!gaps || gaps.length === 0) return 'Needs more research'
  const g = gaps.join(' ').toLowerCase()
  const parts = []
  const q = /(\d+)\s+unanswered question/.exec(g)
  if (q) parts.push(`Answering ${q[1]} open questions`)
  if (/sparse evidence|no evidence/.test(g)) parts.push('Needs more supporting evidence')
  if (/few beliefs/.test(g)) parts.push('Building core understanding')
  if (parts.length === 0 && /low confidence/.test(g))
    parts.push('Strengthening confidence in what it knows')
  if (parts.length === 0 && /(no index|shallow index)/.test(g))
    parts.push('Organizing what it has learned')
  return parts.slice(0, 2).join(' · ') || 'Deepening understanding'
}

/* "COVERAGE_GAP — Spec" -> "Spec" */
function regionOfAgent(a) {
  const m = /—\s*(.+)$/.exec(a?.objective || '')
  return m ? m[1].trim() : null
}

function fmtDur(sec) {
  if (sec == null) return null
  const s = Math.max(0, Math.round(sec))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m${s % 60}s` : `${s}s`
}

/**
 * Derive a verbal direction verdict from the current overall score and a history
 * of cycle records (oldest first, each with a numeric `overall` or derived score).
 * Accepts either raw number[] or cycle objects with an `overall` field.
 * Returns { label, color, arrow, delta } or null.
 */
function deriveDirection(overall, history) {
  if (!history || history.length < 2) return null
  // history may be number[] (in-session accumulation) or cycle objects
  const extract = v => (typeof v === 'number' ? v : (typeof v?.overall === 'number' ? Math.round(v.overall * 100) : null))
  const values = history.map(extract).filter(v => v !== null)
  if (values.length < 2) return null
  const prev = values[values.length - 2]
  const curr = values[values.length - 1]
  const delta = curr - prev
  if (Math.abs(delta) < 1) return { label: 'holding steady', color: '#7f8aa3', arrow: '→', delta: 0 }
  if (delta > 0) return { label: `climbing (+${delta}% last cycle)`, color: '#a6e3a1', arrow: '↑', delta }
  return { label: `slipping (${delta}% last cycle)`, color: '#f38ba8', arrow: '↓', delta }
}

/* One mission row: an area of the repo and the outcome it's moving toward. */
function MissionRow({ m, isMobile }) {
  const pct = Math.round(m.score * 100)
  const targetPct = Math.round(m.target * 100)
  const barColor = m.solid ? '#a6e3a1' : m.active ? '#89b4fa' : '#f9e2af'
  const icon = m.solid ? '✓' : m.active ? null : '○'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        padding: '12px 0',
        borderBottom: '1px solid #161b26',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
        <span style={{ width: '14px', textAlign: 'center', flexShrink: 0 }}>
          {m.active ? (
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#89b4fa',
                animation: 'mPulse 1.4s ease-in-out infinite',
              }}
            />
          ) : (
            <span style={{ color: m.solid ? '#a6e3a1' : '#3d4559', fontSize: '13px' }}>{icon}</span>
          )}
        </span>
        <span style={{ color: '#e6edf3', fontSize: isMobile ? '15px' : '16px', fontWeight: 600 }}>
          {m.region}
        </span>
        <span style={{ flex: 1 }} />
        {m.active && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.4px',
              color: '#89b4fa',
              background: '#89b4fa18',
              border: '1px solid #89b4fa44',
              borderRadius: '4px',
              padding: '1px 6px',
            }}
          >
            IMPROVING NOW{m.elapsed ? ` · ${m.elapsed}` : ''}
          </span>
        )}
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', color: barColor, fontWeight: 700, width: '38px', textAlign: 'right' }}>
          {pct}%
        </span>
      </div>

      {/* progress bar toward the goal line */}
      <div style={{ position: 'relative', height: '7px', background: '#161b26', borderRadius: '4px', marginLeft: '23px' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: barColor, borderRadius: '4px', transition: 'width 400ms ease' }} />
        {/* Goal line — labeled so it reads without tooltip */}
        <div style={{ position: 'absolute', top: '-2px', bottom: '-2px', left: `${targetPct}%`, width: '2px', background: '#5a6477' }} />
        <span style={{
          position: 'absolute',
          left: `${targetPct}%`,
          top: '10px',
          transform: 'translateX(-50%)',
          fontSize: '9px',
          color: '#5a6477',
          whiteSpace: 'nowrap',
          fontFamily: 'ui-monospace, monospace',
        }}>goal</span>
      </div>

      {/* the plain outcome this area is moving toward — extra space for goal label */}
      <div style={{ marginLeft: '23px', marginTop: '6px', fontSize: '13px', color: m.solid ? '#6c7a89' : '#bac2de' }}>
        {m.solid
          ? '✓ Trustworthy — re-checked every cycle'
          : humanizeAim(m.gaps)}
      </div>
    </div>
  )
}

export function Missions({ state = {}, agents = [], live = {}, cycles = [] }) {
  const isMobile = useIsMobile()
  useEffect(() => {
    ensureStyle()
  }, [])

  // live-ticking for the "working now" elapsed
  const [, setTick] = useState(0)
  useEffect(() => {
    if (agents.length === 0) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [agents.length])

  // Track history of overall scores so we can show a trend arrow
  const historyRef = useRef([])

  const coverage = state?.coverage ?? []
  const target = state?.coverageTarget ?? 0.75

  // which areas have an agent on them right now
  const agentByRegion = {}
  for (const a of agents) {
    const r = regionOfAgent(a)
    if (r) agentByRegion[r] = a
  }
  if (live?.phase === 'run-agent' && live?.region && !(live.region in agentByRegion)) {
    agentByRegion[live.region] = null
  }

  const missions = coverage
    .map(c => {
      const region = c.regionTitle
      const active = region in agentByRegion
      const agent = agentByRegion[region]
      return {
        region,
        score: c.score ?? 0,
        target,
        gaps: c.gaps ?? [],
        solid: (c.score ?? 0) >= target,
        active,
        elapsed: agent ? fmtDur(agent.startedSec) : null,
      }
    })
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        Number(a.solid) - Number(b.solid) ||
        a.score - b.score,
    )

  const total = missions.length
  const solidCount = missions.filter(m => m.solid).length
  const activeCount = missions.filter(m => m.active).length
  const overall = total ? Math.round((missions.reduce((s, m) => s + m.score, 0) / total) * 100) : 0
  const targetPct = Math.round(target * 100)

  // Build history from cycles (oldest → newest), each cycle may carry an overall field.
  // Fall back to in-session accumulation when no cycle history is available.
  const cycleHistory = [...(cycles ?? [])].sort((a, b) => a.cycle - b.cycle)

  // Push current overall into in-session ref (deduped by value)
  if (total > 0) {
    const last = historyRef.current[historyRef.current.length - 1]
    if (last !== overall) historyRef.current.push(overall)
    if (historyRef.current.length > 10) historyRef.current = historyRef.current.slice(-10)
  }

  // Prefer cycle history for trend; fall back to in-session accumulation
  const trendSource = cycleHistory.length >= 2
    ? [...cycleHistory, overall]   // cycle objects + current value as number
    : historyRef.current
  const direction = deriveDirection(overall, trendSource)

  const isLoading = total === 0

  // Idle-but-not-working state description
  const idleLabel = (() => {
    const p = live?.phase ?? ''
    if (p === 'sleeping' || p === 'idle' || p === '') return 'Resting — will start the next check soon'
    if (p === 'stopped') return 'Not currently running'
    if (p === 'scan') return 'Looking for areas that need work'
    return null
  })()

  return (
    <section style={{ padding: isMobile ? '20px 16px' : '28px', borderBottom: '1px solid #1e2430' }}>
      {/* ── HERO ── short enough to stay above the fold at 375px */}
      <div style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>
        What Delphi is doing
      </div>
      <h1 style={{ color: '#e6edf3', fontSize: isMobile ? '18px' : '24px', fontWeight: 700, lineHeight: 1.35, margin: 0 }}>
        Continuously building and re-checking its own understanding — so it stays accurate as the design changes.
      </h1>
      <p style={{ color: '#5a6477', fontSize: '12px', marginTop: '6px', marginBottom: 0, lineHeight: 1.4 }}>
        It never "finishes" — every completed cycle triggers the next check.
      </p>

      {!isLoading && (
        <>
          {/* ── PRIMARY VERDICT: single X-of-N fraction ── */}
          <div style={{ marginTop: '18px' }}>
            {/* Big fraction — the ONE number that matters */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span style={{ color: '#e6edf3', fontSize: isMobile ? '30px' : '36px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>
                {solidCount} of {total}
              </span>
              <span style={{ color: '#7f8aa3', fontSize: isMobile ? '14px' : '15px', fontWeight: 500 }}>
                areas have trustworthy understanding
              </span>
            </div>

            {/* Direction verdict — C2: shown immediately, near the headline number */}
            <div style={{ marginBottom: '8px', minHeight: '22px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {direction ? (
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: direction.color,
                  background: direction.color + '18',
                  border: `1px solid ${direction.color}44`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                }}>
                  {direction.arrow} {direction.label}
                </span>
              ) : (
                <span style={{ color: '#5a6477', fontSize: '12px', fontStyle: 'italic' }}>
                  Trend available after 2 cycles
                </span>
              )}
              {activeCount > 0 && (
                <span style={{ color: '#89b4fa', fontSize: '12px' }}>
                  · {activeCount} area{activeCount > 1 ? 's' : ''} improving now
                </span>
              )}
              {activeCount === 0 && idleLabel && (
                <span style={{ color: '#7f8aa3', fontSize: '12px' }}>
                  · {idleLabel}
                </span>
              )}
            </div>

            {/* Progress bar with goal line — supporting detail below the verdict */}
            <div style={{ position: 'relative', height: '12px', background: '#161b26', borderRadius: '6px', marginBottom: '20px' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${overall}%`, background: 'linear-gradient(90deg,#89b4fa,#a6e3a1)', borderRadius: '6px', transition: 'width 400ms ease' }} />
              {/* Goal line labeled inline so no tooltip needed */}
              <div style={{ position: 'absolute', top: '-3px', bottom: '-3px', left: `${targetPct}%`, width: '2px', background: '#5a6477', borderRadius: '1px' }} />
              <span style={{
                position: 'absolute',
                left: `${targetPct}%`,
                top: '16px',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color: '#5a6477',
                whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, monospace',
              }}>
                target ({targetPct}%)
              </span>
            </div>
          </div>

          {/* ── AREAS BY KNOWLEDGE QUALITY ── */}
          <div style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '28px 0 4px' }}>
            Progress by area
          </div>
          <div>
            {missions.map(m => (
              <MissionRow key={m.region} m={m} isMobile={isMobile} />
            ))}
          </div>
        </>
      )}

      {isLoading && (
        <div style={{ marginTop: '18px' }}>
          <div style={{ color: '#3d4559', fontSize: '13px', marginBottom: '8px' }}>
            0% — no areas mapped yet. Waiting for the first scan to complete.
          </div>
          <div style={{ height: '12px', background: '#161b26', borderRadius: '6px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-3px', bottom: '-3px', left: `${Math.round((state?.coverageTarget ?? 0.75) * 100)}%`, width: '2px', background: '#5a6477', borderRadius: '1px' }} />
          </div>
        </div>
      )}
    </section>
  )
}

export default Missions
