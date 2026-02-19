"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Newspaper,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Loader2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { toast } from "sonner";

interface NewsArticle {
  id: string;
  title: string;
  content: string | null;
  url: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string | null;
  aiSummary: string | null;
  aiSentiment: string | null;
  aiRelevance: number | null;
  tags: string[] | null;
  collectedAt: string;
  exchange: {
    id: string;
    name: string;
    logoUrl: string | null;
    marketType: string;
  } | null;
}

const sentimentIcons: Record<string, React.ReactNode> = {
  positive: <TrendingUp className="h-3.5 w-3.5 text-green-500" />,
  negative: <TrendingDown className="h-3.5 w-3.5 text-red-500" />,
  neutral: <Minus className="h-3.5 w-3.5 text-gray-500" />,
};

const sentimentColors: Record<string, string> = {
  positive: "bg-green-500/10 text-green-600 dark:text-green-400",
  negative: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

function timeAgo(date: string): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "az önce";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}sa önce`;
  return `${Math.floor(seconds / 86400)}g önce`;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [exchanges, setExchanges] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [total, setTotal] = useState(0);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedExchange !== "all") params.set("exchangeId", selectedExchange);
      if (selectedSentiment !== "all") params.set("sentiment", selectedSentiment);
      params.set("limit", "100");

      const res = await fetch(`/api/news?${params}`);
      const data = await res.json();
      setNews(data.news || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Haberler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [selectedExchange, selectedSentiment]);

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
    fetchNews();
  }, [fetchNews]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect" }),
      });
      const data = await res.json();
      toast.success(
        `${data.new || 0} yeni haber toplandı (toplam ${data.total || 0})`
      );
      fetchNews();
    } catch {
      toast.error("Haber toplama başarısız");
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
            <Newspaper className="h-8 w-8" />
            Haberler
          </h1>
          <p className="text-muted-foreground mt-1">
            Kripto borsa sektöründen son haberler ve gelişmeler
          </p>
        </div>
        <Button onClick={handleCollect} disabled={collecting} variant="outline">
          {collecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {collecting ? "Toplanıyor..." : "Haberleri Topla"}
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

        <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tüm duygular" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Sentiment</SelectItem>
            <SelectItem value="positive">Pozitif</SelectItem>
            <SelectItem value="negative">Negatif</SelectItem>
            <SelectItem value="neutral">Nötr</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="ml-auto self-center">
          {total} haber
        </Badge>
      </div>

      {/* News List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz haber yok</h3>
            <p className="text-muted-foreground mb-4">
              Haberleri toplamak için yukarıdaki butonu kullanın
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {news.map((article, i) => (
            <Card
              key={article.id}
              className="card-hover animate-fade-in-up"
              style={{ animationDelay: `${(i % 10) * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {article.source}
                      </Badge>
                      {article.exchange && (
                        <Badge variant="secondary" className="text-xs">
                          {article.exchange.name}
                        </Badge>
                      )}
                      {article.aiSentiment && (
                        <span className="flex items-center gap-1">
                          {sentimentIcons[article.aiSentiment]}
                        </span>
                      )}
                      {article.aiRelevance !== null && article.aiRelevance > 0.7 && (
                        <Badge className="bg-primary/10 text-primary text-xs">
                          Yüksek İlgi
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-xs flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {article.publishedAt
                          ? timeAgo(article.publishedAt)
                          : timeAgo(article.collectedAt)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-medium mb-2">{article.title}</h3>

                    {/* AI Summary */}
                    {article.aiSummary && (
                      <div className="bg-muted/50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI Özet
                        </p>
                        <p className="text-sm">{article.aiSummary}</p>
                      </div>
                    )}

                    {/* Tags */}
                    {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {(article.tags as string[]).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Link */}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Haberi oku
                    </a>
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
