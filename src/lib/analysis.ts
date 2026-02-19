import { getXaiClient } from "./xai";
import { prisma } from "./db";

export type AnalysisType =
  | "daily_brief"
  | "weekly_summary"
  | "competitor_alert"
  | "trend_analysis";

/**
 * Generates an AI analysis based on recent data (tweets, news, announcements).
 */
export async function generateAnalysis(
  type: AnalysisType,
  exchangeId?: string
): Promise<{ id: string; title: string; content: string }> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const sinceDate = type === "weekly_summary" ? oneWeekAgo : oneDayAgo;

  // Gather recent data
  const whereExchange = exchangeId ? { exchangeId } : {};
  const whereExchangeOptional = exchangeId
    ? { exchangeId }
    : {};

  const [recentTweets, recentAnnouncements, recentNews, exchanges] =
    await Promise.all([
      prisma.tweet.findMany({
        where: { ...whereExchange, collectedAt: { gte: sinceDate } },
        include: { exchange: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 50,
      }),
      prisma.exchangeAnnouncement.findMany({
        where: { ...whereExchange, collectedAt: { gte: sinceDate } },
        include: { exchange: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 30,
      }),
      prisma.newsArticle.findMany({
        where: { ...whereExchangeOptional, collectedAt: { gte: sinceDate } },
        include: { exchange: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 30,
      }),
      prisma.exchange.findMany({
        select: { id: true, name: true, marketType: true },
      }),
    ]);

  // Build context for AI
  const tweetContext = recentTweets
    .map(
      (t) =>
        `[${t.exchange.name}] ${t.content} (${t.likeCount} beğeni, ${t.retweetCount} RT)`
    )
    .join("\n");

  const announcementContext = recentAnnouncements
    .map((a) => `[${a.exchange.name}] ${a.title}: ${a.aiSummary || a.content?.substring(0, 200)}`)
    .join("\n");

  const newsContext = recentNews
    .map(
      (n) =>
        `[${n.source}${n.exchange ? " - " + n.exchange.name : ""}] ${n.title}: ${n.aiSummary || n.content?.substring(0, 200)}`
    )
    .join("\n");

  const exchangeList = exchanges.map((e) => `${e.name} (${e.marketType})`).join(", ");

  const typePrompts: Record<AnalysisType, string> = {
    daily_brief: `Günlük rekabet brifingi oluştur. Bugünün önemli gelişmeleri, dikkat çeken tweetler, kritik duyurular ve sektör haberleri hakkında kısa bir özet yaz.`,
    weekly_summary: `Haftalık rekabet özeti oluştur. Bu haftanın en önemli gelişmeleri, trendler, borsa karşılaştırmaları ve stratejik öneriler hakkında kapsamlı bir analiz yaz.`,
    competitor_alert: `Rakip uyarı raporu oluştur. Rakip borsaların önemli hamlelerine, yeni özelliklerine, ortaklıklarına veya pazar değişikliklerine odaklan. Product ekibinin dikkat etmesi gereken noktaları vurgula.`,
    trend_analysis: `Sektör trend analizi oluştur. Merkezi kripto borsaları sektöründeki genel trendleri, ortak feature'ları, kullanıcı beklentilerini ve gelecek projeksiyonlarını analiz et.`,
  };

  const xai = getXaiClient();

  const response = await xai.chat.completions.create({
    model: "grok-3",
    messages: [
      {
        role: "system",
        content: `Sen bir kripto para borsası product ekibi için çalışan kıdemli rekabet analisti ve strateji danışmanısın.
Markdown formatında detaylı, aksiyona dönüştürülebilir analizler üretiyorsun.
Türkçe yaz. Profesyonel ama anlaşılır bir dil kullan.`,
      },
      {
        role: "user",
        content: `${typePrompts[type]}

Takip edilen borsalar: ${exchangeList}

=== SON TWEETLER ===
${tweetContext || "Veri yok"}

=== SON DUYURULAR ===
${announcementContext || "Veri yok"}

=== SON HABERLER ===
${newsContext || "Veri yok"}

Raporu Markdown formatında yaz. Başlıklar, maddeler ve vurgular kullan.
Önemli noktaları **kalın** ile vurgula.
Her bölümün sonunda kısa bir "Ne yapmalıyız?" önerisi ekle.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  });

  const analysisContent =
    response.choices[0].message.content || "Analiz oluşturulamadı.";

  // Generate title
  const titleMap: Record<AnalysisType, string> = {
    daily_brief: `Günlük Brifing - ${now.toLocaleDateString("tr-TR")}`,
    weekly_summary: `Haftalık Özet - ${now.toLocaleDateString("tr-TR")}`,
    competitor_alert: `Rakip Uyarı Raporu - ${now.toLocaleDateString("tr-TR")}`,
    trend_analysis: `Trend Analizi - ${now.toLocaleDateString("tr-TR")}`,
  };

  const period =
    type === "weekly_summary"
      ? `${now.getFullYear()}-W${String(Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, "0")}`
      : now.toISOString().split("T")[0];

  const analysis = await prisma.aIAnalysis.create({
    data: {
      exchangeId: exchangeId || null,
      analysisType: type,
      title: titleMap[type],
      content: analysisContent,
      period,
      dataSources: {
        tweetCount: recentTweets.length,
        announcementCount: recentAnnouncements.length,
        newsCount: recentNews.length,
      },
    },
  });

  return {
    id: analysis.id,
    title: analysis.title,
    content: analysis.content,
  };
}

/**
 * Generates a daily briefing for the product team.
 */
export async function generateDailyBrief() {
  return generateAnalysis("daily_brief");
}

/**
 * Generates a weekly summary.
 */
export async function generateWeeklySummary() {
  return generateAnalysis("weekly_summary");
}
