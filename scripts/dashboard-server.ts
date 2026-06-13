// scripts/dashboard-server.ts — Read-only Evolution Dashboard API + SSE.
//
//   pnpm dashboard           # serves API on :7700 (+ built UI if present)
//
// Reads ONLY versioned flat files — never opens the live PGlite, so it never
// contends with the daemon's single-writer brain:
//   brain/evolution-state.json  governance snapshot (health/coverage/goals)
//   evolution.log.md            per-cycle history (the 7-step loop, committed)
//   daemon.out                  live in-flight phase of the current tick
//   brain/leaves.jsonl + relationships.jsonl   knowledge graph
//
// SSE (/api/stream) watches those files and pushes an `update` whenever the
// loop advances — so an external human watches evolution happen live.

import { execFileSync } from 'node:child_process'
import {
  closeSync,
  createReadStream,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  statSync,
  watchFile,
} from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import Fastify from 'fastify'

const CWD = process.cwd()
const PORT = Number(process.env.DASHBOARD_PORT ?? 7700)
const P = {
  state: resolve(CWD, 'brain', 'evolution-state.json'),
  log: resolve(CWD, 'evolution.log.md'),
  daemon: resolve(CWD, 'daemon.out'),
  leaves: resolve(CWD, 'brain', 'leaves.jsonl'),
  rels: resolve(CWD, 'brain', 'relationships.jsonl'),
  uiDist: resolve(CWD, 'apps', 'dashboard', 'dist'),
}

// Headless agents write their session transcript here (cwd encoded with dashes).
// We tail the active one to report what the agent is doing right now.
const TRANSCRIPT_DIR = resolve(
  process.env.HOME ?? '',
  '.claude',
  'projects',
  `-${CWD.replace(/^\//, '').replace(/\//g, '-')}`,
)

// ── evolution-state.json ───────────────────────────────────────────────────
function readState(): unknown {
  if (!existsSync(P.state)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(P.state, 'utf8'))
  } catch {
    return null
  }
}

// ── evolution.log.md → cycles ──────────────────────────────────────────────
export interface CycleRecord {
  cycle: number
  timestamp: string
  task: string | null
  trigger: string | null
  agentSummary: string | null
  gate: string | null
  commit: string | null
  closure: string | null
  healthBefore: string | null
  healthAfter: string | null
  outcome: string | null
}

const FIELD_RE = /^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/
const HEADING_RE = /^##\s+Cycle\s+(\d+)\s+—\s+(.+?)\s*$/
const OUTCOME_RE = /<!--\s*daemon\s+\S+\s+tick=\d+\s+outcome=(\w+)\s*-->/

function parseCycles(): CycleRecord[] {
  if (!existsSync(P.log)) {
    return []
  }
  const lines = readFileSync(P.log, 'utf8').split('\n')
  const cycles: CycleRecord[] = []
  let cur: CycleRecord | null = null

  const push = () => {
    if (cur) {
      cycles.push(cur)
    }
  }

  for (const line of lines) {
    const h = HEADING_RE.exec(line)
    if (h?.[2]) {
      push()
      cur = {
        cycle: Number(h[1]),
        timestamp: h[2],
        task: null,
        trigger: null,
        agentSummary: null,
        gate: null,
        commit: null,
        closure: null,
        healthBefore: null,
        healthAfter: null,
        outcome: null,
      }
      continue
    }
    if (!cur) {
      continue
    }
    const o = OUTCOME_RE.exec(line)
    if (o?.[1]) {
      cur.outcome = o[1]
      continue
    }
    const f = FIELD_RE.exec(line)
    if (!f?.[1]) {
      continue
    }
    const key = f[1].toLowerCase()
    const val = f[2] ?? ''
    if (key === 'field' || key.startsWith('---')) {
      continue
    }
    if (key === 'task') {
      cur.task = val
    } else if (key === 'trigger') {
      cur.trigger = val
    } else if (key === 'agent summary') {
      cur.agentSummary = val
    } else if (key === 'gate') {
      cur.gate = val
    } else if (key === 'commit') {
      cur.commit = val
    } else if (key === 'closure') {
      cur.closure = val
    } else if (key === 'health before') {
      cur.healthBefore = val
    } else if (key === 'health after') {
      cur.healthAfter = val
    }
  }
  push()
  // newest first
  return cycles.reverse()
}

