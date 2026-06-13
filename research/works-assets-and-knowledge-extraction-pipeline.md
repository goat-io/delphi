---
name: works-assets-and-knowledge-extraction-pipeline
type: research
status: closed
region: Spec
topics:
  - works
  - assets
  - extraction
  - derivatives
  - knowledge pipeline
  - RFC-0020
sources:
  - rfcs/RFC-0020-Works-Assets-and-Knowledge-Extraction.md
  - rfcs/RFC-0004-Evidence-and-Provenance.md
  - rfcs/RFC-0027-Extraction-and-Entity-Resolution.md
---

# Works, Assets, and the Knowledge Extraction Pipeline

## Core Principle: Assets Are Not Knowledge

RFC-0020 establishes the foundational separation between artifacts and
understanding. A PDF, a video, an audio recording, a source code repository —
none of these are knowledge. They *contain* knowledge. Knowledge must be
extracted from assets before it becomes part of a Brain.

**Source:** RFC-0020 §"Core Principle" (lines 44–46).

## The Universal Pipeline

RFC-0020 defines the full chain from raw reality to structured understanding:

```
Reality → Work → Expression → Asset → Extraction → Evidence → Knowledge → Indexes → Understanding
```

This pipeline is the operational realisation of the Universal Model in AGENTS.md.
Each stage has a distinct identity and lifecycle. Conflating stages (e.g., treating
an Asset as Knowledge) breaks traceability, portability, and the evidence model.

**Source:** RFC-0020 §"The Universal Pipeline" (lines 48–68).

## Why the Hierarchy Exists

Without the Work/Expression/Asset separation, three files (Bible.pdf,
Bible.epub, Bible.mp3) appear to be unrelated objects. With it:

```
The Bible (Work)
  └── King James Version (Expression)
        ├── bible.pdf (Asset)
        ├── bible.epub (Asset)
        └── bible.mp3 (Asset)
```

All representations share a common identity. Evidence extracted from any of
them traces back to the same Work and Expression.

**Source:** RFC-0020 §"Why This Exists" (lines 69–92).

## Work

A Work is an intellectual creation that exists independently of any file or
format. Examples: The Bible, The Iliad, Principia Mathematica, RFC-0001.
Works are the identity anchor of the knowledge lineage chain.

**Source:** RFC-0020 §"Work" (lines 94–106).

## Expression

An Expression is a specific realisation of a Work. The Bible has multiple
Expressions (King James Version, New International Version, Reina Valera). The
Work is the same; the Expression differs in language, editorial choices, or
format conventions.

**Source:** RFC-0020 §"Expression" (lines 108–127).

## Asset

An Asset is a concrete artifact (PDF, EPUB, video file, audio file, website
snapshot, presentation). Assets are stored *outside* the Brain — in S3, GCS,
Azure Blob, or a filesystem. The Brain stores only metadata and references.

```ts
interface Asset {
  id: string
  type: string
  uri: string
  checksum: string
  sizeBytes: number
  createdAt: string
}
```

**Source:** RFC-0020 §"Asset" (lines 129–167).

## Storage Rule

RFC-0020 establishes a hard storage boundary:

- Brains store: metadata, references, knowledge, evidence.
- Brains do NOT store: large PDFs, videos, audio files.

This keeps Brains portable and independently scalable from asset storage.

**Source:** RFC-0020 §"Storage Rule" (lines 148–167).

## Extraction

Extraction transforms an Asset into structured information. Different asset
types require different extraction methods:

| Asset Type | Extraction Method | Output |
|---|---|---|
| PDF | OCR | Text |
| Video | Transcription | Transcript |
| Audio | Transcription | Transcript |
| Source Code Repository | Parsing/Analysis | Source Graph |

The sodium ai-service (`/Users/igca/Documents/Code/sodium/apps/ai-service`)
provides OCR (PaddleOCR), transcription (faster-whisper), and embeddings
(BGE-M3, 1024-dim) for the Delphi MVP — this is an existing capability that
must not be rewritten.

**Source:** RFC-0020 §"Extraction" (lines 186–207). Implementation note from AGENTS.md §"Current Architecture".

## Derivatives

