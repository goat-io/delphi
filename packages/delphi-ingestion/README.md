---
name: "delphi-ingestion — File Ingestion & Chunking"
description: "Reads source files, computes checksums, parses frontmatter, and splits content into section-aware chunks stored as Assets."
owner: engineering
status: active
tags: [delphi, knowledge-plane]
---

# delphi-ingestion

`delphi-ingestion` is the entry point for bringing external content into the Delphi knowledge graph. It reads files from the filesystem, computes SHA-256 checksums, parses YAML frontmatter, and splits body text into paragraph-level chunks that are stored as `Asset` and `Chunk` records via `BrainStore`. The package implements the asset ingestion stage described in RFC-0020 (Works, Assets, and Knowledge Extraction).

Ingestion is content-addressed: before creating any records the package looks up the checksum in the `assets` table. If an asset with the same checksum already exists for the brain, `ingestFile` returns immediately with `skipped: true` and no new rows are written. This makes re-ingestion of unchanged files a no-op at zero cost, enabling repeated runs without knowledge duplication.

The chunker splits Markdown bodies by section heading and paragraph boundary. Consecutive paragraphs are accumulated into chunks of up to approximately 800 characters; any single paragraph that exceeds 800 characters becomes its own chunk. Each chunk records the heading text of its enclosing section in a `location.section` field, which downstream extractors use to identify OBJECT candidates.

## Key exports

- `ingestFile(store, brainId, filePath)` — ingests a single `.md` or `.txt` file; returns `{ asset, chunks, skipped }`
- `ingestDirectory(store, brainId, dirPath)` — iterates over `.md` and `.txt` files in alphabetical order and calls `ingestFile` on each
- `chunkMarkdown(body)` — pure function that splits a Markdown body string into section-annotated chunks
- `parseFrontmatter(raw)` — extracts a YAML frontmatter block into a `meta` object and returns the remaining `body`

## Behavior

Re-ingesting an unchanged file is a checksum no-op: the function returns the existing asset and an empty chunks array without writing any new rows. Asset title resolution follows a priority order: the `name` field in frontmatter takes precedence, then the first `# heading` found in the body, then the basename of the file without its extension. Files without a `.md` extension are stored with asset type `TEXT`; `.md` files are stored as `MARKDOWN`. The chunker accumulates paragraphs up to 800 characters before flushing, but never splits a paragraph mid-way — a paragraph longer than 800 characters is always emitted as a single chunk regardless of size. Frontmatter that fails YAML parsing is treated as absent and the full raw content becomes the body.