// ── daemon.out → live in-flight phase ──────────────────────────────────────
export interface LiveStatus {
  running: boolean
  tick: number | null
  phase: string // scan|guard|run-agent|gate|review|commit|absorb|verify|sleeping|idle
  trigger: string | null
  region: string | null
  lastLine: string | null
  updatedAt: string
}

const PHASE_MARKERS: [RegExp, string][] = [
  [/\[scan\]/, 'scan'],
  [/\[create-task\]/, 'scan'],
  [/\[guard\]/, 'guard'],
  [/\[run-agent\]/, 'run-agent'],
  [/\[gate\]/, 'gate'],
  [/\[review\]|\[arbiter\]/, 'review'],
  [/\[commit\]/, 'commit'],
  [/\[absorb\]/, 'absorb'],
  [/\[verify-closure\]/, 'verify'],
  [/sleeping/, 'sleeping'],
]

function tailLines(path: string, maxBytes = 200_000): string[] {
  if (!existsSync(path)) {
    return []
  }
  const size = statSync(path).size
  const start = Math.max(0, size - maxBytes)
  const fd = openSync(path, 'r')
  try {
    const len = size - start
    const buf = Buffer.alloc(len)
    readSync(fd, buf, 0, len, start)
    return buf.toString('utf8').split('\n')
  } finally {
    closeSync(fd)
  }
}

function parseLive(daemonAlive: boolean): LiveStatus {
  const lines = tailLines(P.daemon)
  let tick: number | null = null
  let phase = daemonAlive ? 'idle' : 'stopped'
  let trigger: string | null = null
  let region: string | null = null
  let lastLine: string | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      continue
    }
    lastLine = line
    const t = /──\s*Tick\s+(\d+)/.exec(line) ?? /tick=(\d+)/.exec(line)
    if (t?.[1]) {
      tick = Number(t[1])
    }
    const scan = /\[scan\].*debt=\[([^\]]*)\].*?"([^"]*)"/.exec(line)
    if (scan) {
      trigger = scan[1] ?? null
      region = scan[2] ?? null
    }
    for (const [re, name] of PHASE_MARKERS) {
      if (re.test(line)) {
        phase = name
        break
      }
    }
  }
  return {
    running: daemonAlive,
    tick,
    phase,
    trigger,
    region,
    lastLine,
    updatedAt: new Date().toISOString(),
  }
}

function daemonAlive(): boolean {
  // Heuristic: daemon.out modified within the last 10 minutes AND a daemon
  // process marker present. Cheap + good enough for a status pill.
  if (!existsSync(P.daemon)) {
    return false
  }
  const ageMs = Date.now() - statSync(P.daemon).mtimeMs
  return ageMs < 10 * 60 * 1000
}

// ── live agent roster: who is working, on what, right now ──────────────────
// Each running agent (the cycle agent AND every subagent it spawns) writes a
// session transcript JSONL. We surface one row per transcript active in the
// last ACTIVE_WINDOW_MS: its objective, its latest action, and its latest
// reasoning ("what's being discussed"). Scales from 1 agent to many — add
// workers and more rows appear. (At fleet scale across machines, workers
// should heartbeat into the brain; this local view is the same shape.)
export interface AgentActivity {
  id: string
  role: string // 'agent' | 'explore' | …
  ageSec: number
  startedSec: number
  objective: string
  task: string | null // plain-language brief: what we're solving / aiming to do
  action: string | null
  note: string | null
  kind: string // reading|editing|running|searching|delegating|thinking|working
}

const ACTIVE_WINDOW_MS = 90_000
const MAX_TRANSCRIPT_BYTES = 3_000_000 // excludes the long interactive session

function basename(p: string): string {
  return p.split('/').filter(Boolean).pop() ?? p
}

