import { getXaiClient } from "./xai";
import { prisma } from "./db";

export interface NewsData {
  title: string;
  content: string;
  url: string;
  source: string;
  imageUrl?: string;
  publishedAt?: string;
  relatedExchange?: string;
}

export interface NewsAnalysis {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  relevance: number;
  tags: string[];
}

/** Extract text content from an XML tag */
function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(`<${escaped}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${escaped}>`, "i")
  ) || xml.match(
    new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, "i")
  );
  return match?.[1]?.trim() || "";
}

/** Extract an attribute from an XML tag */
function extractAttr(xml: string, tag: string, attr: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(`<${escaped}[^>]*?${attr}=["']([^"']*)["']`, "i")
  );
  return match?.[1] || "";
}

const RSS_FEEDS = [
  { source: "CoinTelegraph", url: "https://cointelegraph.com/rss" },
  { source: "The Block", url: "https://www.theblock.co/rss.xml" },
  { source: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/feed" },
];

/**
 * Fetches and parses an RSS feed, returning news articles.
 */
async function fetchRSSFeed(
  feedUrl: string,
  source: string
): Promise<NewsData[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`RSS fetch failed for ${source}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const articles: NewsData[] = [];

    // Use regex to parse RSS/Atom XML (node-html-parser treats <link> as void)
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1] || match[2] || "";

      const title = extractTag(block, "title");
      // <link>url</link> or <link href="url" />
      const link =
        extractTag(block, "link") ||
        extractAttr(block, "link", "href") ||
        "";
      const description =
        extractTag(block, "description") ||
        extractTag(block, "summary") ||
        extractTag(block, "content:encoded") ||
        "";
      const pubDate =
        extractTag(block, "pubDate") ||
        extractTag(block, "published") ||
        extractTag(block, "updated") ||
        "";
      const imageUrl =
        extractAttr(block, "media:content", "url") ||
        extractAttr(block, "media:thumbnail", "url") ||
        extractAttr(block, "enclosure", "url") ||
        undefined;

      if (title && link) {
        const cleanContent = description
          .replace(/<!\[CDATA\[|\]\]>/g, "")
          .replace(/<[^>]*>/g, "")
          .substring(0, 500)
          .trim();

        articles.push({
          title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
          content: cleanContent,
          url: link,
          source,
          imageUrl,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
        });
      }
    }

    return articles.slice(0, 15); // Max 15 per feed
  } catch (error) {
    console.error(`Error fetching RSS from ${source}:`, error);
    return [];
  }
}

/**
 * Fetches real news from multiple RSS feeds.
 */
export async function fetchCryptoExchangeNews(
  exchangeNames: string[]
): Promise<NewsData[]> {
  const allArticles: NewsData[] = [];

  // Fetch all RSS feeds in parallel
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchRSSFeed(feed.url, feed.source))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
    }
  }

  // Filter for crypto exchange relevance
  const exchangeKeywords = exchangeNames.map((n) => n.toLowerCase());
  const cryptoKeywords = [
    "exchange", "borsa", "crypto", "bitcoin", "btc", "trading",
    "listing", "token", "defi", "regulation", "sec", "binance",
    "coinbase", "kraken", "okx", "bybit", "kucoin", "staking",
  ];

  // Mark which articles relate to specific exchanges
  const taggedArticles = allArticles.map((article) => {
    const lowerTitle = article.title.toLowerCase();
    const lowerContent = (article.content || "").toLowerCase();
    const text = lowerTitle + " " + lowerContent;

    // Find related exchange
    const relatedExchange = exchangeNames.find((name) =>
      text.includes(name.toLowerCase())
    );

    return { ...article, relatedExchange };
  });

  // Prioritize articles mentioning tracked exchanges, then general crypto
  const exchangeRelated = taggedArticles.filter((a) => a.relatedExchange);
  const cryptoRelated = taggedArticles.filter(
    (a) =>
      !a.relatedExchange &&
      cryptoKeywords.some(
        (kw) =>
          a.title.toLowerCase().includes(kw) ||
          (a.content || "").toLowerCase().includes(kw)
      )
  );

  // Return exchange-related first, then general crypto news
  return [...exchangeRelated, ...cryptoRelated].slice(0, 40);
}

/**
 * Analyzes a news article for sentiment and relevance using Grok.
 */
export async function analyzeNews(
  title: string,
  content: string
): Promise<NewsAnalysis> {
  const xai = getXaiClient();

  const response = await xai.chat.completions.create({
    model: "grok-3-mini",
    messages: [
      {
        role: "system",
        content: `Kripto para sektörü haberlerini analiz eden bir uzmansın. JSON döndür.`,
      },
      {
        role: "user",
        content: `Bu haberi analiz et:

Başlık: "${title}"
İçerik: "${content}"

JSON formatında döndür:
{
  "summary": "1-2 cümlelik Türkçe özet",
  "sentiment": "positive" | "negative" | "neutral",
  "relevance": 0.0-1.0 (merkezi kripto borsaları rekabeti için ne kadar ilgili),
  "tags": ["listing", "regulation", "security", "partnership", "product", "market", vs.]
}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });

  const text = response.choices[0].message.content || "{}";
  const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: title,
      sentiment: "neutral",
      relevance: 0.5,
      tags: [],
    };
  }
}

/**
 * Collects and stores news from real RSS feeds.
 */
export async function collectAllNews(): Promise<{
  total: number;
  new: number;
  errors: string[];
}> {
  const exchanges = await prisma.exchange.findMany({
    select: { id: true, name: true },
  });

  const exchangeNames = exchanges.map((e) => e.name);
  const exchangeMap = new Map(
    exchanges.map((e) => [e.name.toLowerCase(), e.id])
  );

  let total = 0;
  let newCount = 0;
  const errors: string[] = [];

  try {
    const news = await fetchCryptoExchangeNews(exchangeNames);
    total = news.length;

    for (const article of news) {
      // Check if article already exists
      const existing = await prisma.newsArticle.findUnique({
        where: { url: article.url },
      });

      if (existing) continue;

      // Find related exchange
      let exchangeId: string | null = null;
      if (article.relatedExchange) {
        exchangeId =
          exchangeMap.get(article.relatedExchange.toLowerCase()) || null;
      }

      // Analyze new article
      const analysis = await analyzeNews(
        article.title,
        article.content || ""
      );

      await prisma.newsArticle.create({
        data: {
          exchangeId,
          title: article.title,
          content: article.content,
          url: article.url,
          source: article.source,
          imageUrl: article.imageUrl,
          publishedAt: article.publishedAt
            ? new Date(article.publishedAt)
            : null,
          aiSummary: analysis.summary,
          aiSentiment: analysis.sentiment,
          aiRelevance: analysis.relevance,
          tags: analysis.tags,
        },
      });
      newCount++;
    }
  } catch (error) {
    const msg = `Error collecting news: ${error}`;
    console.error(msg);
    errors.push(msg);
  }

  return { total, new: newCount, errors };
}
