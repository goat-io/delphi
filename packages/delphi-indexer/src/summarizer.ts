import type { Leaf, Region } from '@goatlab/delphi-protocol'

export interface RegionDigest {
  region: Region
  leaves: Leaf[]
  beliefs: Leaf[]
  objects: Leaf[]
  questions: Leaf[]
  topBeliefs: Leaf[]
}

export interface Summarizer {
  summarize(d: RegionDigest): Promise<{
    tiny: string
    short: string
    medium: string
    long: string
  }>
  readonly name: string
}

// ── TemplateSummarizer ────────────────────────────────────────────────────────

export class TemplateSummarizer implements Summarizer {
  readonly name = 'template'

  async summarize(d: RegionDigest): Promise<{
    tiny: string
    short: string
    medium: string
    long: string
  }> {
    const { region, leaves, beliefs, questions, topBeliefs, objects } = d
    const leafCount = leaves.length
    const beliefCount = beliefs.length
    const questionCount = questions.length

    // tiny: ≤ ~140 chars
    const tiny = `${region.title}: ${leafCount} leaves, ${beliefCount} beliefs, ${questionCount} open questions.`

    // short: tiny + top 3 belief titles
    const top3Titles = topBeliefs.slice(0, 3).map(b => b.title)
    const short =
      tiny + (top3Titles.length > 0 ? ` Key: ${top3Titles.join('; ')}.` : '')

    // medium: top 5 beliefs as bullet list + objects + open questions
    const top5Lines = topBeliefs
      .slice(0, 5)
      .map(b => {
        const conf = b.confidence?.value ?? 0
        const text = b.statement ?? b.title
        return `- ${text} (confidence ${conf.toFixed(2)})`
      })
      .join('\n')

    const objectTitles = objects.map(o => o.title).join(', ')
    const questionTitles = questions.map(q => q.title).join(', ')

    const medium =
      `${tiny}\n\n${top5Lines}` +
      (objectTitles.length > 0 ? `\n\nObjects: ${objectTitles}` : '') +
      (questionTitles.length > 0 ? `\n\nOpen questions: ${questionTitles}` : '')

    // long: medium + remaining beliefs
    const remaining = beliefs.slice(5)
    const remainingLines = remaining
      .map(b => `- ${b.statement ?? b.title}`)
      .join('\n')

    const long =
      medium + (remainingLines.length > 0 ? `\n\n${remainingLines}` : '')

    return { tiny, short, medium, long }
  }
}

// ── AnthropicSummarizer ───────────────────────────────────────────────────────

export class AnthropicSummarizer implements Summarizer {
  readonly name = 'anthropic'
  private model: string
  private fallback: TemplateSummarizer
  private client: import('@anthropic-ai/sdk').Anthropic | null = null

  constructor(model = 'claude-opus-4-8') {
    this.model = model
    this.fallback = new TemplateSummarizer()
  }

  private async getClientAsync(): Promise<
    import('@anthropic-ai/sdk').Anthropic
  > {
    if (!this.client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      this.client = new Anthropic()
    }
    return this.client
  }

  async summarize(d: RegionDigest): Promise<{
    tiny: string
    short: string
    medium: string
    long: string
  }> {
    try {
      const { region, topBeliefs, objects, questions } = d

      const beliefLines = topBeliefs
        .map(
          (b, i) =>
            `${i + 1}. [confidence: ${(b.confidence?.value ?? 0).toFixed(2)}] ${b.title}${b.statement ? `: ${b.statement}` : ''}`,
        )
        .join('\n')

      const objectLines = objects.map(o => `- ${o.title}`).join('\n')
      const questionLines = questions.map(q => `- ${q.title}`).join('\n')

      const prompt = `You are a knowledge index generator. Given the following region data, produce summaries at 4 levels.

Region: ${region.title}
Leaf count: ${d.leaves.length}
Belief count: ${d.beliefs.length}
Question count: ${d.questions.length}

Top beliefs:
${beliefLines || '(none)'}

Objects:
${objectLines || '(none)'}

Open questions:
${questionLines || '(none)'}

Respond ONLY with a JSON object with keys: "tiny" (≤140 chars), "short" (1-2 sentences), "medium" (paragraph), "long" (detailed paragraph). No markdown, no explanation.`

      const client = await this.getClientAsync()
      const message = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = message.content.find(b => b.type === 'text')
      if (text?.type !== 'text') {
        return this.fallback.summarize(d)
      }

      const parsed = JSON.parse(text.text) as {
        tiny: string
        short: string
        medium: string
        long: string
      }
      return parsed
    } catch {
      return this.fallback.summarize(d)
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function pickSummarizer(): Summarizer {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicSummarizer()
  }
  return new TemplateSummarizer()
}
