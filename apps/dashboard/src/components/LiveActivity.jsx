import { useState, useEffect } from 'react'
import { useIsMobile } from '../useIsMobile.js'

/** Inject pulse keyframe once */
const STYLE_ID = 'live-activity-pulse'
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes laPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50%       { transform: scale(1.4); opacity: 0.7; }
    }
  `
  document.head.appendChild(el)
}

/** Pulsing colored dot */
function Dot({ color }) {
  return (
    <span style={{
      display: 'inline-block',
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      animation: 'laPulse 1.5s ease-in-out infinite',
    }} />
  )
}

const KIND_COLORS = {
  reading:     '#89b4fa',
  editing:     '#cba6f7',
  running:     '#f9e2af',
  searching:   '#94e2d5',
  delegating:  '#f5c2e7',
  researching: '#89dceb',
  thinking:    '#a6e3a1',
}
function kindColor(kind) {
  return KIND_COLORS[kind] ?? '#7f8aa3'
}

/** Format a DURATION in seconds as e.g. "3m12s" or "48s".
 * The server already sends startedSec/ageSec as elapsed durations (not
 * absolute timestamps), refreshed on every SSE update (~2s). */
function formatElapsed(durationSec) {
  if (durationSec == null) return null
  const diff = Math.max(0, Math.round(durationSec))
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return m > 0 ? `${m}m${s}s` : `${s}s`
}

/** basename of a file path */
function basename(p) {
  if (!p) return p
  return p.split('/').pop()
}

/** Small role chip */
function RoleChip({ role }) {
  const label = (role ?? '').toUpperCase() === 'EXPLORE' ? 'EXPLORE' : 'AGENT'
  const color = label === 'EXPLORE' ? '#94e2d5' : '#89b4fa'
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 700,
      fontFamily: 'ui-monospace, monospace',
      letterSpacing: '0.5px',
      color,
      background: `${color}18`,
      border: `1px solid ${color}44`,
      borderRadius: '4px',
      padding: '1px 5px',
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

/** Status badge for file chips */
function StatusTag({ status }) {
  if (status === '??' || status === 'A') {
    return (
      <span style={{ color: '#a6e3a1', fontSize: '9px', fontWeight: 700, marginLeft: '3px' }}>new</span>
    )
  }
  if (status === 'M') {
    return (
      <span style={{ color: '#f9e2af', fontSize: '9px', fontWeight: 700, marginLeft: '3px' }}>mod</span>
    )
  }
  if (status === 'D') {
    return (
      <span style={{ color: '#f38ba8', fontSize: '9px', fontWeight: 700, marginLeft: '3px' }}>del</span>
    )
  }
  return null
}

/** Single agent card */
function AgentCard({ agent, isMobile }) {
  const color = kindColor(agent.kind)
  const elapsed = formatElapsed(agent.startedSec)
  const ageSec = agent.ageSec != null ? Math.max(0, Math.round(agent.ageSec)) : null

  const note = agent.note
    ? (agent.note.length > 200 ? agent.note.slice(0, 200) + '…' : agent.note)
    : null

  return (
    <div style={{
      background: '#11141c',
      border: '1px solid #1e2430',
      borderRadius: '10px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      {/* Top row: dot + role + objective */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ paddingTop: '3px' }}>
          <Dot color={color} />
        </div>
        <RoleChip role={agent.role} />
        <div style={{ flex: 1, color: '#e6edf3', fontSize: '13px', fontWeight: 600, lineHeight: 1.4 }}>
          {agent.objective ?? '(working)'}
        </div>
        {/* Timing block — right-aligned on desktop; on mobile it wraps below */}
        {!isMobile && (
          <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {elapsed && (
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#cdd6f4', fontWeight: 600 }}>
                {elapsed}
              </span>
            )}
            {ageSec != null && (
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#3d4559' }}>
                updated {ageSec}s ago
              </span>
            )}
          </div>
        )}
      </div>

      {/* Timing row below objective on mobile */}
      {isMobile && (elapsed || ageSec != null) && (
        <div style={{ display: 'flex', gap: '10px', paddingLeft: '15px', flexWrap: 'wrap' }}>
          {elapsed && (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#cdd6f4', fontWeight: 600 }}>
              {elapsed}
            </span>
          )}
          {ageSec != null && (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', color: '#3d4559' }}>
              updated {ageSec}s ago
            </span>
          )}
        </div>
      )}

      {/* Action line */}
      {agent.action && (
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#7f8aa3', paddingLeft: '15px', wordBreak: 'break-all' }}>
          <span style={{ color: kindColor(agent.kind), marginRight: '6px' }}>{agent.kind ?? 'working'}</span>
          {agent.action}
        </div>
      )}

      {/* Note — the "what's being discussed" centerpiece */}
      {note && (
        <div style={{
          marginLeft: '15px',
          paddingLeft: '10px',
          borderLeft: `2px solid ${color}55`,
          color: '#cdd6f4',
          fontSize: '12px',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          {note}
        </div>
      )}
    </div>
  )
}

/** Build objective subtitle from live + state */
function buildObjective(live, state) {
  if (!live || (!live.trigger && !live.region)) return null

  const { trigger, region } = live

  if (trigger === 'COVERAGE_GAP') {
    const coverageTarget = state?.coverageTarget
    const coverageArr = state?.coverage ?? []
    const row = coverageArr.find(r => r.regionTitle === region)
    if (row) {
      const targetPct = coverageTarget != null ? Math.round(coverageTarget * 100) : '?'
      const nowPct = Math.round((row.score ?? 0) * 100)
      const gaps = Array.isArray(row.gaps) && row.gaps.length > 0 ? row.gaps.join(', ') : ''
      return `Raising ${region} coverage toward ${targetPct}% (now ${nowPct}%)${gaps ? ` — ${gaps}` : ''}`
    }
    return `Raising coverage in ${region ?? 'unknown'}`
  }
  if (trigger === 'OPEN_QUESTION') return `Investigating an open question in ${region ?? 'unknown'}`
  if (trigger === 'SPEC_GAP')     return `Filling a spec gap in ${region ?? 'unknown'}`
  if (trigger === 'GOAL_GAP')     return 'Closing a goal gap'
  if (trigger === 'EMPTY_REGION') return `Populating the ${region ?? 'unknown'} region`
  return `${trigger}${region ? ` · ${region}` : ''}`
}

export function LiveActivity({ agents = [], workingFiles = [], live = {}, state = {} }) {
  const isMobile = useIsMobile()

  // Ensure the keyframe animation style is injected
  useEffect(() => { ensureStyle() }, [])

  // Ticker so elapsed/age updates each second
  const [, setTick] = useState(0)
  useEffect(() => {
    if (agents.length === 0) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [agents.length])

  const count = agents.length
  const phase = live?.phase ?? ''
  const isIdle = ['sleeping', 'idle', 'stopped'].includes(phase)

  /* ── Status dot + label ── */
  let statusDotColor, statusLabel
  if (count > 0) {
    statusDotColor = '#a6e3a1'
    statusLabel = `${count} agent${count > 1 ? 's' : ''} working`
  } else if (isIdle) {
    statusDotColor = '#7f8aa3'
    statusLabel = 'Idle — watching for work'
  } else {
    statusDotColor = '#7f8aa3'
    statusLabel = 'spinning up…'
  }

  const objective = buildObjective(live, state)

  /* ── Cap agent list ── */
  const CAP = 50
  const visibleAgents = agents.slice(0, CAP)
  const overflow = agents.length - CAP

  /* ── Empty state ── */
  const isEmpty = count === 0 && workingFiles.length === 0

  return (
    <section style={{ padding: isMobile ? '14px 16px' : '20px 28px', borderBottom: '1px solid #1e2430' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: objective ? '4px' : '14px' }}>
        <h2 style={{
          color: '#7f8aa3',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: 0,
        }}>
          Live Activity
        </h2>

        {/* Count chip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: '#11141c',
          border: '1px solid #1e2430',
          borderRadius: '20px',
          padding: '2px 8px',
          minHeight: '28px',
        }}>
          <Dot color={statusDotColor} />
          <span style={{ color: '#cdd6f4', fontSize: '11px', fontWeight: 500 }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Objective subtitle */}
      {objective && (
        <div style={{ color: '#7f8aa3', fontSize: '12px', marginBottom: '14px', lineHeight: 1.5 }}>
          {objective}
        </div>
      )}

      {/* Empty state */}
      {isEmpty ? (
        <p style={{ color: '#3d4559', fontSize: '13px', textAlign: 'center', margin: '16px 0' }}>
          No agent is active right now. The loop scans for work about once a minute.
        </p>
      ) : (
        <>
          {/* Agent roster */}
          {count > 0 && (
            <div style={{
              maxHeight: isMobile ? '360px' : '420px',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: workingFiles.length > 0 ? '14px' : 0,
            }}>
              {visibleAgents.map((agent, i) => (
                <AgentCard key={agent.id ?? agent.name ?? i} agent={agent} isMobile={isMobile} />
              ))}
              {overflow > 0 && (
                <div style={{ color: '#7f8aa3', fontSize: '12px', textAlign: 'center', padding: '4px' }}>
                  +{overflow} more working
                </div>
              )}
            </div>
          )}

          {/* Files changing now */}
          {workingFiles.length > 0 && (
            <div>
              <div style={{
                color: '#7f8aa3',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '8px',
              }}>
                Changing Now
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {workingFiles.map((f, i) => {
                  const name = basename(f.path ?? f)
                  const fullPath = f.path ?? f
                  const status = f.status ?? null
                  return (
                    <span
                      key={i}
                      title={fullPath}
                      style={{
                        background: '#11141c',
                        border: '1px solid #1e2430',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '11px',
                        color: '#cdd6f4',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0',
                      }}
                    >
                      {name}
                      <StatusTag status={status} />
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default LiveActivity
