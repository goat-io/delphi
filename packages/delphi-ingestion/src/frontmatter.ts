import { parse } from 'yaml'

export function parseFrontmatter(raw: string): {
  meta: Record<string, unknown>
  body: string
} {
  if (!raw.startsWith('---\n')) {
    return { meta: {}, body: raw }
  }

  const closeIdx = raw.indexOf('\n---\n', 4)
  if (closeIdx === -1) {
    return { meta: {}, body: raw }
  }

  const yamlBlock = raw.slice(4, closeIdx)
  const body = raw.slice(closeIdx + 5)

  try {
    const parsed = parse(yamlBlock)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      return { meta: parsed as Record<string, unknown>, body }
    }
    return { meta: {}, body }
  } catch {
    return { meta: {}, body: raw }
  }
}
