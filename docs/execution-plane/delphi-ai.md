---
name: delphi-ai
description: Multi-provider LLM adapter and multi-agent consensus layer — unifies OpenAI, Anthropic, Google, and Ollama behind a single interface integrated into delphi-core workflows
owner: engineering
status: active
---

# delphi-ai

`@goatlab/delphi-ai` is the AI integration layer for the Delphi execution plane. It wraps the Vercel AI SDK with a uniform `LLMAdapter`, tool-call loops wired to workflow skills, and a multi-agent consensus orchestrator. It integrates directly with `@goatlab/delphi-core` for budget enforcement and step-level state persistence.

## Responsibilities

- Provide a single `LLMAdapter` that routes calls to OpenAI, Anthropic, Google, or Ollama.
- Run tool-call loops that dispatch to typed workflow skills (functions the LLM can invoke).
- Orchestrate multi-agent consensus via `AgreementOrchestrator`: propose → critique → vote → commit.
- Report token and cost usage back to `delphi-core` budgets so limits are enforced.
- Apply circuit breakers and retry-with-back-off for resilient LLM calls.

## Key concepts

- **LLMAdapter**: instantiated without arguments; provider and model are chosen per call or via named presets (`fast`, `quality`, etc.).
- **Model presets**: shortcuts like `adapter.chatFromPreset('fast', messages)` avoid repeating provider/model strings.
- **AIStepExecutor**: a `delphi-core` step executor that runs `handle()` as an LLM call with full retries and budget tracking. Register with `createEngine({ extraExecutors })`.
- **AgreementOrchestrator**: fan-out to N agents in parallel, collect critiques, vote, and return the agreed output.

## Supported providers

- OpenAI (via `@ai-sdk/openai`)
- Anthropic (via `@ai-sdk/anthropic`)
- Google Generative AI (via `@ai-sdk/google`)
- Ollama (via `ollama-ai-provider`)

Each provider requires its API key in the corresponding environment variable (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, or Ollama host config).

## Published package

Package name `@goatlab/delphi-ai` is published to npm and consumed in production. Do not rename.

## Relationships

- Depends on `@goatlab/delphi-core` for the `StepExecutor` interface and budget accounting.
- `delphi-governance` optionally wires an `LLMAdapter` into `createLLMPerspectiveEvaluator`.
