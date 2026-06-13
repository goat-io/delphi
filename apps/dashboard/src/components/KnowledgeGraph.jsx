import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const KIND_COLORS = {
  BELIEF: '#89b4fa',
  QUESTION: '#f9e2af',
  DECISION: '#a6e3a1',
  TASK: '#f38ba8',
  OBJECT: '#cba6f7',
  EVIDENCE: '#94e2d5',
  CONCEPT: '#fab387',
}

function kindColor(kind) {
  return KIND_COLORS[kind] ?? '#7f8aa3'
}

async function fetchGraph() {
  const res = await fetch('/api/graph?limit=250')
  if (!res.ok) throw new Error('graph fetch failed')
  return res.json()
}

function buildFlow(data) {
  if (!data) return { nodes: [], edges: [] }

  const COLS = 8
  const COL_W = 220
  const ROW_H = 80

  const nodes = (data.nodes ?? []).map((n, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const color = kindColor(n.kind)
    return {
      id: n.id,
      position: { x: col * COL_W, y: row * ROW_H },
      data: {
        label: (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color, fontWeight: 700, marginBottom: '2px' }}>{n.kind}</div>
            <div style={{ fontSize: '11px', color: '#cdd6f4', lineHeight: 1.3 }}>
              {n.title?.length > 30 ? n.title.slice(0, 30) + '…' : n.title}
            </div>
            {n.confidence != null && (
              <div style={{ fontSize: '9px', color: '#7f8aa3', marginTop: '2px' }}>
                {(n.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: '#171b26',
        border: `1.5px solid ${color}55`,
        borderRadius: '8px',
        padding: '6px 10px',
        color: '#cdd6f4',
        fontSize: '11px',
        minWidth: '140px',
      },
    }
  })

  const edges = (data.edges ?? []).map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.type,
    style: { stroke: '#2a3040', strokeWidth: 1 },
    labelStyle: { fill: '#3d4559', fontSize: '9px' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#2a3040', width: 12, height: 12 },
  }))

  return { nodes, edges }
}

export default function KnowledgeGraph() {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['graph'],
    queryFn: fetchGraph,
    enabled: open,
    staleTime: 60000,
  })

  const flow = buildFlow(data)

  return (
    <section style={{ padding: '0 28px 20px' }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 0',
          background: 'none',
          border: 'none',
          borderTop: '1px solid #1e2430',
          cursor: 'pointer',
          color: '#7f8aa3',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Knowledge Graph
          {data && (
            <span style={{ marginLeft: '8px', color: '#3d4559', fontWeight: 400 }}>
              ({data.nodes?.length ?? 0} nodes, {data.edges?.length ?? 0} edges)
            </span>
          )}
        </span>
        <span style={{ fontSize: '14px', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ height: '520px', borderRadius: '10px', border: '1px solid #1e2430', overflow: 'hidden', background: '#0d1018' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7f8aa3' }}>
              Loading graph…
            </div>
          ) : (
            <ReactFlowWrapper nodes={flow.nodes} edges={flow.edges} />
          )}
        </div>
      )}

      {/* Legend */}
      {open && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
          {Object.entries(KIND_COLORS).map(([kind, color]) => (
            <span key={kind} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#7f8aa3' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, display: 'inline-block' }} />
              {kind}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function ReactFlowWrapper({ nodes: initialNodes, edges: initialEdges }) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      style={{ background: '#0d1018' }}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1e2430" gap={20} />
      <Controls style={{ background: '#171b26', border: '1px solid #1e2430', borderRadius: '8px' }} />
      <MiniMap
        style={{ background: '#0b0e14', border: '1px solid #1e2430' }}
        nodeColor={n => '#89b4fa'}
        maskColor="rgba(11,14,20,0.7)"
      />
    </ReactFlow>
  )
}
