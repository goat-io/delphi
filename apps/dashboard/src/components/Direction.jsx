import { useEffect } from 'react'
import { useIsMobile } from '../useIsMobile.js'

/* pulse keyframe (once) */
const PID = 'direction-pulse'
function ensureStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(PID)) return
  const el = document.createElement('style')
  el.id = PID
  el.textContent = '@keyframes dPulse{0%,100%{opacity:1}50%{opacity:.45}}'
  document.head.appendChild(el)
}

const VERDICT = {
  advancing: { word: 'Advancing toward the vision', color: '#a6e3a1', dot: '#a6e3a1' },
  drifting: { word: 'Drifting', color: '#f9e2af', dot: '#f9e2af' },
  thrashing: { word: 'Churning', color: '#f38ba8', dot: '#f38ba8' },
  starting: { word: 'Just getting going', color: '#7f8aa3', dot: '#7f8aa3' },
}

/* A single vital sign — a pulse to read, not a target to hit. */
function Vital({ label, value, tone, isMobile }) {
  return (
    <div
      style={{
        flex: isMobile ? '1 1 45%' : 1,
        minWidth: isMobile ? 0 : 120,
        background: '#11141c',
        border: '1px solid #1e2430',
        borderRadius: '10px',
        padding: '12px 14px',
      }}
    >
      <div style={{ color: tone ?? '#e6edf3', fontSize: isMobile ? '17px' : '19px', fontWeight: 700 }}>
        {value}
      </div>
      <div style={{ color: '#7f8aa3', fontSize: '11px', marginTop: '3px', lineHeight: 1.35 }}>{label}</div>
    </div>
  )
}

export function Direction({ direction, isMobile: isMobileProp }) {
  const isMobileHook = useIsMobile()
  const isMobile = isMobileProp ?? isMobileHook
  useEffect(() => {
    ensureStyle()
  }, [])

  if (!direction) return null
  const v = VERDICT[direction.verdict] ?? VERDICT.starting
  const vit = direction.vitals
  const bets = direction.bets ?? []
  const aligned = bets.filter(b => b.aligned).length

  return (
    <section style={{ padding: isMobile ? '18px 16px 4px' : '26px 28px 6px' }}>
      <div
        style={{
          color: '#7f8aa3',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          marginBottom: '10px',
        }}
      >
        Are we moving the right way?
      </div>

      {/* The verdict — one glance answer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span
          style={{
            width: '11px',
            height: '11px',
            borderRadius: '50%',
            background: v.dot,
            flexShrink: 0,
            animation: direction.verdict === 'advancing' ? 'dPulse 1.8s ease-in-out infinite' : 'none',
          }}
        />
        <span style={{ color: v.color, fontSize: isMobile ? '20px' : '24px', fontWeight: 700 }}>{v.word}</span>
      </div>
      <p style={{ color: '#bac2de', fontSize: isMobile ? '13px' : '14px', lineHeight: 1.55, margin: '0 0 16px' }}>
        {direction.summary}
      </p>

      {/* Vital signs — the pulse */}
      {vit && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <Vital
            isMobile={isMobile}
            label="understanding (beliefs + evidence)"
            value={`${vit.understanding.delta >= 0 ? '+' : ''}${vit.understanding.delta}`}
            tone={vit.understanding.trend === 'up' ? '#a6e3a1' : vit.understanding.trend === 'down' ? '#f38ba8' : '#e6edf3'}
          />
          <Vital
            isMobile={isMobile}
            label="open questions resolved (net)"
            value={`${vit.questions.netResolved >= 0 ? '+' : ''}${vit.questions.netResolved}`}
            tone={vit.questions.netResolved >= 0 ? '#a6e3a1' : '#f9e2af'}
          />
          <Vital
            isMobile={isMobile}
            label={`cycles closing cleanly (${vit.convergence.closed}/${vit.convergence.total})`}
            value={`${vit.convergence.pct}%`}
            tone={vit.convergence.pct >= 70 ? '#a6e3a1' : vit.convergence.pct >= 50 ? '#f9e2af' : '#f38ba8'}
          />
          <Vital
            isMobile={isMobile}
            label="interpretations of “evolve” in play"
            value={vit.diversity.interpretations}
            tone={vit.diversity.interpretations > 1 ? '#89b4fa' : '#f9e2af'}
          />
        </div>
      )}

      {/* The bets — divergent interpretations, each traced to the manifesto */}
      {bets.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ color: '#7f8aa3', fontSize: '11px', marginBottom: '8px' }}>
            {aligned === bets.length
              ? `All ${bets.length} active directions trace to the manifesto:`
              : `${aligned}/${bets.length} active directions trace to the manifesto:`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {bets.map(b => (
              <div key={b.interpretation} style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ color: b.aligned ? '#a6e3a1' : '#f38ba8', fontSize: '12px', flexShrink: 0, width: '12px' }}>
                  {b.aligned ? '✓' : '✗'}
                </span>
                <span style={{ color: '#cdd6f4', fontSize: '12px', fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>
                  {b.interpretation}
                </span>
                <span style={{ color: '#7f8aa3', fontSize: '12px', lineHeight: 1.45 }}>
                  {b.lineage ? `→ ${b.lineage}` : '→ does not yet trace to the vision'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default Direction