function describeTool(
  name: string,
  input: Record<string, unknown>,
): { action: string; kind: string } {
  const s = (v: unknown, n = 80) =>
    String(v ?? '')
      .slice(0, n)
      .replace(/\s+/g, ' ')
  switch (name) {
    case 'Read':
      return {
        action: `Reading ${basename(s(input.file_path, 200))}`,
        kind: 'reading',
      }
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
      return {
        action: `Editing ${basename(s(input.file_path, 200))}`,
        kind: 'editing',
      }
    case 'Bash':
      return { action: `Running: ${s(input.command, 100)}`, kind: 'running' }
    case 'Grep':
    case 'Glob':
      return { action: `Searching: ${s(input.pattern, 80)}`, kind: 'searching' }
    case 'Agent':
      return {
        action: `Delegating → ${s(input.subagent_type, 24)}: ${s(input.description, 80)}`,
        kind: 'delegating',
      }
    case 'WebFetch':
    case 'WebSearch':
      return {
        action: `Researching: ${s(input.url ?? input.query, 100)}`,
        kind: 'researching',
      }
    default:
      return { action: name, kind: 'working' }
  }
}

function textOf(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .filter(
        c =>
          c &&
          typeof c === 'object' &&
          (c as { type?: string }).type === 'text',
      )
      .map(c => (c as { text?: string }).text ?? '')
      .join(' ')
  }
  return ''
}

function readOneAgent(file: string, mtimeMs: number): AgentActivity | null {
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    return null
  }
  const lines = raw.split('\n')
  let objective = ''
  let task = '' // the plain-language brief: what we're solving / aiming to do
  let firstTs: number | null = null
  let action: string | null = null
  let note: string | null = null
  let kind = 'working'
  let role = 'agent'

  for (const line of lines) {
    if (!line.trim()) {
      continue
    }
    let e: Record<string, unknown>
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    const ts =
      typeof e.timestamp === 'string' ? Date.parse(e.timestamp) : Number.NaN
    if (!Number.isNaN(ts) && firstTs === null) {
      firstTs = ts
    }
    const msg = e.message as { role?: string; content?: unknown } | undefined
    if (e.type === 'user' && msg && !objective) {
      const t = textOf(msg.content).trim()
      // Skip tool_result-only user turns; we want the initial work prompt.
      if (t) {
        // Cycle agents carry "Trigger: X" + "Target: Y" (see buildWorkPrompt).
        const trig = /Trigger:\s*([A-Z_]+)/.exec(t)
        const targ = /Target:\s*(.+)/.exec(t)
        if (trig) {
          objective = `${trig[1]}${
            targ ? ` — ${(targ[1] ?? '').trim().slice(0, 60)}` : ''
          }`
        } else {
          // Subagent (Explore etc.): use its first meaningful line.
          role = 'explore'
          const firstLine = t
            .split('\n')
            .map(s => s.trim())
            .find(s => s.length > 8 && !/^you are /i.test(s))
          objective = (firstLine ?? t.split('\n')[0] ?? '').slice(0, 110)
        }
        // The human brief = the imperative instruction. For cycle agents it
        // follows the hard-rules block (after "WORK COMPLETE: <one-line summary>");
        // for subagents it's the whole prompt. Keep the first ~2 sentences.
        const marker = 'WORK COMPLETE: <one-line summary>'
        const mi = t.indexOf(marker)
        const body = (mi >= 0 ? t.slice(mi + marker.length) : t)
          .replace(/```[\s\S]*?```/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.length > 4)
        task = sentences.slice(0, 2).join(' ').slice(0, 320)
      }
    }
    if (e.type === 'assistant' && msg) {
      const content = Array.isArray(msg.content) ? msg.content : []
      for (const c of content) {
        const cc = c as {
          type?: string
          text?: string
          name?: string
          input?: unknown
        }
        if (cc.type === 'text' && cc.text && cc.text.trim().length > 12) {
          note = cc.text.trim().replace(/\s+/g, ' ').slice(0, 240)
        } else if (cc.type === 'tool_use' && cc.name) {
          const d = describeTool(
            cc.name,
            (cc.input ?? {}) as Record<string, unknown>,
          )
          action = d.action
          kind = d.kind
        }
      }
    }
  }

  if (!objective && !action && !note) {
    return null
  }
  const now = Date.now()
  return {
    id: basename(file)
      .replace(/\.jsonl$/, '')
      .slice(0, 8),
    role,
    ageSec: Math.round((now - mtimeMs) / 1000),
    startedSec: firstTs ? Math.round((now - firstTs) / 1000) : 0,
    objective: objective || '(working)',
    task: task || null,
    action,
    note,
    kind,
  }
}

