import OpenAI from "openai";
import {
  AXIS_A_LABELS,
  AXIS_B_LABELS,
  AXIS_B_OVERLAY,
  OUT_OF_SCOPE_A,
  isValidAxisA,
  isValidAxisB,
  TAXONOMY_VERSION,
} from "./taxonomy";

// ---------- Types (§7 canonical record, model-facing subset) ----------
export interface AxisLabel {
  label: string;
  primary: boolean;
  confidence: number;
}
export interface RawClassification {
  source_app: string | null;
  source_app_confidence: number | null;
  captured_platform: string | null; // ios | android | web | unknown
  language: string | null;
  axis_a: AxisLabel[];
  axis_b: AxisLabel[];
  overlay_present: boolean;
  salient_text: string[];
  rationale: string;
  needs_review: boolean;
  review_reason: string | null;
  taxonomy_gap: { proposed_area: string | null; proposed_screen: string | null; reason: string } | null;
}

export interface ClassificationOutcome extends RawClassification {
  modelTier: 1 | 2;
  modelName: string;
  modelMode: "non_reasoning" | "reasoning";
}

const CONF_FLOOR = 0.35;

// ---------- Model discovery (§3) ----------
const CANONICAL_ALIASES = ["grok-4.3", "grok-4", "grok-vision", "grok-2-vision-1212"];
let cachedModel: string | null = null;

export async function resolveModel(client: OpenAI): Promise<string> {
  if (cachedModel) return cachedModel;
  try {
    const list = await client.models.list();
    const ids = list.data.map((m) => m.id);
    // Prefer canonical alias over dated SKUs so we survive retirements.
    for (const alias of CANONICAL_ALIASES) {
      if (ids.includes(alias)) {
        cachedModel = alias;
        return alias;
      }
    }
    // Otherwise newest general multimodal grok model (has "vision" or grok-4+).
    const vision = ids
      .filter((id) => /grok/.test(id) && /(vision|4|multimodal)/.test(id))
      .sort()
      .reverse();
    cachedModel = vision[0] || ids.find((id) => /grok/.test(id)) || "grok-2-vision-1212";
  } catch {
    cachedModel = "grok-2-vision-1212"; // defensive fallback
  }
  return cachedModel!;
}

// ---------- System prompt with taxonomy embedded verbatim (§4) ----------
function systemPrompt(): string {
  return `You are a screenshot classification engine for crypto exchange mobile/web apps.
Classify each screenshot on TWO INDEPENDENT AXES using ONLY the controlled vocabulary below. Never invent labels.

AXIS A — Functional Area (emit exact slug "area:screen"). Valid slugs:
${AXIS_A_LABELS.join(", ")}
If (and only if) no Axis-A slug fits, use "${OUT_OF_SCOPE_A}", set needs_review true, and fill taxonomy_gap.

AXIS B — UI Screen Type (emit exact slug). Valid slugs:
${AXIS_B_LABELS.join(", ")}
Overlay types (${[...AXIS_B_OVERLAY].join(", ")}) layer on top of a base screen.

RULES:
- Multi-label is normal on BOTH axes. Emit every applicable label.
- On EACH axis mark exactly one label primary:true (dominant read) and the rest primary:false.
- confidence in [0,1] per label. Only emit labels with confidence >= ${CONF_FLOOR}.
- OVERLAY SPLIT RULE: if an overlay (modal/bottom_sheet/selector/toast_banner/signing_sheet) is open, set overlay_present true, the overlay becomes the PRIMARY Axis-B label, and Axis A INHERITS the function of the screen behind it (add the underlying screen's area as secondary).
- Infer source_app (e.g. binance, coinbase, okx, bybit, kraken, btcturk, ...) and captured_platform (ios|android|web|unknown) with your best read; use null when unsure. Prefer null over guessing.
- language = ISO code of the dominant on-screen language (e.g. en, tr).
- salient_text = the few OCR anchors that drove your decision.
- rationale = ONE sentence.
- needs_review true when top confidence on either axis < 0.6, out-of-scope, unreadable language, or corrupt/partial image; give a short review_reason.
Disambiguation: coin chart+info => markets:coin_detail + ui:detail; buy/sell sheet open on it => add spot_trading:order_entry + ui:bottom_sheet. Pro terminal => spot_trading:pro_terminal (ui:chart if chart dominates, ui:data_table if order book dominates). Home dashboard (markets+promos) vs wallet:overview (balances+deposit/withdraw) — both ui:dashboard. Deposit address+QR => deposit:address_qr + ui:qr_scanner; "received" => deposit:status + ui:result_status. KYC camera => kyc:doc_capture + ui:qr_scanner.
Return ONLY structured JSON matching the schema.`;
}

