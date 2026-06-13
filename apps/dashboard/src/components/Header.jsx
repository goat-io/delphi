/** Header with title and live status pill */
export default function Header({ live }) {
  const running = live?.running ?? false
  const phase = live?.phase ?? 'idle'
  const tick = live?.tick ?? 0

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 28px',
      borderBottom: '1px solid #1e2430',
      background: '#11141c',
    }}>
      <div>
        <h1 style={{ color: '#e6edf3', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px' }}>
          Delphi · Evolution
        </h1>
        <p style={{ color: '#7f8aa3', fontSize: '12px', marginTop: '2px' }}>
          watching the system improve itself
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#171b26',
        border: '1px solid #1e2430',
        borderRadius: '20px',
        padding: '6px 14px',
      }}>
        {/* Pulsing dot */}
        <span style={{ position: 'relative', display: 'inline-flex', width: '10px', height: '10px' }}>
          <span style={{
            display: 'block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: running ? '#a6e3a1' : '#7f8aa3',
            animation: running ? 'pulse 2s infinite' : 'none',
          }} />
          {running && (
            <span style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: '#a6e3a1',
              opacity: 0.4,
              animation: 'ping 2s infinite',
            }} />
          )}
        </span>
        <span style={{ color: '#89b4fa', fontFamily: 'ui-monospace, monospace', fontSize: '12px', fontWeight: 600 }}>
          {phase}
        </span>
        <span style={{ color: '#7f8aa3', fontSize: '12px' }}>tick {tick}</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.4; }
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </header>
  )
}
