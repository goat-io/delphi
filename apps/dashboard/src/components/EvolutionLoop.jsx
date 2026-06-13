/** The evolution loop strip — 7 manifesto steps mapped to phases */
import { useIsMobile } from '../useIsMobile.js'

const STEPS = [
  { label: 'Understand', phases: ['scan'] },
  { label: 'Learn',      phases: ['scan'] },
  { label: 'Generate',   phases: ['guard'] },
  { label: 'Execute',    phases: ['run-agent'] },
  { label: 'Evaluate',   phases: ['gate', 'review'] },
  { label: 'Incorporate',phases: ['commit', 'absorb'] },
  { label: 'Repeat',     phases: ['verify', 'sleeping'] },
]

const IDLE_PHASES = ['sleeping', 'idle', 'stopped', '']

function isStepActive(step, phase) {
  return step.phases.includes(phase)
}

function isDimmed(phase) {
  return IDLE_PHASES.includes(phase)
}

export default function EvolutionLoop({ live }) {
  const isMobile = useIsMobile()
  const phase = live?.phase ?? 'idle'
  const dimAll = isDimmed(phase)

  return (
    <section style={{
      padding: isMobile ? '14px 16px' : '20px 28px',
      background: '#11141c',
      borderBottom: '1px solid #1e2430',
    }}>
      <h2 style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Evolution Loop
      </h2>
      {/* Horizontally scrollable strip — works well on both mobile and desktop */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '6px',
        /* Hide scrollbar visually but keep scroll */
        scrollbarWidth: 'thin',
        scrollbarColor: '#1e2430 transparent',
      }}>
        {STEPS.map((step, i) => {
          const active = !dimAll && isStepActive(step, phase)
          const phaseLabel = step.phases.join(' | ')

          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: isMobile ? '8px 10px' : '10px 16px',
                borderRadius: '10px',
                border: `1px solid ${active ? '#89b4fa' : '#1e2430'}`,
                background: active ? 'rgba(137,180,250,0.08)' : dimAll ? 'rgba(255,255,255,0.01)' : '#171b26',
                minWidth: isMobile ? '76px' : '100px',
                transition: 'all 0.3s ease',
                boxShadow: active ? '0 0 18px rgba(137,180,250,0.25), 0 0 6px rgba(137,180,250,0.15)' : 'none',
                opacity: dimAll ? 0.35 : 1,
              }}>
                <span style={{
                  color: active ? '#89b4fa' : '#7f8aa3',
                  fontSize: isMobile ? '11px' : '13px',
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '-0.2px',
                  transition: 'color 0.3s ease',
                  whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </span>
                <span style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '9px',
                  color: active ? '#89b4fa' : '#3d4559',
                  transition: 'color 0.3s ease',
                  whiteSpace: 'nowrap',
                }}>
                  {phaseLabel}
                </span>
                {active && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#89b4fa',
                    animation: 'loopPulse 1.5s infinite',
                    marginTop: '2px',
                  }} />
                )}
              </div>

              {i < STEPS.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 2px', opacity: dimAll ? 0.2 : 0.5, flexShrink: 0 }}>
                  <svg width="16" height="12" viewBox="0 0 20 12" fill="none">
                    <path d="M0 6 H14 M10 2 L14 6 L10 10" stroke="#89b4fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current raw phase label */}
      <div style={{ marginTop: '10px', color: '#7f8aa3', fontSize: '11px' }}>
        current phase:{' '}
        <span style={{ fontFamily: 'ui-monospace, monospace', color: '#89b4fa' }}>{phase}</span>
        {live?.region && (
          <span style={{ marginLeft: '12px' }}>
            region: <span style={{ color: '#cba6f7' }}>{live.region}</span>
          </span>
        )}
      </div>

      <style>{`
        @keyframes loopPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </section>
  )
}