// ---------- Structured output schema (§7) ----------
const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "screenshot_classification",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        source_app: { type: ["string", "null"] },
        source_app_confidence: { type: ["number", "null"] },
        captured_platform: { type: ["string", "null"], enum: ["ios", "android", "web", "unknown", null] },
        language: { type: ["string", "null"] },
        axis_a: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              primary: { type: "boolean" },
              confidence: { type: "number" },
            },
            required: ["label", "primary", "confidence"],
          },
        },
        axis_b: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              primary: { type: "boolean" },
              confidence: { type: "number" },
            },
            required: ["label", "primary", "confidence"],
          },
        },
        overlay_present: { type: "boolean" },
        salient_text: { type: "array", items: { type: "string" } },
        rationale: { type: "string" },
        needs_review: { type: "boolean" },
        review_reason: { type: ["string", "null"] },
        taxonomy_gap: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            proposed_area: { type: ["string", "null"] },
            proposed_screen: { type: ["string", "null"] },
            reason: { type: "string" },
          },
          required: ["proposed_area", "proposed_screen", "reason"],
        },
      },
      required: [
        "source_app", "source_app_confidence", "captured_platform", "language",
        "axis_a", "axis_b", "overlay_present", "salient_text", "rationale",
        "needs_review", "review_reason", "taxonomy_gap",
      ],
    },
  },
};

