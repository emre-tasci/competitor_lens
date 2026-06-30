import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import OpenAI from "openai";

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || "",
  baseURL: "https://api.x.ai/v1",
});

const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : undefined;
const CONCURRENCY = process.env.CONCURRENCY ? parseInt(process.env.CONCURRENCY, 10) : 4;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getBase64(s3Key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key });
  const res = await s3.send(cmd);
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty S3 response");
  return Buffer.from(bytes).toString("base64");
}

function folderHint(s3Url: string): string | undefined {
  // screenshots/<Exchange>/<FeatureFolder>/<file>
  const parts = s3Url.split("/");
  if (parts.length >= 3) return parts[parts.length - 2];
  return undefined;
}

async function classify(base64: string, categories: string[], features: string[], hint?: string) {
  const hintText = hint ? `\n\nİPUCU: Bu screenshot "${hint}" klasöründen geldi (güçlü ipucu).` : "";
  const mediaType = base64.startsWith("/9j/") ? "image/jpeg" : "image/png";

  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await xai.chat.completions.create({
        model: process.env.XAI_MODEL || "grok-4.20-0309-non-reasoning",
        messages: [
          {
            role: "system",
            content: `Sen bir kripto para borsası uzmanısın. Ekran görüntülerini analiz edip hangi feature'a ait olduğunu belirliyorsun. SADECE verilen "feature" listesinden EN UYGUN olanı seç ve ismini birebir aynı yaz. Sadece JSON döndür.`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
              {
                type: "text",
                text: `Bu kripto borsası ekran görüntüsünü analiz et.

Olası kategoriler: ${JSON.stringify(categories)}
Olası özellikler (SADECE bunlardan birini seç, ismini birebir kopyala): ${JSON.stringify(features)}
${hintText}

En yakın eşleşmeyi seç. JSON döndür:
{"category":"...","feature":"...","confidence":0.0-1.0,"description":"kısa açıklama","ui_elements":["..."]}`,
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });
      const content = res.choices[0].message.content || "{}";
      return JSON.parse(content.replace(/```json\n?|```\n?/g, "").trim());
    } catch (err: any) {
      lastErr = err;
      const status = err?.status || err?.response?.status;
      // retry on rate limit / transient server errors / parse issues
      const retryable = status === 429 || (status >= 500 && status < 600) || err instanceof SyntaxError || !status;
      if (!retryable || attempt === 4) throw err;
      const backoff = Math.min(30000, 1000 * Math.pow(2, attempt)) + Math.random() * 500;
      await sleep(backoff);
    }
  }
  throw lastErr;
}

async function main() {
  const categories = await prisma.featureCategory.findMany({ select: { name: true } });
  const features = await prisma.feature.findMany({ select: { id: true, name: true, categoryId: true } });
  const categoryNames = categories.map((c) => c.name);
  const featureNames = features.map((f) => f.name);
  const byName = new Map(features.map((f) => [f.name.toLowerCase().trim(), f]));

  const screenshots = await prisma.screenshot.findMany({
    where: { classifiedAt: null },
    include: { exchange: true },
    orderBy: { uploadedAt: "asc" },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(`To classify: ${screenshots.length} (concurrency=${CONCURRENCY}${LIMIT ? `, LIMIT=${LIMIT}` : ""})`);
  let success = 0, fail = 0, unmatched = 0, done = 0;
  const errors: string[] = [];

  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= screenshots.length) return;
      const ss = screenshots[i];
      const file = ss.s3Url.split("/").pop();
      const hint = folderHint(ss.s3Url);
      try {
        const base64 = await getBase64(ss.s3Url);
        const result = await classify(base64, categoryNames, featureNames, hint);
        const matched = byName.get(String(result.feature || "").toLowerCase().trim());
        if (!matched) {
          unmatched++;
          errors.push(`UNMATCHED feature="${result.feature}" hint="${hint}" key=${ss.s3Url}`);
        }
        await prisma.screenshot.update({
          where: { id: ss.id },
          data: {
            aiClassification: result,
            aiConfidence: result.confidence ?? null,
            featureId: matched?.id || null,
            categoryId: matched?.categoryId || null,
            classifiedAt: new Date(),
          },
        });
        success++;
        if (++done % 25 === 0 || LIMIT) {
          console.log(`[${done}/${screenshots.length}] ${ss.exchange.name}/${hint}/${file} -> ${result.feature} (conf ${result.confidence}, ${matched ? "matched" : "UNMATCHED"})`);
        }
      } catch (err: any) {
        fail++;
        done++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`FAIL key=${ss.s3Url} :: ${msg}`);
        console.error(`FAIL ${file}: ${msg}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\n--- Result ---`);
  console.log(`  success(written): ${success}`);
  console.log(`  of which unmatched feature: ${unmatched}`);
  console.log(`  failed: ${fail}`);
  if (errors.length) {
    console.log(`\n--- Errors / Unmatched (first 50) ---`);
    errors.slice(0, 50).forEach((e) => console.log("  " + e));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
