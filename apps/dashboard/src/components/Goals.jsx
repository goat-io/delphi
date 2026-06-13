import { useIsMobile } from '../useIsMobile.js'

/** Goals compact list */
export default function Goals({ goals }) {
  const isMobile = useIsMobile()

  if (!goals || goals.length === 0) {
    return (
      <section style={{ padding: isMobile ? '14px 16px' : '20px 28px', borderBottom: '1px solid #1e2430' }}>
        <h2 style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Goals
        </h2>
        <p style={{ color: '#3d4559', marginTop: '12px', fontSize: '13px' }}>No goals defined</p>
      </section>
    )
  }

  return (
    <section style={{ padding: isMobile ? '14px 16px' : '20px 28px', borderBottom: '1px solid #1e2430' }}>
      <h2 style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
        Goals
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {goals.map((goal, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '6px' : '10px',
            padding: '10px 14px',
            background: '#171b26',
            border: `1px solid ${goal.met ? 'rgba(166,227,161,0.2)' : '#1e2430'}`,
            borderRadius: '8px',
          }}>
            {/* Top row on mobile: icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              {/* Status dot */}
              <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>
                {goal.met ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="rgba(166,227,161,0.15)" stroke="#a6e3a1" strokeWidth="1.5" />
                    <path d="M5 8.5L7 10.5L11 6" stroke="#a6e3a1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="rgba(243,139,168,0.1)" stroke="#f38ba8" strokeWidth="1.5" />
                    <circle cx="8" cy="8" r="2.5" fill="#f38ba8" />
                  </svg>
                )}
              </span>

              {/* Title */}
              <span style={{ color: '#cdd6f4', fontSize: '13px', flex: 1 }}>
                {goal.title}
              </span>

              {/* Progress — inline on desktop, stays in flow on mobile */}
              {!isMobile && (
                <span style={{ color: '#7f8aa3', fontSize: '12px', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>
                  {goal.current} {goal.comparator} {goal.target}
                </span>
              )}
            </div>

            {/* Progress on its own line on mobile */}
            {isMobile && (
              <span style={{ color: '#7f8aa3', fontSize: '12px', fontFamily: 'ui-monospace, monospace', paddingLeft: '26px' }}>
                {goal.current} {goal.comparator} {goal.target}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
