"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Twitter,
  Heart,
  Repeat2,
  MessageCircle,
  Eye,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Tweet {
  id: string;
  tweetId: string;
  authorHandle: string;
  authorName: string;
  content: string;
  publishedAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  mediaUrls: string[] | null;
  aiSummary: string | null;
  aiSentiment: string | null;
  isHighlight: boolean;
  exchange: {
    id: string;
    name: string;
    logoUrl: string | null;
    marketType: string;
  };
}

interface ExchangeOption {
  id: string;
  name: string;
}

const sentimentColors: Record<string, string> = {
  positive: "bg-green-500/10 text-green-600 dark:text-green-400",
  negative: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(date: string): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "az önce";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}sa önce`;
  return `${Math.floor(seconds / 86400)}g önce`;
}

export default function TweetsPage() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [exchanges, setExchanges] = useState<ExchangeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>("all");
  const [highlightsOnly, setHighlightsOnly] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchTweets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedExchange !== "all") params.set("exchangeId", selectedExchange);
      if (highlightsOnly) params.set("highlights", "true");
      params.set("limit", "100");

      const res = await fetch(`/api/tweets?${params}`);
      const data = await res.json();
      setTweets(data.tweets || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Tweetler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [selectedExchange, highlightsOnly]);

  const fetchExchanges = useCallback(async () => {
    try {
      const res = await fetch("/api/exchanges");
      const data = await res.json();
      setExchanges(
        (data || []).map((e: { id: string; name: string }) => ({
          id: e.id,
          name: e.name,
        }))
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const res = await fetch("/api/tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect" }),
      });
      const data = await res.json();
      toast.success(
        `${data.new || 0} yeni tweet toplandı (toplam ${data.total || 0})`
      );
      fetchTweets();
    } catch {
      toast.error("Tweet toplama başarısız");
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <Twitter className="h-8 w-8" />
            Tweet Takip
          </h1>
          <p className="text-muted-foreground mt-1">
            Rakip borsaların X/Twitter paylaşımları ve etkileşimleri
          </p>
        </div>
        <Button onClick={handleCollect} disabled={collecting} variant="outline">
          {collecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {collecting ? "Toplanıyor..." : "Tweetleri Topla"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <Select value={selectedExchange} onValueChange={setSelectedExchange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tüm borsalar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Borsalar</SelectItem>
            {exchanges.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={highlightsOnly ? "default" : "outline"}
          onClick={() => setHighlightsOnly(!highlightsOnly)}
          size="sm"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Öne Çıkanlar
        </Button>

        <Badge variant="secondary" className="ml-auto self-center">
          {total} tweet
        </Badge>
      </div>

      {/* Tweet List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tweets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Twitter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz tweet yok</h3>
            <p className="text-muted-foreground mb-4">
              Tweetleri toplamak için yukarıdaki butonu kullanın
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tweets.map((tweet, i) => (
            <Card
              key={tweet.id}
              className={`card-hover animate-fade-in-up ${tweet.isHighlight ? "border-primary/30 bg-primary/5" : ""}`}
              style={{ animationDelay: `${(i % 10) * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Author row */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm">
                        {tweet.exchange.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        @{tweet.authorHandle}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        · {timeAgo(tweet.publishedAt)}
                      </span>
                      {tweet.isHighlight && (
                        <Badge className="ml-1 bg-primary/10 text-primary text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Öne Çıkan
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm mb-3 whitespace-pre-wrap">
                      {tweet.content}
                    </p>

                    {/* AI Summary */}
                    {tweet.aiSummary && (
                      <div className="bg-muted/50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI Özet
                        </p>
                        <p className="text-sm">{tweet.aiSummary}</p>
                      </div>
                    )}

                    {/* Engagement stats */}
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1 text-xs">
                        <Heart className="h-3.5 w-3.5" />
                        {formatNumber(tweet.likeCount)}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Repeat2 className="h-3.5 w-3.5" />
                        {formatNumber(tweet.retweetCount)}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {formatNumber(tweet.replyCount)}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        {formatNumber(tweet.viewCount)}
                      </span>
                      {tweet.aiSentiment && (
                        <Badge
                          className={`ml-auto text-xs ${sentimentColors[tweet.aiSentiment] || sentimentColors.neutral}`}
                        >
                          {tweet.aiSentiment === "positive"
                            ? "Pozitif"
                            : tweet.aiSentiment === "negative"
                              ? "Negatif"
                              : "Nötr"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
