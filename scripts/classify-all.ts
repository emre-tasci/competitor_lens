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

async function getBase64(s3Key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key });
  const res = await s3.send(cmd);
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty S3 response");
  return Buffer.from(bytes).toString("base64");
}

async function classify(base64: string, categories: string[], features: string[], hint?: string) {
  const hintText = hint
    ? `\n\nİPUCU: Bu screenshot "${hint}" klasöründen geldi.`
    : "";
  const mediaType = base64.startsWith("/9j/") ? "image/jpeg" : "image/png";

  const res = await xai.chat.completions.create({
    model: "grok-2-vision-1212",
    messages: [
      {
        role: "system",
        content: `Sen bir kripto para borsası uzmanısın. Ekran görüntülerini analiz edip hangi feature'a ait olduğunu belirliyorsun. Sadece JSON döndür.`,
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
          {
            type: "text",
            text: `Bu kripto borsası ekran görüntüsünü analiz et.

Olası kategoriler: ${JSON.stringify(categories)}
Olası özellikler: ${JSON.stringify(features)}
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
}

async function main() {
  const categories = await prisma.featureCategory.findMany({ select: { name: true } });
  const features = await prisma.feature.findMany({ select: { id: true, name: true, categoryId: true } });
  const categoryNames = categories.map((c) => c.name);
  const featureNames = features.map((f) => f.name);

  const screenshots = await prisma.screenshot.findMany({
    where: { classifiedAt: null },
    include: { exchange: true },
    orderBy: { uploadedAt: "asc" },
  });

  console.log(`Toplam sınıflandırılacak: ${screenshots.length}`);
  let success = 0, fail = 0;

  for (let i = 0; i < screenshots.length; i++) {
    const ss = screenshots[i];
    const tag = `[${i + 1}/${screenshots.length}] ${ss.exchange.name} - ${ss.s3Url.split("/").pop()}`;

    try {
      const base64 = await getBase64(ss.s3Url);
      const result = await classify(base64, categoryNames, featureNames);

      const matched = features.find(
        (f) => f.name.toLowerCase() === result.feature?.toLowerCase()
      );

      await prisma.screenshot.update({
        where: { id: ss.id },
        data: {
          aiClassification: result,
          aiConfidence: result.confidence,
          featureId: matched?.id || null,
          categoryId: matched?.categoryId || null,
          classifiedAt: new Date(),
        },
      });

      success++;
      console.log(`${tag} -> ${result.category} > ${result.feature} (${result.confidence})`);
    } catch (err: unknown) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${tag} HATA: ${msg}`);
    }

    // Rate limit - 500ms between calls
    if (i < screenshots.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\n--- Sonuç ---`);
  console.log(`  Başarılı: ${success}`);
  console.log(`  Hatalı: ${fail}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
