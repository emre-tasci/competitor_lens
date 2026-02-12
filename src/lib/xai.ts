import OpenAI from "openai";

function getXaiClient() {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY || "",
    baseURL: "https://api.x.ai/v1",
  });
}

export interface ClassificationResult {
  category: string;
  feature: string;
  confidence: number;
  description: string;
  ui_elements: string[];
}

export async function classifyScreenshot(
  imageUrl: string,
  categories: string[],
  features: string[]
): Promise<ClassificationResult> {
  const response = await getXaiClient().chat.completions.create({
    model: "grok-2-vision-1212",
    messages: [
      {
        role: "system",
        content:
          "Sen bir kripto para borsası uzmanısın. Ekran görüntülerini analiz edip hangi feature kategorisine ait olduğunu belirliyorsun. Sadece JSON döndür.",
      },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          {
            type: "text",
            text: `Bu kripto borsası ekran görüntüsünü analiz et.

Olası kategoriler: ${JSON.stringify(categories)}
Olası özellikler: ${JSON.stringify(features)}

JSON formatında döndür:
{
  "category": "kategori adı",
  "feature": "özellik adı",
  "confidence": 0.0-1.0,
  "description": "kısa açıklama",
  "ui_elements": ["tespit edilen UI elementleri"]
}`,
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const content = response.choices[0].message.content || "{}";
  const cleaned = content.replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

export interface FeatureUpdate {
  feature: string;
  old_status: string;
  new_status: string;
  confidence: number;
  evidence: string;
  source_url?: string;
}

export async function checkExchangeFeatures(
  exchangeName: string,
  exchangeWebsite: string,
  currentFeatures: { name: string; status: string }[]
): Promise<FeatureUpdate[]> {
  const response = await getXaiClient().chat.completions.create({
    model: "grok-3-mini",
    messages: [
      {
        role: "system",
        content: `Sen bir kripto para borsası analisti olarak çalışıyorsun.
Verilen borsanın güncel özelliklerini kontrol edip, feature listesinde değişiklik olup olmadığını belirle.
Sadece JSON döndür.`,
      },
      {
        role: "user",
        content: `Borsa: ${exchangeName}
Website: ${exchangeWebsite}

Mevcut feature durumları:
${currentFeatures.map((f) => `- ${f.name}: ${f.status}`).join("\n")}

Yukarıdaki özelliklerden hangilerinin durumu değişmiş olabilir?
Özellikle "not_available" olan ama artık "available" olabilecek özelliklere odaklan.

JSON formatında döndür:
{
  "updates": [
    {
      "feature": "özellik adı",
      "old_status": "not_available",
      "new_status": "available",
      "confidence": 0.0-1.0,
      "evidence": "Bu değişikliğe dair kanıt/kaynak",
      "source_url": "referans URL (varsa)"
    }
  ],
  "checked_at": "ISO date"
}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content || "{}";
  const cleaned = content.replace(/```json\n?|```\n?/g, "").trim();
  const result = JSON.parse(cleaned);
  return result.updates || [];
}
