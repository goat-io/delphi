# RFC-9999 — Delphi Specification Index
## Master Navigation Document

Status: Draft

Purpose:

This document serves as the master index for the Delphi specification.

It defines:

- RFC hierarchy
- Dependencies
- Reading order
- Implementation order
- Concept relationships

---

# Vision

Delphi is an Agent Knowledge & Decision Protocol.

Its purpose is to help intelligent systems:

- Acquire Knowledge
- Evaluate Knowledge
- Make Decisions
- Generate Research
- Evolve Ontologies
- Improve Continuously

---

# Recommended Reading Order

## Phase 1 — Foundations

RFC-0000 Constitution

RFC-0001 Delphi Meta Model

RFC-0002 Leaf Protocol

RFC-0003 Knowledge & Confidence Theory

These define:

What Delphi is.

What it is made of.

What knowledge is.

What a leaf is.

---

## Phase 2 — Trust

RFC-0004 Evidence & Provenance

RFC-0005 Evaluation & Rubrics

These define:

Why we believe things.

How we evaluate quality.

---

## Phase 3 — Structure

RFC-0006 Ontology System

RFC-0015 Migration & Versioning

These define:

How knowledge is classified.

How classification evolves.

---

## Phase 4 — Intelligence

RFC-0007 Search & Navigation

RFC-0008 Agents & Research Engine

RFC-0013 Capabilities & Methodologies

These define:

How agents think.

How agents navigate.

How agents perform work.

---

## Phase 5 — Networks

RFC-0009 Brains & Federation

RFC-0014 APIs & Contracts

These define:

How brains communicate.

How interoperability works.

---

## Phase 6 — Runtime

RFC-0010 Infrastructure & Runtime

RFC-0017 Implementation Roadmap

These define:

How Delphi is built.

How Delphi is deployed.

---

## Phase 7 — Decision Making

RFC-0012 Decision Theory

RFC-0011 Knowledge Economics

These define:

How decisions are made.

How uncertainty is prioritized.

---

## Phase 8 — Universality

RFC-0016 Example Brains

RFC-0018 Universal Knowledge Model

These define:

Why Delphi is domain independent.

Why the protocol is universal.

---

## Phase 9 — Understanding & Navigation

RFC-0019 Knowledge Indexes & Hierarchical Summaries

RFC-0023 Knowledge Maps

RFC-0024 Delphi Query Language

RFC-0028 Knowledge Regions & Index Lifecycle

These define:

How knowledge is compressed.

How knowledge is navigated.

How regions form and indexes stay fresh.

---

## Phase 10 — Knowledge Lifecycle

RFC-0020 Works, Assets & Knowledge Extraction

RFC-0027 Extraction & Entity Resolution

RFC-0031 Candidate Staging Protocol

RFC-0021 Epistemology & Truth Model

RFC-0022 Dependency & Impact Propagation

These define:

How artifacts become knowledge without duplication.

How candidates are held, reviewed, and resolved before canonicalization.

How truth and uncertainty are modeled.

How change propagates.

---

## Phase 11 — Evolution & Work

RFC-0025 Ontology Evolution & Governance

RFC-0026 Tasks & Questions

RFC-0029 Task Execution Protocol

RFC-0030 Task Scheduling & Priority Queue

These define:

How classification evolves.

How uncertainty becomes work.

How agents claim, execute, and close tasks.

How the Brain orders and budgets future work.

---

# Dependency Graph

RFC-0000
│
├── RFC-0001
│
├── RFC-0002
│   ├── RFC-0003
│   │   ├── RFC-0004
│   │   │   ├── RFC-0020
│   │   │   │   └── RFC-0027
│   │   │   │       └── RFC-0031
│   │   │   └── RFC-0021
│   │   ├── RFC-0005
│   │   ├── RFC-0012
│   │   ├── RFC-0011
│   │   └── RFC-0022
│   │
│   ├── RFC-0006
│   │   ├── RFC-0015
│   │   └── RFC-0025
│   │
│   ├── RFC-0019
│   │   ├── RFC-0023
│   │   ├── RFC-0024
│   │   └── RFC-0028
│   │
│   ├── RFC-0007
│   ├── RFC-0008
│   │   └── RFC-0026
│   │       └── RFC-0029
│   │           └── RFC-0030
│   ├── RFC-0013
│   ├── RFC-0009
│   ├── RFC-0014
│   ├── RFC-0010
│   ├── RFC-0016
│   └── RFC-0018

---

# Core Questions

## Knowledge

What do we believe?

RFC-0003

---

## Evidence

Why do we believe it?

RFC-0004

---

## Evaluation

How good is it?

RFC-0005

---

## Decisions

What should we do?

RFC-0012

---

## Research

What should we learn next?

RFC-0008
RFC-0011

---

## Ontology

How do we classify it?

RFC-0006

---

## Federation

How do brains collaborate?

RFC-0009

---

## Runtime

How is it implemented?

RFC-0010

---

# Delphi Architecture Stack

Layer 8
Universal Knowledge Model
RFC-0018

Layer 7
Brains & Federation
RFC-0009

Layer 6
Agents & Research
RFC-0008

Layer 5
Search & Navigation
RFC-0007

Layer 4
Ontology
RFC-0006

Layer 3
Evaluation
RFC-0005

Layer 2
Evidence
RFC-0004

Layer 1
Knowledge
RFC-0003

Layer 0
Leaf Protocol
RFC-0002

Foundation
Constitution
RFC-0000

---

# Specification Status

All RFCs through RFC-0031 are written (Status: Draft).

Implementation documents:

DELPHI-MVP-0001 — First Implementation Plan

Known open areas (no RFC yet):

- Security & Access Control
  (visibility enforcement, PII, federation trust details)

- Human Review Interface — UI Surface
  (approval UI; review queue protocol now covered by RFC-0031)

- Temporal Queries
  (as-of-time traversal; listed as DQL future extension)

---

# Suggested Build Order

Phase 1

RFC-0002
RFC-0010

Build:

Leaves
Events
Storage

---

Phase 2

RFC-0003
RFC-0004

Build:

Knowledge
Evidence
Confidence

---

Phase 3

RFC-0005

Build:

Rubrics
Evaluations

---

Phase 4

RFC-0006

Build:

Ontology Engine

---

Phase 5

RFC-0007

Build:

Search
Navigation

---

Phase 6

RFC-0008
RFC-0013

Build:

Research Agents
Capabilities

---

Phase 7

RFC-0012
RFC-0011

Build:

Decision Engine
Knowledge Economics

---

Phase 8

RFC-0009
RFC-0014

Build:

Federation

---

# Final Statement

The Delphi specification describes a system for continuously improving an intelligent model of reality.

Knowledge is only one component.

Evaluation, decision-making, research, ontology evolution, federation, and continuous learning are equally important.

The goal of Delphi is not to answer questions.

The goal of Delphi is to continuously improve understanding.
