import { useIsMobile } from '../useIsMobile.js'

/** Region coverage horizontal bars */
export default function RegionCoverage({ coverage, regions, coverageTarget }) {
  const isMobile = useIsMobile()

  if (!coverage || coverage.length === 0) {
    return (
      <section style={{ padding: isMobile ? '14px 16px' : '20px 28px', borderBottom: '1px solid #1e2430' }}>
        <h2 style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Region Coverage
        </h2>
        <p style={{ color: '#3d4559', marginTop: '12px', fontSize: '13px' }}>No coverage data available</p>
      </section>
    )
  }

  const target = coverageTarget ?? 0.75

  // Sort ascending by score (worst first)
  const sorted = [...coverage].sort((a, b) => a.score - b.score)

  // Build leaf count lookup by title
  const leafByTitle = {}
  for (const r of (regions ?? [])) {
    leafByTitle[r.title] = r.leafCount
  }

  return (
    <section style={{ padding: isMobile ? '14px 16px' : '20px 28px', borderBottom: '1px solid #1e2430' }}>
      <h2 style={{ color: '#7f8aa3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
        Region Coverage
        <span style={{ marginLeft: '10px', color: '#3d4559', fontWeight: 400 }}>
          target <span style={{ color: '#f9e2af', fontFamily: 'ui-monospace, monospace' }}>{(target * 100).toFixed(0)}%</span>
        </span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sorted.map(region => {
          const meetsTarget = region.score >= target
          const barColor = meetsTarget ? '#a6e3a1' : '#f38ba8'
          const leafCount = leafByTitle[region.regionTitle] ?? null

          return (
            <div key={region.regionId ?? region.regionTitle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '2px' }}>
                <span style={{ color: '#cdd6f4', fontSize: '13px', fontWeight: 500 }}>
                  {region.regionTitle}
                  {leafCount != null && (
                    <span style={{ color: '#7f8aa3', fontSize: '11px', marginLeft: '8px' }}>
                      {leafCount.toLocaleString()} leaves
                    </span>
                  )}
                </span>
                <span style={{
                  color: meetsTarget ? '#a6e3a1' : '#f38ba8',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {region.score.toFixed(2)}
                </span>
              </div>

              {/* Bar track */}
              <div style={{
                position: 'relative',
                height: '8px',
                background: '#1e2430',
                borderRadius: '4px',
                overflow: 'visible',
              }}>
                {/* Score bar */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(region.score, 1) * 100}%`,
                  background: barColor,
                  borderRadius: '4px',
                  transition: 'width 0.6s ease',
                  opacity: 0.85,
                }} />

                {/* Target line */}
                <div style={{
                  position: 'absolute',
                  left: `${target * 100}%`,
                  top: '-3px',
                  bottom: '-3px',
                  width: '2px',
                  background: '#f9e2af',
                  borderRadius: '1px',
                  opacity: 0.7,
                }} />
              </div>

              {/* Gaps */}
              {region.gaps && region.gaps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {region.gaps.map((gap, i) => (
                    <span key={i} style={{
                      fontSize: '11px',
                      color: '#7f8aa3',
                      background: '#171b26',
                      border: '1px solid #1e2430',
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}>
                      {gap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
