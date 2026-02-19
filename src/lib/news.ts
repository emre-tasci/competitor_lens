import { parse } from "node-html-parser";
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

const RSS_FEEDS = [
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "CoinTelegraph", url: "https://cointelegraph.com/rss" },
  { source: "The Block", url: "https://www.theblock.co/rss.xml" },
  { source: "CryptoSlate", url: "https://cryptoslate.com/feed/" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
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
      headers: { "User-Agent": "CompetitorLens/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`RSS fetch failed for ${source}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const root = parse(xml);

    const articles: NewsData[] = [];

    // RSS uses <item>, Atom uses <entry>
    const items = [
      ...root.querySelectorAll("item"),
      ...root.querySelectorAll("entry"),
    ];

    for (const el of items) {
      const title = el.querySelector("title")?.text?.trim() || "";
      const linkEl = el.querySelector("link");
      const link =
        linkEl?.text?.trim() ||
        linkEl?.getAttribute("href") ||
        "";
      const descEl =
        el.querySelector("description") ||
        el.querySelector("summary") ||
        el.querySelector("content");
      const description = descEl?.text?.trim() || "";
      const pubDateEl =
        el.querySelector("pubDate") ||
        el.querySelector("published") ||
        el.querySelector("updated");
      const pubDate = pubDateEl?.text?.trim() || "";
      const mediaEl =
        el.querySelector("media\\:content") ||
        el.querySelector("media\\:thumbnail") ||
        el.querySelector("enclosure");
      const imageUrl = mediaEl?.getAttribute("url") || undefined;

      if (title && link) {
        // Strip HTML from description
        const cleanContent = description
          .replace(/<[^>]*>/g, "")
          .substring(0, 500)
          .trim();

        articles.push({
          title,
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
