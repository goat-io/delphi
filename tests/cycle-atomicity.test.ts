// tests/cycle-atomicity.test.ts
// Regression: DISPUTED cycles must commit evolution.log.md atomically.
// Before the fix, a DISPUTED cycle left evolution.log.md uncommitted, and the
// next cycle's CommitStep (git add -A) would sweep the orphaned log diff in.

import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { appendCycleLog } from '../scripts/evolution-loop.js'
import { commitCycleLogEntry } from '../scripts/evolution-steps.js'

let tmpDir: string

function git(args: string): string {
  return execSync(`git ${args}`, { cwd: tmpDir, encoding: 'utf8' }).trim()
}

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'delphi-atomicity-'))
  execSync('git init', { cwd: tmpDir })
  execSync('git config user.email "test@test.com"', { cwd: tmpDir })
  execSync('git config user.name "Test"', { cwd: tmpDir })
  writeFileSync(join(tmpDir, 'README.md'), '# test\n')
  execSync('git add README.md', { cwd: tmpDir })
  execSync('git commit -m "init"', { cwd: tmpDir })
})

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('cycle-atomicity', () => {
  it('DISPUTED: commitCycleLogEntry commits evolution.log.md in a [DISPUTED] commit', () => {
    appendCycleLog(tmpDir, {
      cycle: 99,
      timestamp: new Date().toISOString(),
      taskId: 'test-task-id',
      taskTitle: 'Test task',
      trigger: 'QUEUED_TASK',
      agentSummary: '(test)',
      gateResult: 'DISPUTED',
      commitHash: 'abc1234',
      closureStatus: 'DISPUTED',
      healthBefore: 'leaves=0',
      healthAfter: 'leaves=0',
    })

    // evolution.log.md is dirty before the commit
    expect(git('status --porcelain')).not.toBe('')

    commitCycleLogEntry(tmpDir, 99, false)

    // Working tree is clean after the [DISPUTED] commit
    expect(git('status --porcelain')).toBe('')

    const lastMsg = git('log --oneline -1')
    expect(lastMsg).toContain('[DISPUTED]')
    expect(lastMsg).toContain('cycle 99')
  })

  it('GREEN: commitCycleLogEntry commits via -am (picks up all tracked changes)', () => {
    writeFileSync(join(tmpDir, 'work.ts'), 'export const x = 1\n')
    execSync('git add -A', { cwd: tmpDir })
    execSync('git commit -m "cycle work"', { cwd: tmpDir })

    // Simulate tracked-file change + log entry
    writeFileSync(join(tmpDir, 'work.ts'), 'export const x = 2\n')
    appendCycleLog(tmpDir, {
      cycle: 100,
      timestamp: new Date().toISOString(),
      taskId: 'test-task-2',
      taskTitle: 'Test task 2',
      trigger: 'QUEUED_TASK',
      agentSummary: 'WORK COMPLETE: done',
      gateResult: 'GREEN',
      commitHash: 'def5678',
      closureStatus: 'CLOSED',
      healthBefore: 'leaves=0',
      healthAfter: 'leaves=1',
    })

    commitCycleLogEntry(tmpDir, 100, true)

    expect(git('status --porcelain')).toBe('')

    const lastMsg = git('log --oneline -1')
    expect(lastMsg).not.toContain('[DISPUTED]')
    expect(lastMsg).toContain('log')
  })

  it('Regression: after a DISPUTED cycle, the next cycle commit does not contain evolution.log.md', () => {
    // At this point tmpDir is clean (previous test committed everything).
    // Add a new file to simulate the next cycle's agent output.
    writeFileSync(join(tmpDir, 'next-cycle-work.ts'), 'export const z = 3\n')

    // evolution.log.md must NOT appear in the dirty status (was committed in
    // the DISPUTED cycle's [DISPUTED] commit).
    const status = git('status --porcelain')
    expect(status).not.toContain('evolution.log.md')

    // Next cycle's CommitStep: git add -A → commit only new-cycle work
    execSync('git add -A', { cwd: tmpDir })
    execSync('git commit -m "evolve(cycle 101): next cycle work"', {
      cwd: tmpDir,
    })

    const filesInCommit = git('show --name-only --format="" HEAD')
      .split('\n')
      .filter(Boolean)

    expect(filesInCommit).not.toContain('evolution.log.md')
    expect(filesInCommit).toContain('next-cycle-work.ts')
  })
})
