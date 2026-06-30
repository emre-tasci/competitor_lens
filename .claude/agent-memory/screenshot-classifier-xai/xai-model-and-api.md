---
name: xai-model-and-api
description: Current working xAI (Grok) vision model name and how to verify the lineup; the old hardcoded model is dead
metadata:
  type: reference
---

xAI Chat Completions: OpenAI-compatible, base URL `https://api.x.ai/v1` (use the `openai` npm client with `baseURL`).

**The model name in `scripts/classify-all.ts` (`grok-2-vision-1212`) is DEAD** — returns `400 "Model not found"`. The lineup rotates, so ALWAYS verify before a run:
- `GET /v1/models` lists ids.
- `GET /v1/language-models` lists ids WITH `input_modalities` — pick one whose input includes `image`.

As of 2026-06-30 the vision-capable (input includes `image`) models were:
`grok-4.20-0309-non-reasoning`, `grok-4.20-0309-reasoning`, `grok-4.20-multi-agent-0309`, `grok-4.3`, `grok-build-0.1`.

**Chosen for batch UI classification: `grok-4.20-0309-non-reasoning`** — fastest/cheapest tier, supports `temperature` (set 0.1), accurate enough for screenshot→feature labeling with a folder hint. Reserve reasoning variants only for ambiguous images. Confirmed working on a 5-image smoke test (all matched correctly).
