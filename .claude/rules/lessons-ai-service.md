---
paths: "apps/ai-service/**/*"
---

# AI Service Patterns

## Architecture
- AI service must be fully decoupled — no Redis, no DB connections. Pure stateless function: receives content + categories, returns embeddings + matches.
- Use in-process Python dict cache (keyed by tenant_id + tree hash), NOT Redis.

## Model Loading
- Use `hf_hub_download(repo_id, filename)` per file for ONNX models — `snapshot_download` doesn't resolve Git LFS files properly.
- ONNX models need 3-4x file size in RAM during init. Use lazy model loading (on first request, not all at startup).
- Provide smaller model option for local dev: `EMBEDDER_MODEL=bge-small` (130MB) vs `bge-m3` (2.2GB).

## Embeddings & Similarity
- BGE models compress similarity into narrow range (0.45-0.76). Don't use fixed thresholds — use relative ranking (top-N with confidence scores).
- Category embeddings: concatenate children/subcategory names as embedding text. The taxonomy IS the best training data.

## Infrastructure
- Don't use `env` from `_env/env.ts` in infrastructure code — crashes without `APP_ENV`. Use `config.env` from StackConfig.
- PostgreSQL image must include pgvector — use `pgvector/pgvector:pg17`, not standard `postgres:18-alpine`.
- Manual Docker containers: use different name than Pulumi-managed ones (e.g., `sodium-ai-service-dev`).

## HTTP
- httpx: always use `follow_redirects=True` and `headers={"User-Agent": "SodiumAI/1.0"}`.

## Video Processing
- Keyframe extraction: use Cochran's formula for statistical sampling (~68 frames max for any length video).
