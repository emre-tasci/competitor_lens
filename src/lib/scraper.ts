import { parse } from "node-html-parser";
import { getXaiClient } from "./xai";
import { prisma } from "./db";

export interface ScrapedAnnouncement {
  title: string;
  content: string;
  url: string;
  imageUrl?: string;
  publishedAt?: string;
}

export interface AnnouncementAnalysis {
  summary: string;
  category:
    | "listing"
    | "feature"
    | "maintenance"
    | "partnership"
    | "regulation"
    | "campaign"
    | "other";
  importance: "critical" | "high" | "normal" | "low";
}

/**
 * Fetches HTML from a URL with proper headers.
 */
async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
}

/**
 * Scrapes Binance announcements from their API.
 */
async function scrapeBinanceAnnouncements(): Promise<ScrapedAnnouncement[]> {
  try {
    const response = await fetch(
      "https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=15",
      {
        headers: { "User-Agent": "CompetitorLens/1.0" },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok) return [];

    const data = await response.json();
    const articles = data?.data?.catalogs?.[0]?.articles || [];

    return articles.map(
      (a: { title: string; code: string; releaseDate: number }) => ({
        title: a.title,
        content: "",
        url: `https://www.binance.com/en/support/announcement/${a.code}`,
        publishedAt: new Date(a.releaseDate).toISOString(),
      })
    );
  } catch (error) {
    console.error("Failed to scrape Binance announcements:", error);
    return [];
  }
}

/**
 * Scrapes announcements from a generic blog/announcement HTML page.
 * Sends the raw HTML to Grok to extract structured data - this prevents hallucination
 * because Grok is reading REAL HTML content, not generating from memory.
 */
async function scrapeHTMLAnnouncements(
  html: string,
  exchangeName: string,
  baseUrl: string
): Promise<ScrapedAnnouncement[]> {
  // First, extract text content with node-html-parser to reduce token count
  const root = parse(html);

  // Remove scripts, styles, nav, footer
  for (const tag of ["script", "style", "nav", "footer", "header", "iframe", "noscript"]) {
    for (const el of root.querySelectorAll(tag)) {
      el.remove();
    }
  }

  // Try to find article/announcement-like elements
  const candidates: string[] = [];

  // Common patterns for announcement pages
  const selectors = [
    "article",
    ".article",
    ".post",
    ".announcement",
    ".blog-post",
    ".news-item",
    ".list-item",
  ];

  for (const selector of selectors) {
    for (const el of root.querySelectorAll(selector)) {
      const text = el.text.trim().substring(0, 300);
      const links = el.querySelectorAll("a").map((a) => ({
        text: a.text.trim(),
        href: a.getAttribute("href"),
      }));

      if (text.length > 20 && links.length > 0) {
        candidates.push(
          JSON.stringify({ text: text.substring(0, 200), links: links.slice(0, 3) })
        );
      }
    }
  }

  // If no structured elements found, get all links with surrounding text
  if (candidates.length === 0) {
    for (const el of root.querySelectorAll("a")) {
      const href = el.getAttribute("href");
      const text = el.text.trim();
      const parentText = el.parentNode?.text?.trim()?.substring(0, 200) || "";
      if (text.length > 15 && href) {
        candidates.push(JSON.stringify({ text: parentText, link: { text, href } }));
      }
    }
  }

  if (candidates.length === 0) return [];

  // Use Grok to extract structured announcements from REAL HTML content
  const xai = getXaiClient();
  const response = await xai.chat.completions.create({
    model: "grok-3-mini",
    messages: [
      {
        role: "system",
        content: `Sen bir HTML parser'sın. Sana verilen HTML içeriğinden duyuruları çıkart. Sadece JSON döndür. Uydurma, sadece verilen veriden çıkart.`,
      },
      {
        role: "user",
        content: `Bu ${exchangeName} sayfasından çıkarılan içerikten duyuruları bul.
Base URL: ${baseUrl}

İçerik:
${candidates.slice(0, 20).join("\n")}

SADECE yukarıdaki veriden çıkart. Hiçbir şey UYDURMA.
Relative URL'leri ${baseUrl} ile birleştir.

JSON formatında döndür:
{
  "announcements": [
    {
      "title": "duyuru başlığı (veriden çıkart)",
      "content": "",
      "url": "tam URL",
      "publishedAt": "tarih varsa ISO 8601, yoksa null"
    }
  ]
}`,
      },
    ],
    temperature: 0.0,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content || "{}";
  const cleaned = content.replace(/```json\n?|```\n?/g, "").trim();
  try {
    const result = JSON.parse(cleaned);
    return (result.announcements || []).slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * Scrapes announcements from an exchange's website.
 */
export async function scrapeExchangeAnnouncements(
  exchangeName: string,
  websiteUrl: string,
  announcementUrl?: string | null
): Promise<ScrapedAnnouncement[]> {
  // Special handling for Binance
  if (exchangeName.toLowerCase().includes("binance")) {
    return scrapeBinanceAnnouncements();
  }

  const targetUrl = announcementUrl || websiteUrl;
  const html = await fetchPage(targetUrl);

  if (!html) {
    console.error(`Could not fetch page for ${exchangeName}: ${targetUrl}`);
    return [];
  }

  return scrapeHTMLAnnouncements(html, exchangeName, targetUrl);
}

/**
 * Analyzes an announcement using Grok AI.
 */
export async function analyzeAnnouncement(
  title: string,
  content: string,
  exchangeName: string
): Promise<AnnouncementAnalysis> {
  const xai = getXaiClient();

  const response = await xai.chat.completions.create({
    model: "grok-3-mini",
    messages: [
      {
        role: "system",
        content: `Kripto para borsası duyurularını kategorize eden bir uzmansın. JSON döndür.`,
      },
      {
        role: "user",
        content: `Bu duyuruyu analiz et (${exchangeName} borsasından):

Başlık: "${title}"
İçerik: "${content}"

JSON formatında döndür:
{
  "summary": "1-2 cümlelik Türkçe özet",
  "category": "listing" | "feature" | "maintenance" | "partnership" | "regulation" | "campaign" | "other",
  "importance": "critical" | "high" | "normal" | "low"
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
    return { summary: title, category: "other", importance: "normal" };
  }
}

/**
 * Collects and stores announcements from real exchange websites.
 */
export async function collectAllAnnouncements(): Promise<{
  total: number;
  new: number;
  errors: string[];
}> {
  const exchanges = await prisma.exchange.findMany({
    where: { websiteUrl: { not: null } },
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      announcementUrl: true,
    },
  });

  let total = 0;
  let newCount = 0;
  const errors: string[] = [];

  for (const exchange of exchanges) {
    if (!exchange.websiteUrl) continue;

    try {
      const announcements = await scrapeExchangeAnnouncements(
        exchange.name,
        exchange.websiteUrl,
        exchange.announcementUrl
      );
      total += announcements.length;

      for (const announcement of announcements) {
        if (!announcement.url || announcement.url.length < 10) continue;

        // Check if announcement already exists
        const existing = await prisma.exchangeAnnouncement.findUnique({
          where: { url: announcement.url },
        });

        if (existing) continue;

        // Analyze new announcement
        const analysis = await analyzeAnnouncement(
          announcement.title,
          announcement.content || "",
          exchange.name
        );

        await prisma.exchangeAnnouncement.create({
          data: {
            exchangeId: exchange.id,
            title: announcement.title,
            content: announcement.content,
            url: announcement.url,
            imageUrl: announcement.imageUrl,
            publishedAt: announcement.publishedAt
              ? new Date(announcement.publishedAt)
              : null,
            aiSummary: analysis.summary,
            aiCategory: analysis.category,
            importance: analysis.importance,
          },
        });
        newCount++;
      }

      // Rate limit between exchanges
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      const msg = `Error collecting announcements for ${exchange.name}: ${error}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  return { total, new: newCount, errors };
}
