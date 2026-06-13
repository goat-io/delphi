import Sparkline from './Sparkline.jsx'
import { useIsMobile } from '../useIsMobile.js'

/** Parse "key=value key2=value2" health string into object */
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

function StatCard({ label, value, sparkValues, color, format, isMobile }) {
  const displayValue = format ? format(value) : value?.toLocaleString() ?? '—'
  return (
    <div style={{
      background: '#171b26',
      border: '1px solid #1e2430',
      borderRadius: '10px',
      padding: isMobile ? '12px 14px' : '16px 18px',
      flex: isMobile ? '0 0 auto' : '1 1 140px',
      minWidth: isMobile ? '0' : '130px',
    }}>
      <div style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ color: '#e6edf3', fontSize: isMobile ? '22px' : '24px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
        {displayValue}
      </div>
      {sparkValues && sparkValues.length >= 2 && (
        <Sparkline values={sparkValues} color={color} width={isMobile ? 70 : 90} height={24} />
      )}
    </div>
  )
}

export default function BrainGrowth({ health, cycles }) {
  const isMobile = useIsMobile()

  // Build time series from cycles (oldest → newest)
  const sorted = [...(cycles ?? [])].sort((a, b) => a.cycle - b.cycle)

  const leavesTs = sorted.map(c => parseHealth(c.healthAfter).leaves ?? 0).filter(v => v > 0)
  const beliefsTs = sorted.map(c => parseHealth(c.healthAfter).beliefs ?? 0).filter(v => v > 0)
  const evidenceTs = sorted.map(c => parseHealth(c.healthAfter).evidence ?? 0).filter(v => v > 0)

  return (
    <section style={{ padding: isMobile ? '14px 16px' : '20px 28px', borderBottom: '1px solid #1e2430' }}>
      <h2 style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Brain Growth
      </h2>
      <div style={{
        display: isMobile ? 'grid' : 'flex',
        gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <StatCard label="Leaves" value={health?.leaves} sparkValues={leavesTs} color="#89b4fa" isMobile={isMobile} />
        <StatCard label="Beliefs" value={health?.beliefs} sparkValues={beliefsTs} color="#cba6f7" isMobile={isMobile} />
        <StatCard label="Evidence" value={health?.evidence} sparkValues={evidenceTs} color="#a6e3a1" isMobile={isMobile} />
        <StatCard
          label="Avg Conf"
          value={health?.avgConfidence}
          color="#f9e2af"
          format={v => v != null ? `${(v * 100).toFixed(1)}%` : '—'}
          isMobile={isMobile}
        />
        <StatCard label="Open Q" value={health?.openQuestions} color="#f38ba8" isMobile={isMobile} />
      </div>
    </section>
  )
}
