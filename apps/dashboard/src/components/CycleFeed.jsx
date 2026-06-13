import { useState } from 'react'

/** Parse "key=value" health string */
function parseHealth(str) {
  if (!str) return {}
  const result = {}
  const re = /(\w+)=(\d+)/g
  let m
  while ((m = re.exec(str)) !== null) {
    result[m[1]] = parseInt(m[2], 10)
  }
  return result
}

function relativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TRIGGER_COLORS = {
  COVERAGE_GAP: '#89b4fa',
  OPEN_QUESTION: '#a6e3a1',
  GOAL_GAP: '#f9e2af',
  EMPTY_REGION: '#f38ba8',
  SPEC_GAP: '#cba6f7',
  MANUAL: '#94e2d5',
}

function triggerColor(trigger) {
  return TRIGGER_COLORS[trigger] ?? '#7f8aa3'
}

function CycleCard({ cycle }) {
  const [expanded, setExpanded] = useState(false)

  const before = parseHealth(cycle.healthBefore)
  const after = parseHealth(cycle.healthAfter)

  const leavesDelta = (after.leaves ?? 0) - (before.leaves ?? 0)
  const evidenceDelta = (after.evidence ?? 0) - (before.evidence ?? 0)
  const beliefsDelta = (after.beliefs ?? 0) - (before.beliefs ?? 0)

  const tColor = triggerColor(cycle.trigger)
  const isGreen = cycle.gate === 'GREEN'
  const isClosed = cycle.closure === 'CLOSED'
  const isComplete = cycle.outcome === 'COMPLETED'

  const summary = cycle.agentSummary ?? ''
  const truncated = summary.length > 160 && !expanded ? summary.slice(0, 160) + '…' : summary

  // Extract task short id from full task string
  const taskShort = cycle.task ? cycle.task.split('—')[0].trim() : ''

  return (
    <div style={{
      background: '#171b26',
      border: '1px solid #1e2430',
      borderRadius: '10px',
      padding: '14px 16px',
      position: 'relative',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ color: '#7f8aa3', fontSize: '12px', fontFamily: 'ui-monospace, monospace' }}>
          #{cycle.cycle}
        </span>
        <span style={{ color: '#3d4559', fontSize: '11px' }}>
          {relativeTime(cycle.timestamp)}
        </span>

        {/* Trigger badge */}
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: 'ui-monospace, monospace',
          color: tColor,
          background: `${tColor}18`,
          border: `1px solid ${tColor}44`,
          borderRadius: '4px',
          padding: '1px 7px',
        }}>
          {cycle.trigger}
        </span>

        {/* Gate badge */}
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: isGreen ? '#a6e3a1' : '#f38ba8',
          background: isGreen ? 'rgba(166,227,161,0.1)' : 'rgba(243,139,168,0.1)',
          border: `1px solid ${isGreen ? '#a6e3a144' : '#f38ba844'}`,
          borderRadius: '4px',
          padding: '1px 7px',
        }}>
          {cycle.gate ?? '—'}
        </span>

        {/* Closure badge */}
        {isClosed && (
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#94e2d5',
            background: 'rgba(148,226,213,0.08)',
            border: '1px solid rgba(148,226,213,0.25)',
            borderRadius: '4px',
            padding: '1px 7px',
          }}>
            CLOSED
          </span>
        )}

        {/* Commit hash */}
        {cycle.commit && (
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '11px',
            color: '#7f8aa3',
            background: '#11141c',
            border: '1px solid #1e2430',
            borderRadius: '4px',
            padding: '1px 6px',
          }}>
            {cycle.commit}
          </span>
        )}
      </div>

      {/* Task / region */}
      {taskShort && (
        <div style={{ color: '#7f8aa3', fontSize: '11px', fontFamily: 'ui-monospace, monospace', marginBottom: '6px', wordBreak: 'break-all' }}>
          {taskShort}
        </div>
      )}

      {/* Delta */}
      {(leavesDelta > 0 || evidenceDelta > 0 || beliefsDelta > 0) && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {leavesDelta > 0 && (
            <span style={{ color: '#89b4fa', fontSize: '12px', fontWeight: 600 }}>+{leavesDelta} leaves</span>
          )}
          {beliefsDelta > 0 && (
            <span style={{ color: '#cba6f7', fontSize: '12px', fontWeight: 600 }}>+{beliefsDelta} beliefs</span>
          )}
          {evidenceDelta > 0 && (
            <span style={{ color: '#a6e3a1', fontSize: '12px', fontWeight: 600 }}>+{evidenceDelta} evidence</span>
          )}
        </div>
      )}

      {/* Agent summary */}
      {summary && (
        <div style={{ color: '#7f8aa3', fontSize: '12px', lineHeight: 1.6 }}>
          {truncated}
          {summary.length > 160 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: 'none',
                border: 'none',
                color: '#89b4fa',
                cursor: 'pointer',
                fontSize: '12px',
                marginLeft: '4px',
                padding: 0,
              }}
            >
              {expanded ? 'less' : 'more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function CycleFeed({ cycles }) {
  const sorted = [...(cycles ?? [])].sort((a, b) => b.cycle - a.cycle).slice(0, 40)

  return (
    <section style={{ padding: '20px 28px', borderBottom: '1px solid #1e2430' }}>
      <h2 style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
        Cycle Feed
        <span style={{ marginLeft: '8px', color: '#3d4559', fontWeight: 400 }}>({sorted.length} shown)</span>
      </h2>

      {sorted.length === 0 ? (
        <p style={{ color: '#3d4559', fontSize: '13px' }}>No cycles yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map(cycle => (
            <CycleCard key={cycle.cycle} cycle={cycle} />
          ))}
        </div>
      )}
    </section>
  )
}
