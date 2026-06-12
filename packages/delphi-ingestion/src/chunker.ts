export function chunkMarkdown(
  body: string,
): Array<{ text: string; section?: string }> {
  const lines = body.split('\n')
  let currentSection: string | undefined

  // Collect paragraphs: sequences of non-blank lines
  const paragraphs: Array<{ text: string; section?: string }> = []
  let currentParagraphLines: string[] = []
  let paragraphSection: string | undefined

  function flushParagraph() {
    if (currentParagraphLines.length === 0) {
      return
    }
    const text = currentParagraphLines.join('\n').trim()
    if (text.length > 0) {
      const entry: { text: string; section?: string } = { text }
      if (paragraphSection !== undefined) {
        entry.section = paragraphSection
      }
      paragraphs.push(entry)
    }
    currentParagraphLines = []
  }

  for (const line of lines) {
    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line)
    if (headingMatch) {
      flushParagraph()
      currentSection = headingMatch[1]!.trim()
      paragraphSection = currentSection
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      paragraphSection = currentSection
    } else {
      if (currentParagraphLines.length === 0) {
        paragraphSection = currentSection
      }
      currentParagraphLines.push(line)
    }
  }
  flushParagraph()

  if (paragraphs.length === 0) {
    return []
  }

  // Pack consecutive paragraphs into chunks up to ~800 chars
  const chunks: Array<{ text: string; section?: string }> = []
  let accText = ''
  let accSection: string | undefined

  function flushChunk() {
    const trimmed = accText.trim()
    if (trimmed.length > 0) {
      const chunk: { text: string; section?: string } = { text: trimmed }
      if (accSection !== undefined) {
        chunk.section = accSection
      }
      chunks.push(chunk)
    }
    accText = ''
    accSection = undefined
  }

  for (const para of paragraphs) {
    // If the paragraph itself is > 800 chars, it becomes its own chunk
    if (para.text.length > 800) {
      // flush current accumulation first
      flushChunk()
      const chunk: { text: string; section?: string } = { text: para.text }
      if (para.section !== undefined) {
        chunk.section = para.section
      }
      chunks.push(chunk)
      continue
    }

    const separator = accText.length > 0 ? '\n\n' : ''
    const combined = accText + separator + para.text

    if (accText.length > 0 && combined.length > 800) {
      // Current accumulation is full; flush it and start fresh
      flushChunk()
      accText = para.text
      accSection = para.section
    } else {
      if (accText.length === 0) {
        accSection = para.section
      }
      accText = combined
    }
  }
  flushChunk()

  return chunks
}