function readAgents(): AgentActivity[] {
  let entries: string[]
  try {
    entries = readdirSync(TRANSCRIPT_DIR)
  } catch {
    return []
  }
  const now = Date.now()
  const candidates: Array<{ file: string; mtimeMs: number }> = []
  for (const name of entries) {
    if (!name.endsWith('.jsonl')) {
      continue
    }
    const file = resolve(TRANSCRIPT_DIR, name)
    let st: ReturnType<typeof statSync>
    try {
      st = statSync(file)
    } catch {
      continue
    }
    if (st.size > MAX_TRANSCRIPT_BYTES) {
      continue // the long interactive session
    }
    if (now - st.mtimeMs > ACTIVE_WINDOW_MS) {
      continue
    }
    candidates.push({ file, mtimeMs: st.mtimeMs })
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const out: AgentActivity[] = []
  for (const c of candidates.slice(0, 50)) {
    const a = readOneAgent(c.file, c.mtimeMs)
    if (a) {
      out.push(a)
    }
  }
  return out
}

// Files the cycle is currently changing (uncommitted working tree).
function workingFiles(): Array<{ path: string; status: string }> {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], {
      cwd: CWD,
      encoding: 'utf8',
      timeout: 3000,
    })
    return out
      .split('\n')
      .filter(l => l.trim())
      .map(l => ({ status: l.slice(0, 2).trim(), path: l.slice(3) }))
      .filter(
        f => !f.path.startsWith('brain/') && f.path !== 'evolution.log.md',
      )
      .slice(0, 12)
  } catch {
    return []
  }
}

// ── knowledge graph (sampled) ──────────────────────────────────────────────
async function readGraph(limit: number): Promise<{
  nodes: Array<{
    id: string
    title: string
    kind: string
    regionId: string | null
    confidence: number
  }>
  edges: Array<{ source: string; target: string; type: string }>
}> {
  const nodes: Array<{
    id: string
    title: string
    kind: string
    regionId: string | null
    confidence: number
  }> = []
  if (existsSync(P.leaves)) {
    const rl = createInterface({ input: createReadStream(P.leaves) })
    for await (const line of rl) {
      if (!line.trim()) {
        continue
      }
      if (nodes.length >= limit) {
        rl.close()
        break
      }
      try {
        const l = JSON.parse(line)
        nodes.push({
          id: l.id,
          title: l.title ?? '(untitled)',
          kind: l.kind ?? 'OBJECT',
          regionId: l.regionId ?? null,
          confidence:
            typeof l.confidence?.value === 'number' ? l.confidence.value : 0,
        })
      } catch {
        /* skip */
      }
    }
  }
  const ids = new Set(nodes.map(n => n.id))
  const edges: Array<{ source: string; target: string; type: string }> = []
  if (existsSync(P.rels)) {
    const rl = createInterface({ input: createReadStream(P.rels) })
    for await (const line of rl) {
      if (!line.trim()) {
        continue
      }
      try {
        const r = JSON.parse(line)
        if (ids.has(r.sourceLeafId) && ids.has(r.targetLeafId)) {
          edges.push({
            source: r.sourceLeafId,
            target: r.targetLeafId,
            type: r.type ?? 'RELATED',
          })
        }
      } catch {
        /* skip */
      }
    }
  }
  return { nodes, edges }
}

// ── direction: are we moving toward the vision, and how freely? ────────────
// Not a KPI to optimize — a pulse to read. Freedom = how many distinct
// interpretations of "evolve" are in play; alignment = does the work trace to
// the manifesto; health = converging vs thrashing, understanding growing,
// uncertainty shrinking. (Heuristic lineage until goals are manifesto-derived.)