Extraction creates derivative artifacts — generated outputs that are not
canonical but support knowledge creation:
- Transcripts
- OCR Text
- Chunks
- Embeddings
- Summaries
- Entities
- Citations
- Topics

Derivatives are generated, not canonical. They may be regenerated at any time
from the original Asset. This mirrors the generated/canonical distinction
for Indexes (RFC-0019) — derivatives are to Assets what Indexes are to Leaves.

**Source:** RFC-0020 §"Derivatives" (lines 209–226).

## Evidence Tracing

Evidence in the Brain references specific locations within Assets. Example:

- Belief: "Roman economic decline contributed to collapse."
- Evidence: RomanHistory.pdf, Page 132.

Evidence points to Assets (not to Knowledge). This is the same Evidence model
defined in RFC-0004 — RFC-0020 adds the asset lineage context.

**Source:** RFC-0020 §"Evidence" (lines 228–246).

## Knowledge

Knowledge is extracted meaning that becomes Leaves:
- Concept: Roman Economy
- Belief: Inflation contributed to instability
- Question: How significant was inflation?

Assets never generate Leaves directly — extraction must produce structured
information that is then evaluated and resolved into Leaves by the candidate
staging protocol (RFC-0031).

**Source:** RFC-0020 §"Knowledge" (lines 248–265).

## The Canonical Rule

```
Assets ≠ Knowledge
Knowledge ≠ Understanding
Understanding = Indexes
```

This three-level distinction prevents the common mistake of treating "we have
the PDF" as "we have the knowledge" and "we have the knowledge" as "we
understand the domain."

**Source:** RFC-0020 §"Canonical Rule" (lines 277–289).

## Asset Lineage

Every artifact must be traceable through the full chain:
Work → Expression → Asset → Derivative → Evidence → Knowledge.

RFC-0020 shows this concretely for Books, Videos, Research Papers, and Source
Code Repositories (lines 291–387).

**Source:** RFC-0020 §"Asset Lineage" (lines 388–402).

## Ten Canonical Rules

RFC-0020 closes with ten rules:
1. Assets are not knowledge.
2. Works are not assets.
3. Expressions are not assets.
4. Evidence references assets.
5. Knowledge is extracted meaning.
6. Leaves store knowledge.
7. Assets remain external.
8. Indexes summarize knowledge.
9. Every artifact has lineage.
10. Extraction must be auditable.

**Source:** RFC-0020 §"Canonical Rules" (lines 404–418).

## Success Criteria

RFC-0020 defines eight success criteria. The system succeeds when:
1. Large files are not stored in the Brain.
2. Knowledge remains portable.
3. Evidence remains traceable.
4. Multiple asset formats share a common identity (through the Work/Expression hierarchy).
5. Knowledge extraction is auditable.
6. Assets and knowledge remain separated.
7. Indexes summarize extracted understanding.
8. Brains scale independently from asset storage.

**Source:** RFC-0020 §"Success Criteria" (lines 420–432).

## Answered Questions

**Q: What is the difference between a Work, an Expression, and an Asset?**
A Work is the intellectual creation (e.g., "The Bible"). An Expression is a
specific version or realisation (e.g., "King James Version"). An Asset is a
concrete file (e.g., "bible.pdf"). Multiple Assets can represent the same
Expression; multiple Expressions can realise the same Work.

**Q: Where are PDFs and videos actually stored?**
Outside the Brain — in S3, GCS, Azure Blob, or a local filesystem. The Brain
stores only the Asset metadata record (id, type, uri, checksum, sizeBytes) and
uses the URI to reference the actual file when extraction is needed.

**Q: What is the difference between a Derivative and a Leaf?**
A Derivative (transcript, OCR text, chunks, embeddings) is a generated artifact
produced from an Asset. It is not canonical and can be regenerated at any time.
A Leaf is a canonical knowledge unit (belief, decision, concept, question) that
is the result of interpreting and resolving extracted information. Leaves are
the source of truth; Derivatives are processing intermediates.

**Q: How does extraction guarantee auditability?**
Each extraction operation links: the Asset (uri, checksum), the extraction
method used (OCR, transcription, source analysis), the Derivatives produced,
the Evidence created with specific page/timestamp/line references, and the
Leaves that resulted. This chain means any belief can be traced back to the
exact location in the exact file that supports it.