// ---------- Single model call ----------
async function callModel(
  client: OpenAI,
  model: string,
  base64: string,
  reasoning: boolean
): Promise<RawClassification> {
  const mediaType = base64.startsWith("/9j/") ? "image/jpeg" : "image/png";
  const base = () => ({
    model,
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: [
          { type: "text", text: "Classify this screenshot per the taxonomy. Multi-label both axes. Return only JSON." },
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
        ],
      },
    ],
  });

  // Capability may vary by SKU. Degrade: json_schema -> json_object -> plain,
  // and drop reasoning_effort if a SKU rejects it. isBadRequest => try next
  // variant; network/5xx/429 bubble up to the caller's retry/backoff.
  const variants: Record<string, unknown>[] = [
    { ...base(), response_format: RESPONSE_SCHEMA, reasoning_effort: reasoning ? "high" : "none" },
    { ...base(), response_format: { type: "json_object" }, reasoning_effort: reasoning ? "high" : "none" },
    { ...base(), response_format: { type: "json_object" } },
    { ...base() },
  ];

  let lastErr: unknown;
  for (const params of variants) {
    try {
      const res = await client.chat.completions.create(params as never);
      const content = (res as { choices: { message: { content: string | null } }[] }).choices[0].message.content || "{}";
      return JSON.parse(content.replace(/```json\n?|```\n?/g, "").trim());
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      // Only fall through on 4xx capability rejections; rethrow transient errors.
      if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("all response_format variants failed");
}

// ---------- Normalization + validation (§5) ----------
function normalize(raw: RawClassification): RawClassification {
  const clean = (arr: AxisLabel[], valid: (l: string) => boolean) => {
    const seen = new Set<string>();
    return (arr || [])
      .filter((x) => x && typeof x.label === "string" && valid(x.label) && x.confidence >= CONF_FLOOR)
      .filter((x) => (seen.has(x.label) ? false : (seen.add(x.label), true)))
      .map((x) => ({ label: x.label, primary: !!x.primary, confidence: Math.max(0, Math.min(1, x.confidence)) }));
  };
  const ensurePrimary = (arr: AxisLabel[]) => {
    if (arr.length === 0) return arr;
    const primaries = arr.filter((x) => x.primary);
    if (primaries.length === 1) return arr;
    // Reset: highest-confidence label becomes the sole primary.
    const top = [...arr].sort((a, b) => b.confidence - a.confidence)[0];
    return arr.map((x) => ({ ...x, primary: x.label === top.label }));
  };

  let axis_a = ensurePrimary(clean(raw.axis_a, isValidAxisA));
  let axis_b = ensurePrimary(clean(raw.axis_b, isValidAxisB));

  // Overlay split rule (§5.4): if an overlay label is present, it must be primary on B.
  const overlayLabels = axis_b.filter((x) => AXIS_B_OVERLAY.has(x.label));
  const overlay_present = raw.overlay_present || overlayLabels.length > 0;
  if (overlayLabels.length > 0) {
    const topOverlay = overlayLabels.sort((a, b) => b.confidence - a.confidence)[0];
    axis_b = axis_b.map((x) => ({ ...x, primary: x.label === topOverlay.label }));
  }

  // Guarantee non-empty axes (fallback -> out of scope / review).
  if (axis_a.length === 0) {
    axis_a = [{ label: OUT_OF_SCOPE_A, primary: true, confidence: 0.3 }];
  }
  if (axis_b.length === 0) {
    axis_b = [{ label: "ui:detail", primary: true, confidence: 0.3 }];
  }

  const topA = Math.max(...axis_a.map((x) => x.confidence));
  const topB = Math.max(...axis_b.map((x) => x.confidence));
  const isOOS = axis_a.some((x) => x.label === OUT_OF_SCOPE_A);
  const needs_review = raw.needs_review || isOOS || topA < 0.6 || topB < 0.6;
  const review_reason =
    raw.review_reason ||
    (isOOS ? "out_of_scope" : topA < 0.6 || topB < 0.6 ? "low_confidence" : null);

  return {
    ...raw,
    axis_a,
    axis_b,
    overlay_present,
    salient_text: raw.salient_text || [],
    rationale: raw.rationale || "",
    needs_review,
    review_reason,
    taxonomy_gap: isOOS ? raw.taxonomy_gap ?? { proposed_area: null, proposed_screen: null, reason: "out of scope" } : raw.taxonomy_gap,
  };
}

// ---------- Escalation decision (§3) ----------
function shouldEscalate(n: RawClassification): boolean {
  const topA = Math.max(0, ...n.axis_a.map((x) => x.confidence));
  const topB = Math.max(0, ...n.axis_b.map((x) => x.confidence));
  if (topA < 0.75 || topB < 0.75) return true;
  const close = (arr: AxisLabel[]) => {
    const s = [...arr].sort((a, b) => b.confidence - a.confidence);
    return s.length >= 2 && s[0].confidence - s[1].confidence < 0.1 &&
      // genuine ambiguity only when they compete for primary (both high)
      s[1].confidence >= 0.6 && s[0].label !== s[1].label;
  };
  if (close(n.axis_a) || close(n.axis_b)) return true;
  if (n.overlay_present && topB < 0.8) return true;
  if (!n.salient_text || n.salient_text.length === 0) return true;
  return false;
}

// ---------- Public entry: full tiered classify (§3) ----------
export async function classifyScreenshotImage(
  client: OpenAI,
  base64: string,
  model: string
): Promise<ClassificationOutcome> {
  // Tier 1
  const t1raw = await callModel(client, model, base64, false);
  const t1 = normalize(t1raw);
  if (!shouldEscalate(t1)) {
    return { ...t1, modelTier: 1, modelName: model, modelMode: "non_reasoning" };
  }
  // Tier 2 adjudication
  try {
    const t2raw = await callModel(client, model, base64, true);
    const t2 = normalize(t2raw);
    return { ...t2, modelTier: 2, modelName: model, modelMode: "reasoning" };
  } catch {
    return { ...t1, modelTier: 1, modelName: model, modelMode: "non_reasoning" };
  }
}

export { TAXONOMY_VERSION };