// Each trigger is an interpretation of "what advancing the vision means here".
const LINEAGE: Record<string, string> = {
  COVERAGE_GAP:
    'Deepen evidence-backed understanding — the substrate the manifesto is built on',
  OPEN_QUESTION: 'Reduce uncertainty — evolution answers what was unknown',
  SPEC_GAP: 'Keep the spec coherent so understanding stays navigable',
  GOAL_GAP: 'Advance a declared goal toward the vision',
  EMPTY_REGION: 'Map a blank area so understanding is complete',
  QUEUED_TASK: 'Carry out planned work toward the vision',
  FRONTEND_GAP:
    'Make the evolution legible so humans can evaluate it (manifesto step 5)',
}

function parseHealth(s: string | null): {
  leaves: number
  beliefs: number
  evidence: number
  openQ: number
} {
  const out = { leaves: 0, beliefs: 0, evidence: 0, openQ: 0 }
  if (!s) {
    return out
  }
  for (const m of s.matchAll(/(\w+)=(\d+)/g)) {
    const k = m[1]
    const v = Number(m[2])
    if (k === 'leaves') {
      out.leaves = v
    } else if (k === 'beliefs') {
      out.beliefs = v
    } else if (k === 'evidence') {
      out.evidence = v
    } else if (k === 'openQ') {
      out.openQ = v
    }
  }
  return out
}

function computeDirection(cycles: CycleRecord[]) {
  const WINDOW = 15
  const window = cycles.slice(0, WINDOW) // newest first
  const chron = [...window].reverse()
  const n = chron.length

  if (n < 3) {
    return {
      verdict: 'starting',
      summary: 'Too early to read direction — the loop is just getting going.',
      vitals: null,
      bets: [],
    }
  }

  const first = parseHealth(
    chron[0]?.healthBefore ?? chron[0]?.healthAfter ?? null,
  )
  const last = parseHealth(chron[n - 1]?.healthAfter ?? null)
  const understandingDelta =
    last.beliefs + last.evidence - (first.beliefs + first.evidence)
  const questionsNetResolved = first.openQ - last.openQ // + = resolving backlog

  const closed = window.filter(
    c =>
      (c.closure ?? '').toUpperCase() === 'CLOSED' &&
      (c.gate ?? '').toUpperCase().startsWith('GREEN'),
  ).length
  const convergence = window.length > 0 ? closed / window.length : 0

  // region lives inside the task string, e.g. "leaf_… — [COVERAGE_GAP] Spec"
  const regionOfCycle = (c: CycleRecord): string | null => {
    const m = /\[[A-Z_]+\]\s*(.+)$/.exec(c.task ?? '')
    return m ? (m[1] ?? '').trim() : null
  }
  const regions = new Set(window.map(regionOfCycle).filter(Boolean))
  const triggers = [
    ...new Set(window.map(c => c.trigger).filter(Boolean)),
  ] as string[]

  // current bets: the distinct interpretations in recent play, with lineage
  const betKeys = new Map<string, { trigger: string; region: string | null }>()
  for (const c of window) {
    if (!c.trigger) {
      continue
    }
    const key = `${c.trigger}`
    if (!betKeys.has(key)) {
      betKeys.set(key, { trigger: c.trigger, region: regionOfCycle(c) })
    }
  }
  const bets = [...betKeys.values()].map(b => ({
    interpretation: b.trigger,
    lineage: LINEAGE[b.trigger] ?? null,
    aligned: b.trigger in LINEAGE,
  }))

  let verdict: string
  if (convergence < 0.5) {
    verdict = 'thrashing'
  } else if (understandingDelta > 0) {
    verdict = 'advancing'
  } else {
    verdict = 'drifting'
  }

  const narrow = triggers.length <= 1
  const anyUnaligned = bets.some(b => !b.aligned)

  let summary: string
  if (verdict === 'thrashing') {
    summary = `Work is churning — only ${Math.round(convergence * 100)}% of recent cycles closed cleanly. Convergence before new direction.`
  } else if (verdict === 'advancing') {
    summary =
      `Advancing toward the vision: understanding grew (+${understandingDelta} beliefs+evidence) and every active interpretation traces to the manifesto. ` +
      (narrow
        ? 'But exploration is narrow — only one interpretation of "evolve" is in play.'
        : `Exploring ${triggers.length} interpretations in parallel.`)
  } else {
    summary =
      'Drifting — understanding is not growing. Worth re-checking what the agents are pursuing.'
  }
  if (anyUnaligned) {
    summary += ' Some work does not yet trace to the manifesto.'
  }

  return {
    verdict,
    summary,
    vitals: {
      understanding: {
        delta: understandingDelta,
        trend:
          understandingDelta > 0
            ? 'up'
            : understandingDelta < 0
              ? 'down'
              : 'flat',
      },
      questions: { netResolved: questionsNetResolved },
      convergence: {
        pct: Math.round(convergence * 100),
        closed,
        total: window.length,
      },
      diversity: { areas: regions.size, interpretations: triggers.length },
    },
    bets,
  }
}

