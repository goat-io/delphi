export class IndexScheduler {
  private debounceMs: number
  private timer: ReturnType<typeof setTimeout> | null = null
  private pending = false
  private suspended = false
  private running: Promise<void> | null = null

  constructor(
    private run: () => Promise<void>,
    opts: { debounceMs?: number } = {},
  ) {
    this.debounceMs = opts.debounceMs ?? 500
  }

  markDirty(): void {
    if (this.suspended) {
      this.pending = true
      return
    }
    this.scheduleRun()
  }

  private scheduleRun(): void {
    this.pending = true
    if (this.timer !== null) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      this.timer = null
      void this.executeRun()
    }, this.debounceMs)
    // Allow Node.js to exit even if this timer is pending
    if (this.timer && typeof this.timer === 'object' && 'unref' in this.timer) {
      ;(this.timer as { unref(): void }).unref()
    }
  }

  private executeRun(): Promise<void> {
    if (!this.pending) {
      return Promise.resolve()
    }
    this.pending = false

    // Chain: queue at most one trailing run
    if (this.running !== null) {
      this.running = this.running.then(() => {
        if (this.pending) {
          this.pending = false
          return this.run()
        }
        return Promise.resolve()
      })
    } else {
      this.running = this.run().finally(() => {
        this.running = null
      })
    }
    return this.running
  }

  suspend(): void {
    this.suspended = true
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
      // The scheduled run was cancelled; mark as pending to run on resume
      this.pending = true
    }
  }

  async resume(): Promise<void> {
    this.suspended = false
    if (this.pending) {
      await this.executeRun()
    }
  }

  async flushNow(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.pending || this.running !== null) {
      await this.executeRun()
      if (this.running !== null) {
        await this.running
      }
    }
  }
}
