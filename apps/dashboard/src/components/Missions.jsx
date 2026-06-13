import { useEffect, useState } from 'react'
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
  if (!gaps || gaps.length === 0) return 'deepening understanding'
  const g = gaps.join(' ').toLowerCase()
  const parts = []
  const q = /(\d+)\s+unanswered question/.exec(g)
  if (q) parts.push(`answering ${q[1]} open questions`)
  if (/sparse evidence|no evidence/.test(g)) parts.push('gathering evidence')
  if (/few beliefs/.test(g)) parts.push('forming core beliefs')
  if (parts.length === 0 && /low confidence/.test(g))
    parts.push('strengthening confidence')
  if (parts.length === 0 && /(no index|shallow index)/.test(g))
    parts.push('building its index')
  return parts.slice(0, 2).join(' · ') || 'deepening understanding'
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
            WORKING NOW{m.elapsed ? ` · ${m.elapsed}` : ''}
          </span>
        )}
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', color: barColor, fontWeight: 700, width: '38px', textAlign: 'right' }}>
          {pct}%
        </span>
      </div>

      {/* progress toward the target */}
      <div style={{ position: 'relative', height: '7px', background: '#161b26', borderRadius: '4px', marginLeft: '23px' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: barColor, borderRadius: '4px', transition: 'width 400ms ease' }} />
        <div style={{ position: 'absolute', top: '-2px', bottom: '-2px', left: `${targetPct}%`, width: '2px', background: '#5a6477' }} title={`target ${targetPct}%`} />
      </div>

      {/* the plain outcome this area is moving toward */}
      <div style={{ marginLeft: '23px', fontSize: '13px', color: m.solid ? '#6c7a89' : '#bac2de' }}>
        {m.solid ? 'solid — meets the bar' : humanizeAim(m.gaps)}
      </div>
    </div>
  )
}

export function Missions({ state = {}, agents = [], live = {} }) {
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

  const isLoading = total === 0

  return (
    <section style={{ padding: isMobile ? '20px 16px' : '28px', borderBottom: '1px solid #1e2430' }}>
      {/* ── THE SUMMARY OF THE SUMMARY ── */}
      <div style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '10px' }}>
        What Delphi is trying to achieve
      </div>
      <h1 style={{ color: '#e6edf3', fontSize: isMobile ? '20px' : '26px', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
        Build a complete, evidence-backed understanding of its own design —
        then keep it true as the design evolves.
      </h1>

      {!isLoading && (
        <>
          {/* overall progress */}
          <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', height: '10px', background: '#161b26', borderRadius: '5px', flex: 1, minWidth: '180px' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${overall}%`, background: 'linear-gradient(90deg,#89b4fa,#a6e3a1)', borderRadius: '5px', transition: 'width 400ms ease' }} />
            </div>
            <span style={{ color: '#e6edf3', fontSize: '15px', fontWeight: 700 }}>{overall}% understood</span>
          </div>
          <div style={{ marginTop: '8px', color: '#7f8aa3', fontSize: '13px' }}>
            {solidCount} of {total} areas solid ·{' '}
            {activeCount > 0 ? (
              <span style={{ color: '#89b4fa' }}>
                {activeCount} being worked right now{activeCount > 1 ? ' in parallel' : ''}
              </span>
            ) : (
              <span>scanning for the next gap…</span>
            )}
          </div>

          {/* ── PARALLEL MISSIONS BY AREA ── */}
          <div style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '24px 0 4px' }}>
            Working toward · by area
          </div>
          <div>
            {missions.map(m => (
              <MissionRow key={m.region} m={m} isMobile={isMobile} />
            ))}
          </div>
        </>
      )}

      {isLoading && (
        <div style={{ marginTop: '18px', color: '#3d4559', fontSize: '13px' }}>
          Waiting for the first snapshot…
        </div>
      )}
    </section>
  )
}

export default Missions
