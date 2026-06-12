// pnpm tsx scripts/smoke-pty.ts
// Manual smoke verification: PTY executor with a trivial prompt.
// Expected output: "PTY-OK" is present in collected output.

import { runAgent } from './evolution-loop.js'

const executor =
  (process.env.AGENT_EXECUTOR as 'pty' | 'headless' | undefined) === 'headless'
    ? 'headless'
    : 'pty'

console.log(`executor: ${executor}`)

const result = await runAgent(
  'Print exactly: PTY-OK and nothing else. Do not edit any files.',
  {
    executor,
    cwd: process.cwd(),
    hasPermissionMode: true,
    timeoutMs: 90_000,
  },
)

console.log('')
console.log('--- PTY SMOKE TEST RESULT ---')
console.log('ok:', result.ok)
console.log('output includes PTY-OK:', result.output.includes('PTY-OK'))
console.log('--- output (last 800 chars) ---')
console.log(result.output.slice(-800))
console.log('---')

if (!result.output.includes('PTY-OK')) {
  console.error('SMOKE FAILED: PTY-OK not found in output')
  process.exit(1)
} else {
  console.log('SMOKE PASSED')
}
