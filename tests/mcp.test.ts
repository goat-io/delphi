import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bootstrapBrain } from '../scripts/bootstrap-brain.js'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

let tmpDir: string
let client: Client
let transport: StdioClientTransport
let proposedLeafId: string

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'delphi-mcp-'))

  // Bootstrap the brain (quiet); DB must be closed before spawning MCP server
  await bootstrapBrain({
    dataDir: join(tmpDir, 'brain'),
    repoRoot: REPO_ROOT,
    quiet: true,
  })

  // Spawn MCP server as subprocess via StdioClientTransport
  transport = new StdioClientTransport({
    command: 'pnpm',
    args: ['exec', 'tsx', join(REPO_ROOT, 'apps', 'mcp', 'src', 'server.ts')],
    env: {
      ...(process.env as Record<string, string>),
      DELPHI_DATA_DIR: join(tmpDir, 'brain'),
    },
    stderr: 'pipe',
  })

  client = new Client({
    name: 'delphi-test-client',
    version: '0.1.0',
  })

  await client.connect(transport)
}, 120_000)

afterAll(async () => {
  try {
    await client.close()
  } catch {
    // ignore
  }
})

describe('delphi MCP server', () => {
  it('navigate_index (no args) returns >= 2 regions including "Spec"', async () => {
    const result = await client.callTool({
      name: 'navigate_index',
      arguments: {},
    })
    expect(result.content).toBeDefined()
    const content = result.content as Array<{ type: string; text: string }>
    const text = content[0]?.text ?? ''
    const regions = JSON.parse(text) as Array<{ title: string }>
    expect(regions.length).toBeGreaterThanOrEqual(2)
    expect(regions.some(r => r.title === 'Spec')).toBe(true)
  })

  it('search {q:"leaf"} returns >= 1 result', async () => {
    const result = await client.callTool({
      name: 'search',
      arguments: { q: 'leaf' },
    })
    const content = result.content as Array<{ type: string; text: string }>
    const text = content[0]?.text ?? ''
    const leaves = JSON.parse(text) as unknown[]
    expect(leaves.length).toBeGreaterThanOrEqual(1)
  })

  it('ask {question:"What is a Brain?"} returns non-empty summary', async () => {
    const result = await client.callTool({
      name: 'ask',
      arguments: { question: 'What is a Brain?' },
    })
    const content = result.content as Array<{ type: string; text: string }>
    const text = content[0]?.text ?? ''
    const answer = JSON.parse(text) as { summary?: string }
    expect(answer.summary).toBeDefined()
    expect((answer.summary ?? '').length).toBeGreaterThan(0)
  })

  it('propose_knowledge {kind:"DECISION",...} returns an id', async () => {
    const result = await client.callTool({
      name: 'propose_knowledge',
      arguments: {
        kind: 'DECISION',
        title: 'Use PGlite for the self brain',
        statement: 'The self brain runs on embedded PGlite.',
        rationale: 'zero infra',
      },
    })
    const content = result.content as Array<{ type: string; text: string }>
    const text = content[0]?.text ?? ''
    const res = JSON.parse(text) as { id?: string }
    expect(res.id).toBeDefined()
    expect(typeof res.id).toBe('string')
    proposedLeafId = res.id!
  })

  it('get_leaf on proposed DECISION leaf returns kind === "DECISION"', async () => {
    expect(proposedLeafId).toBeDefined()
    const result = await client.callTool({
      name: 'get_leaf',
      arguments: { id: proposedLeafId },
    })
    const content = result.content as Array<{ type: string; text: string }>
    const text = content[0]?.text ?? ''
    const res = JSON.parse(text) as { leaf?: { kind: string } }
    expect(res.leaf?.kind).toBe('DECISION')
  })
})
