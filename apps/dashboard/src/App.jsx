import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from './components/Header.jsx'
import { Missions } from './components/Missions.jsx'
import EvolutionLoop from './components/EvolutionLoop.jsx'
import BrainGrowth from './components/BrainGrowth.jsx'
import Goals from './components/Goals.jsx'
import CycleFeed from './components/CycleFeed.jsx'
import KnowledgeGraph from './components/KnowledgeGraph.jsx'
import { useIsMobile } from './useIsMobile.js'

async function fetchSnapshot() {
  const res = await fetch('/api/snapshot')
  if (!res.ok) throw new Error(`snapshot ${res.status}`)
  return res.json()
}

export default function App() {
  const isMobile = useIsMobile()
  const [liveData, setLiveData] = useState(null)
  const [sseOk, setSseOk] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const esRef = useRef(null)

  // Polling fallback (used when SSE is unavailable)
  const { data: polledData } = useQuery({
    queryKey: ['snapshot'],
    queryFn: fetchSnapshot,
    enabled: !sseOk,
    refetchInterval: 5000,
  })

  // Initial load via snapshot always
  const { data: initialData } = useQuery({
    queryKey: ['snapshot-init'],
    queryFn: fetchSnapshot,
    staleTime: Infinity,
  })

  // Merge: prefer live SSE data, fall back to polled, then initial
  const snapshot = liveData ?? polledData ?? initialData

  // SSE connection
  useEffect(() => {
    let retryTimer = null

    function connect() {
      if (esRef.current) {
        esRef.current.close()
      }
      const es = new EventSource('/api/stream')
      esRef.current = es

      es.addEventListener('update', (e) => {
        try {
          const data = JSON.parse(e.data)
          setLiveData(data)
          setSseOk(true)
        } catch {
          // ignore parse errors
        }
      })

      es.onerror = () => {
        es.close()
        esRef.current = null
        setSseOk(false)
        // Retry SSE after 10s
        retryTimer = setTimeout(connect, 10000)
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimer)
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [])

  const state = snapshot?.state
  const cycles = snapshot?.cycles ?? []
  const live = snapshot?.live ?? {}
  const agents = snapshot?.agents ?? []

  return (
    <div style={{ minHeight: '100vh', background: '#0b0e14' }}>
      <Header live={live} />

      <main style={{
        maxWidth: isMobile ? '100%' : '1400px',
        margin: '0 auto',
        overflowX: 'hidden',
      }}>
        {/* The whole story: what we're achieving + the parallel missions. */}
        <Missions state={state} agents={agents} live={live} />

        {/* Everything below is the machinery — hidden by default. */}
        <div style={{ padding: isMobile ? '14px 16px' : '16px 28px' }}>
          <button
            type="button"
            onClick={() => setShowDetails(s => !s)}
            style={{
              background: 'transparent',
              border: '1px solid #1e2430',
              borderRadius: '8px',
              color: '#7f8aa3',
              fontSize: '12px',
              padding: '8px 14px',
              minHeight: '36px',
              cursor: 'pointer',
            }}
          >
            {showDetails ? '▾ Hide the machinery' : '▸ Show the machinery (loop, metrics, history)'}
          </button>
        </div>

        {showDetails && (
          <>
            <EvolutionLoop live={live} />
            <BrainGrowth health={state?.health} cycles={cycles} />
            <Goals goals={state?.goals} />
            <CycleFeed cycles={cycles} />
            <KnowledgeGraph />
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: isMobile ? '12px 16px' : '16px 28px',
        borderTop: '1px solid #1e2430',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '4px',
      }}>
        <span style={{ color: '#3d4559', fontSize: '11px', fontFamily: 'ui-monospace, monospace' }}>
          Delphi Evolution Dashboard
        </span>
        <span style={{ color: '#3d4559', fontSize: '11px' }}>
          {snapshot?.generatedAt
            ? `snapshot ${new Date(snapshot.generatedAt).toLocaleTimeString()}`
            : sseOk ? 'connected via SSE' : 'polling /api/snapshot'
          }
        </span>
      </footer>
    </div>
  )
}
