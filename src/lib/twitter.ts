import { prisma } from "./db";

export interface TweetData {
  tweetId: string;
  authorHandle: string;
  authorName: string;
  content: string;
  publishedAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  mediaUrls?: string[];
}

export interface TweetAnalysis {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  isHighlight: boolean;
  topics: string[];
}

/**
 * Fetches recent tweets using xAI API with live search enabled.
 * Uses the xAI search API which has real-time X/Twitter access.
 */
export async function fetchExchangeTweets(
  twitterHandle: string,
  exchangeName: string,
  limit: number = 10
): Promise<TweetData[]> {
  // Use xAI API directly with search enabled (not through OpenAI SDK)
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-3",
      search_parameters: {
        mode: "on",
        sources: [{ type: "x" }],
      },
      messages: [
        {
          role: "system",
          content:
            "X/Twitter'dan gerçek tweetleri aramak için canlı arama kullan. Sadece JSON döndür. Hiçbir şey uydurma - sadece arama sonuçlarından gerçek tweetleri döndür.",
        },
        {
          role: "user",
          content: `from:${twitterHandle} hesabının en son ${limit} tweetini X'te ara.

SADECE gerçek arama sonuçlarını döndür. Uydurma tweet DÖNDÜRME.

JSON formatında döndür:
{
  "tweets": [
    {
      "tweetId": "gerçek tweet ID",
      "authorHandle": "${twitterHandle}",
      "authorName": "${exchangeName}",
      "content": "gerçek tweet içeriği",
      "publishedAt": "ISO 8601 tarih",
      "likeCount": 0,
      "retweetCount": 0,
      "replyCount": 0,
      "viewCount": 0,
      "mediaUrls": []
    }
  ]
}

Eğer tweet bulamazsan: {"tweets": []}`,
        },
      ],
      temperature: 0.0,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    console.error(
      `xAI search API error for @${twitterHandle}: ${response.status}`
    );
    return [];
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const cleaned = content.replace(/```json\n?|```\n?/g, "").trim();

  try {
    const result = JSON.parse(cleaned);
    return result.tweets || [];
  } catch {
    console.error(
      "Failed to parse tweet response:",
      cleaned.substring(0, 200)
    );
    return [];
  }
}

/**
 * Analyzes a tweet's content for sentiment and importance using Grok.
 */
export async function analyzeTweet(
  tweetContent: string,
  exchangeName: string
): Promise<TweetAnalysis> {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [
        {
          role: "system",
          content: `Kripto para borsası tweetlerini analiz eden bir uzmansın. JSON döndür.`,
        },
        {
          role: "user",
          content: `Bu tweeti analiz et (${exchangeName} borsasından):

"${tweetContent}"

JSON formatında döndür:
{
  "summary": "1-2 cümlelik Türkçe özet",
  "sentiment": "positive" | "negative" | "neutral",
  "isHighlight": true/false (önemli duyuru, yeni özellik, büyük ortaklık vs. ise true),
  "topics": ["listing", "feature", "maintenance", "partnership", etc.]
}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    return {
      summary: tweetContent.substring(0, 100),
      sentiment: "neutral",
      isHighlight: false,
      topics: [],
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const cleaned = content.replace(/```json\n?|```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      summary: tweetContent.substring(0, 100),
      sentiment: "neutral",
      isHighlight: false,
      topics: [],
    };
  }
}

/**
 * Collects and stores tweets for all exchanges with Twitter handles.
 */
export async function collectAllTweets(): Promise<{
  total: number;
  new: number;
  errors: string[];
}> {
  const exchanges = await prisma.exchange.findMany({
    where: { twitterHandle: { not: null } },
    select: { id: true, name: true, twitterHandle: true },
  });

  let total = 0;
  let newCount = 0;
  const errors: string[] = [];

  for (const exchange of exchanges) {
    if (!exchange.twitterHandle) continue;

    try {
      const tweets = await fetchExchangeTweets(
        exchange.twitterHandle,
        exchange.name
      );
      total += tweets.length;

      for (const tweet of tweets) {
        // Check if tweet already exists
        const existing = await prisma.tweet.findUnique({
          where: { tweetId: tweet.tweetId },
        });

        if (existing) {
          // Update engagement counts
          await prisma.tweet.update({
            where: { tweetId: tweet.tweetId },
            data: {
              likeCount: tweet.likeCount,
              retweetCount: tweet.retweetCount,
              replyCount: tweet.replyCount,
              viewCount: tweet.viewCount,
            },
          });
          continue;
        }

        // Analyze new tweet
        const analysis = await analyzeTweet(tweet.content, exchange.name);

        await prisma.tweet.create({
          data: {
            exchangeId: exchange.id,
            tweetId: tweet.tweetId,
            authorHandle: tweet.authorHandle,
            authorName: tweet.authorName,
            content: tweet.content,
            publishedAt: new Date(tweet.publishedAt),
            likeCount: tweet.likeCount,
            retweetCount: tweet.retweetCount,
            replyCount: tweet.replyCount,
            viewCount: tweet.viewCount,
            mediaUrls: tweet.mediaUrls || [],
            aiSummary: analysis.summary,
            aiSentiment: analysis.sentiment,
            isHighlight: analysis.isHighlight,
          },
        });
        newCount++;
      }

      // Rate limit between exchanges
      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      const msg = `Error collecting tweets for ${exchange.name}: ${error}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  return { total, new: newCount, errors };
}
