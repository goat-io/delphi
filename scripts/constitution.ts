// scripts/constitution.ts — Policy-as-data: The Human Boundary constitution.
//
// Exports:
//   HUMAN_BOUNDARY_ACTIONS  — action classes that require human approval
//   classifyWorkOrder       — heuristic classifier for work-order items

// ── Human Boundary action classes ─────────────────────────────────────────────

export const HUMAN_BOUNDARY_ACTIONS: string[] = [
  'npm-publish',
  'external-pr',
  'external-issue',
  'email',
  'message',
  'notification',
  'external-api-write',
  'payment',
]

// ── Classifier ────────────────────────────────────────────────────────────────

export interface WorkOrderClassification {
  humanImpact: boolean
  reasons: string[]
}

/**
 * Classifies a work-order item to determine whether it requires human approval.
 *
 * The Human Boundary: human approval is required ONLY when the action intends
 * to contact, interact with, or affect another human in any way.
 * Everything operating inside this repository is fully autonomous.
 *
 * @param item  - A work-order item with title and/or statement fields.
 * @param task  - The raw task description string (prompt / detail / title).
 */
export function classifyWorkOrder(
  item: { title?: string; statement?: string; description?: string },
  task: string,
): WorkOrderClassification {
  const corpus = [
    item.title ?? '',
    item.statement ?? '',
    item.description ?? '',
    task,
  ]
    .join(' ')
    .toLowerCase()

  const reasons: string[] = []

  // ── npm / package publishing ──────────────────────────────────────────────
  if (
    /\bnpm\s+publish\b/.test(corpus) ||
    /\bpublish\b.*\bpackage\b/.test(corpus) ||
    /\bpublish\b.*\bnpm\b/.test(corpus) ||
    /\brelease\b.*\bnpm\b/.test(corpus) ||
    /\bpublish\b.*\bregistry\b/.test(corpus)
  ) {
    reasons.push(
      'npm-publish: action publishes a package to npm (affects external consumers = humans)',
    )
  }

  // ── pull requests or issues on OTHER repositories ─────────────────────────
  // External repo patterns: github.com/<org>/<repo> where repo is NOT this one
  const externalGithubPattern =
    /github\.com\/(?!goat-io\/delphi\b)[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/
  if (externalGithubPattern.test(corpus)) {
    reasons.push(
      'external-pr/issue: action targets a repository other than goat-io/delphi',
    )
  }

  // Relative path escaping the repo (e.g. "../other-repo" patterns)
  if (/\.\.\s*\/\s*[a-zA-Z]/.test(corpus)) {
    reasons.push(
      'external-path: action references a path outside this repository (../ escape)',
    )
  }

  // Explicit "open an issue on" / "open a PR on" targeting external repos
  if (
    /\bopen\s+(an?\s+)?(issue|pr|pull\s+request)\s+on\b/.test(corpus) &&
    !/goat-io\/delphi/.test(corpus)
  ) {
    reasons.push(
      'external-issue/pr: action opens an issue or PR on an external repository',
    )
  }

  // ── email ────────────────────────────────────────────────────────────────
  if (
    /\bsend\b.*\bemail\b/.test(corpus) ||
    /\bemail\b.*\bsend\b/.test(corpus) ||
    /\bweekly\s+summary\s+email\b/.test(corpus) ||
    /\bemail\s+(the\s+)?(team|user|owner|maintainer|subscriber)/.test(corpus) ||
    /\bsmtp\b/.test(corpus) ||
    /\bsendgrid\b/.test(corpus)
  ) {
    reasons.push('email: action sends an email to a person')
  }

  // ── messaging / notifications ─────────────────────────────────────────────
  if (
    /\bsend\b.{0,40}\b(message|notification|alert|ping|dm)\b/.test(corpus) ||
    /\bnotif(y|ication)\b.{0,40}\b(user|team|person|subscriber)\b/.test(
      corpus,
    ) ||
    /\bslack\b.{0,40}\b(send|post|notify)\b/.test(corpus) ||
    /\bpost\s+to\s+(slack|discord|teams|telegram)\b/.test(corpus) ||
    /\bmessage\s+@/.test(corpus) ||
    /\bsend\s+to\s+[a-zA-Z0-9]/.test(corpus)
  ) {
    reasons.push(
      'message/notification: action sends a message or notification to a person',
    )
  }

  // ── external API writes ───────────────────────────────────────────────────
  if (
    /\bpost\s+to\s+(an?\s+)?external\b/.test(corpus) ||
    /\bwrite\s+to\s+(an?\s+)?external\s+api\b/.test(corpus) ||
    /\bexternal[-\s]api[-\s]write\b/.test(corpus)
  ) {
    reasons.push(
      'external-api-write: action writes to an external API visible to other people',
    )
  }

  // ── payment ───────────────────────────────────────────────────────────────
  if (
    /\bcharge\b.{0,40}\b(card|customer|user)\b/.test(corpus) ||
    /\bpayment\b/.test(corpus) ||
    /\bstripe\b/.test(corpus) ||
    /\bspend\b.{0,40}\bbudget\b/.test(corpus)
  ) {
    reasons.push('payment: action involves spending money or charging a user')
  }

  return {
    humanImpact: reasons.length > 0,
    reasons,
  }
}
