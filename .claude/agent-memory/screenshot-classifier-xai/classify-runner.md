---
name: classify-runner
description: How to run the screenshot batch classifier, folder-hint heuristic, and matching behavior
metadata:
  type: project
---

Base tooling: `scripts/classify-all.ts` (pulls `classifiedAt: null`, S3→base64, Grok vision, writes back). It is sequential, does NOT pass the folder hint, and hardcodes the dead model — see [[xai-model-and-api]].

For runs I use a throwaway `_classify_tmp.ts` at repo root (delete when done per guardrails — do NOT commit, do NOT touch `src/app` or `src/components`; another agent edits the UI). Improvements over the base script:
- **Folder hint:** middle folder of the S3 key (`parts[len-2]`) passed to the prompt as a strong hint. Folder names usually equal a Feature name, so this drives high-accuracy matches.
- **System prompt is Turkish** (crypto-exchange domain); instructs the model to pick a feature name verbatim from the 52.
- **Matching:** case-insensitive `.trim()` map (model returns lowercase, e.g. `ai sentimentals`). Unmatched → `featureId null` + logged.
- **Concurrency** worker pool (`CONCURRENCY`, used 5), `LIMIT` for smoke tests, exponential backoff retry on 429/5xx/parse errors.

**Policy:** prefer mapping to existing 52 features; only create a new Feature if a screenshot genuinely fits none, attaching it to the best existing FeatureCategory. Review the unmatched set after a run before creating anything.
