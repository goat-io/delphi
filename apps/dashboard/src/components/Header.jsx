import { useIsMobile } from '../useIsMobile.js'

/** Map raw internal phase tokens → plain human labels */
function humanizePhase(phase, running) {
  if (!phase || phase === 'idle' || phase === '') {
    return { label: 'Resting — next cycle soon', color: '#7f8aa3', dot: '#7f8aa3', animate: false }
  }
  if (phase === 'sleeping') {
    return { label: 'Resting — next cycle soon', color: '#7f8aa3', dot: '#7f8aa3', animate: false }
  }
  if (phase === 'stopped') {
    return { label: 'Not running', color: '#f38ba8', dot: '#f38ba8', animate: false }
  }
  if (phase === 'scan') {
    return { label: 'Scanning for areas to improve', color: '#89b4fa', dot: '#a6e3a1', animate: true }
  }
  if (phase === 'guard') {
    return { label: 'Checking safety before acting', color: '#89b4fa', dot: '#a6e3a1', animate: true }
  }
  if (phase === 'run-agent') {
    return { label: 'Improving knowledge right now', color: '#a6e3a1', dot: '#a6e3a1', animate: true }
  }
  if (phase === 'gate' || phase === 'review') {
    return { label: 'Reviewing what it learned', color: '#89b4fa', dot: '#a6e3a1', animate: true }
  }
  if (phase === 'commit' || phase === 'absorb') {
    return { label: 'Saving new understanding', color: '#cba6f7', dot: '#a6e3a1', animate: true }
  }
  if (phase === 'verify') {
    return { label: 'Verifying what it knows stays true', color: '#f9e2af', dot: '#a6e3a1', animate: true }
  }
  // fallback for unknown phases
  return { label: running ? 'Working' : 'Resting', color: running ? '#89b4fa' : '#7f8aa3', dot: running ? '#a6e3a1' : '#7f8aa3', animate: running }
}

/** Header with title and plain-English live status pill */
export default function Header({ live, generatedAt, sseOk }) {
  const isMobile = useIsMobile()
  const running = live?.running ?? false
  const phase = live?.phase ?? 'idle'

  const status = humanizePhase(phase, running)

  // Freshness label — reflects data file mtime when stale
  let freshnessLabel = ''
  if (generatedAt) {
    const ageMs = Date.now() - new Date(generatedAt).getTime()
    const ageMins = Math.floor(ageMs / 60000)
    if (ageMins < 1) {
      freshnessLabel = 'Updated just now'
    } else if (ageMins < 60) {
      freshnessLabel = `Updated ${ageMins}m ago`
    } else {
      const ageHrs = Math.floor(ageMins / 60)
      freshnessLabel = `Updated ${ageHrs}h ago`
    }
  } else if (!sseOk) {
    freshnessLabel = 'Live connection lost — retrying'
  }

  return (
    <header style={{
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      padding: isMobile ? '14px 16px' : '18px 28px',
      borderBottom: '1px solid #1e2430',
      background: '#11141c',
      gap: isMobile ? '8px' : '0',
    }}>
      <div>
        <h1 style={{
          color: '#e6edf3',
          fontSize: isMobile ? '17px' : '20px',
          fontWeight: 700,
          letterSpacing: '-0.3px',
        }}>
          Delphi · Evolution
        </h1>
        <p style={{ color: '#7f8aa3', fontSize: '12px', marginTop: '2px' }}>
          A system that continuously improves its own understanding
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '4px' }}>
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
              background: status.dot,
              animation: status.animate ? 'pulse 2s infinite' : 'none',
            }} />
            {status.animate && (
              <span style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: status.dot,
                opacity: 0.4,
                animation: 'ping 2s infinite',
              }} />
            )}
          </span>
          <span style={{ color: status.color, fontSize: '12px', fontWeight: 600 }}>
            {status.label}
          </span>
        </div>
        {freshnessLabel && (
          <span style={{ color: '#3d4559', fontSize: '10px', paddingRight: '4px' }}>
            {freshnessLabel}
          </span>
        )}
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
