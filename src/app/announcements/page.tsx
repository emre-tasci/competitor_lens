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
  Megaphone,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  aiSummary: string | null;
  aiCategory: string | null;
  importance: string;
  collectedAt: string;
  exchange: {
    id: string;
    name: string;
    logoUrl: string | null;
    marketType: string;
  };
}

const importanceConfig: Record<
  string,
  { label: string; color: string; icon?: React.ReactNode }
> = {
  critical: {
    label: "Kritik",
    color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  high: {
    label: "Yüksek",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  normal: {
    label: "Normal",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  low: {
    label: "Düşük",
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  },
};

const categoryLabels: Record<string, string> = {
  listing: "Listeleme",
  feature: "Özellik",
  maintenance: "Bakım",
  partnership: "Ortaklık",
  regulation: "Regülasyon",
  campaign: "Kampanya",
  other: "Diğer",
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

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exchanges, setExchanges] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>("all");
  const [selectedImportance, setSelectedImportance] = useState<string>("all");
  const [total, setTotal] = useState(0);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedExchange !== "all") params.set("exchangeId", selectedExchange);
      if (selectedImportance !== "all") params.set("importance", selectedImportance);
      params.set("limit", "100");

      const res = await fetch(`/api/announcements?${params}`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Duyurular yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [selectedExchange, selectedImportance]);

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
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "collect" }),
      });
      const data = await res.json();
      toast.success(
        `${data.new || 0} yeni duyuru toplandı (toplam ${data.total || 0})`
      );
      fetchAnnouncements();
    } catch {
      toast.error("Duyuru toplama başarısız");
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
            <Megaphone className="h-8 w-8" />
            Duyurular
          </h1>
          <p className="text-muted-foreground mt-1">
            Rakip borsaların resmi duyuruları ve güncellemeleri
          </p>
        </div>
        <Button onClick={handleCollect} disabled={collecting} variant="outline">
          {collecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {collecting ? "Toplanıyor..." : "Duyuruları Topla"}
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

        <Select value={selectedImportance} onValueChange={setSelectedImportance}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tüm önem dereceleri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Önem</SelectItem>
            <SelectItem value="critical">Kritik</SelectItem>
            <SelectItem value="high">Yüksek</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Düşük</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="ml-auto self-center">
          {total} duyuru
        </Badge>
      </div>

      {/* Announcement List */}
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
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz duyuru yok</h3>
            <p className="text-muted-foreground mb-4">
              Duyuruları toplamak için yukarıdaki butonu kullanın
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((a, i) => {
            const imp = importanceConfig[a.importance] || importanceConfig.normal;
            return (
              <Card
                key={a.id}
                className={`card-hover animate-fade-in-up ${a.importance === "critical" ? "border-red-500/30" : a.importance === "high" ? "border-orange-500/20" : ""}`}
                style={{ animationDelay: `${(i % 10) * 50}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {a.exchange.name}
                        </span>
                        <Badge className={`text-xs ${imp.color}`}>
                          {imp.icon}
                          {imp.label}
                        </Badge>
                        {a.aiCategory && (
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[a.aiCategory] || a.aiCategory}
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs flex items-center gap-1 ml-auto">
                          <Clock className="h-3 w-3" />
                          {a.publishedAt
                            ? timeAgo(a.publishedAt)
                            : timeAgo(a.collectedAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-medium mb-2">{a.title}</h3>

                      {/* AI Summary */}
                      {a.aiSummary && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> AI Özet
                          </p>
                          <p className="text-sm">{a.aiSummary}</p>
                        </div>
                      )}

                      {/* Content preview */}
                      {a.content && !a.aiSummary && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {a.content}
                        </p>
                      )}

                      {/* Link */}
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Orijinal duyuruyu görüntüle
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