function snapshot() {
  const alive = daemonAlive()
  const cycles = parseCycles()
  return {
    generatedAt: new Date().toISOString(),
    state: readState(),
    cycles,
    live: parseLive(alive),
    agents: readAgents(),
    workingFiles: workingFiles(),
    direction: computeDirection(cycles),
  }
}

// ── server ─────────────────────────────────────────────────────────────────
const fastify = Fastify({ logger: false })

fastify.addHook('onSend', async (_req, reply) => {
  reply.header('access-control-allow-origin', '*')
})

fastify.get('/api/snapshot', async () => snapshot())
fastify.get('/api/agents', async () => ({
  agents: readAgents(),
  workingFiles: workingFiles(),
}))
fastify.get('/api/cycles', async () => ({ cycles: parseCycles() }))
fastify.get('/api/graph', async req => {
  const limit = Number((req.query as { limit?: string }).limit ?? 250)
  return readGraph(Math.min(Math.max(limit, 1), 1000))
})

// SSE — push a fresh snapshot whenever any watched file changes.
const clients = new Set<import('node:http').ServerResponse>()
fastify.get('/api/stream', (req, reply) => {
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'access-control-allow-origin': '*',
  })
  reply.raw.write(`event: update\ndata: ${JSON.stringify(snapshot())}\n\n`)
  clients.add(reply.raw)
  const ka = setInterval(() => reply.raw.write(': ka\n\n'), 25_000)
  req.raw.on('close', () => {
    clearInterval(ka)
    clients.delete(reply.raw)
  })
})

let pushTimer: NodeJS.Timeout | null = null
function broadcast() {
  if (pushTimer) {
    return
  }
  pushTimer = setTimeout(() => {
    pushTimer = null
    const payload = `event: update\ndata: ${JSON.stringify(snapshot())}\n\n`
    for (const c of clients) {
      try {
        c.write(payload)
      } catch {
        clients.delete(c)
      }
    }
  }, 600)
}
for (const f of [P.state, P.log, P.daemon]) {
  watchFile(f, { interval: 1500 }, broadcast)
}

// Agent transcripts change constantly without touching the watched files, so
// also push on a steady cadence whenever someone is connected — this is what
// makes the live activity panel feel alive (and keeps scaling to N agents).
setInterval(() => {
  if (clients.size > 0) {
    broadcast()
  }
}, 2000)

// Serve the built UI if present, else a hint.
fastify.get('/', async (_req, reply) => {
  const idx = resolve(P.uiDist, 'index.html')
  if (existsSync(idx)) {
    reply.type('text/html')
    return readFileSync(idx, 'utf8')
  }
  reply.type('text/html')
  return `<!doctype html><meta charset=utf8><body style="font:14px ui-monospace;background:#0b0e14;color:#cdd6f4;padding:40px">
  <h1>Delphi Evolution Dashboard API</h1>
  <p>UI not built yet. Run <code>pnpm --filter delphi-dashboard dev</code> for live dev,
  or <code>pnpm --filter delphi-dashboard build</code> to bundle it here.</p>
  <p>API: <a style=color:#89b4fa href="/api/snapshot">/api/snapshot</a> ·
  <a style=color:#89b4fa href="/api/graph">/api/graph</a> ·
  <code>/api/stream</code> (SSE)</p></body>`
})

const app = await fastify.listen({ port: PORT, host: '0.0.0.0' })
console.log(`Delphi Evolution Dashboard API on ${app}  (SSE: /api/stream)`)
