# RFC-0020 — Works, Assets & Knowledge Extraction
## Separating Reality, Artifacts and Understanding

Status: Draft

Depends On:
- RFC-0000 through RFC-0019

---

# Purpose

Knowledge does not appear magically.

Knowledge originates from artifacts.

Examples:

- Books
- PDFs
- Videos
- Audio Recordings
- Websites
- Emails
- Presentations
- Source Code Repositories
- Research Papers

This RFC defines how Delphi models:

- Works
- Expressions
- Assets
- Extraction
- Evidence
- Knowledge

---

# Core Principle

Assets are not knowledge.

Assets contain knowledge.

Knowledge must be extracted from assets before it becomes part of a Brain.

---

# The Universal Pipeline

Reality
↓
Work
↓
Expression
↓
Asset
↓
Extraction
↓
Evidence
↓
Knowledge
↓
Indexes
↓
Understanding

---

# Why This Exists

Without separation:

Bible.pdf
Bible.epub
Bible.mp3

become unrelated objects.

With separation:

The Bible
↓
King James Version
↓
Bible.pdf

All representations share a common identity.

---

# Work

A Work is an intellectual creation.

Examples:

- The Bible
- The Iliad
- The Art of War
- Principia Mathematica
- RFC-0001

A Work exists independently of any file.

---

# Expression

An Expression is a realization of a Work.

Examples:

The Bible

Expressions:

- King James Version
- New International Version
- Reina Valera

The Work remains the same.

The Expression differs.

---

# Asset

An Asset is a concrete artifact.

Examples:

- PDF
- EPUB
- Video File
- Audio File
- Website Snapshot
- Presentation

Assets are stored outside the Brain.

---

# Storage Rule

Brains store:

- Metadata
- References
- Knowledge
- Evidence

Brains do NOT store:

- Large PDFs
- Videos
- Audio Files

Recommended:

S3
GCS
Azure Blob
Filesystem

---

# Asset Metadata

Example:

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

---

# Extraction

Extraction transforms assets into structured information.

Examples:

PDF
→ OCR
→ Text

Video
→ Transcript

Audio
→ Transcript

Repository
→ Source Graph

---

# Derivatives

Extraction creates derivatives.

Examples:

- Transcript
- OCR Text
- Chunks
- Embeddings
- Summaries
- Entities
- Citations
- Topics

Derivatives are generated artifacts.

---

# Evidence

Evidence references assets.

Example:

Belief:

Roman economic decline contributed to collapse.

Evidence:

RomanHistory.pdf
Page 132

Evidence points to assets.

---

# Knowledge

Knowledge is extracted meaning.

Examples:

Concept:
Roman Economy

Belief:
Inflation contributed to instability

Question:
How significant was inflation?

Knowledge becomes Leaves.

---

# Indexes

Indexes summarize knowledge regions.

Indexes are generated from leaves.

Assets never generate indexes directly.

---

# Canonical Rule

Assets
≠
Knowledge

Knowledge
≠
Understanding

Understanding
=
Indexes

---

# Books

Books illustrate the full hierarchy.

Example:

Work
→ The Bible

Expression
→ King James Version

Asset
→ bible.pdf

Evidence
→ Genesis 1

Knowledge
→ Creation Narrative

Index
→ Bible Index

---

# Videos

Example:

Work
→ University Lecture

Expression
→ English Recording

Asset
→ lecture.mp4

Derivative
→ Transcript

Evidence
→ Timestamp 12:31

Knowledge
→ Extracted Concepts

Index
→ Lecture Index

---

# Research Papers

Work
→ Original Paper

Expression
→ Published Version

Asset
→ PDF

Evidence
→ Figure 4

Knowledge
→ Findings

Index
→ Topic Index

---

# Source Code

Work
→ Project

Expression
→ Release Version

Asset
→ Git Repository

Evidence
→ Commit

Knowledge
→ Architecture Concepts

Index
→ System Index

---

# Asset Lineage

Every artifact should be traceable.

Work
↓
Expression
↓
Asset
↓
Derivative
↓
Evidence
↓
Knowledge

---

# Canonical Rules

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

---

# Success Criteria

1. Large files are not stored in the Brain.
2. Knowledge remains portable.
3. Evidence remains traceable.
4. Multiple asset formats share a common identity.
5. Knowledge extraction is auditable.
6. Assets and knowledge remain separated.
7. Indexes summarize extracted understanding.
8. Brains scale independently from asset storage.
