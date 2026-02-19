import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  ListChecks,
  TrendingUp,
  Twitter,
  Megaphone,
  Newspaper,
  Brain,
  Sparkles,
  AlertTriangle,
  Heart,
  Repeat2,
  ExternalLink,
  Clock,
} from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

const hasFeatureData = { exchangeFeatures: { some: {} } };

const getDashboardData = unstable_cache(
  async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalExchanges,
      turkishExchanges,
      globalExchanges,
      totalFeatures,
      pendingUpdates,
      totalCells,
      // Intelligence data
      recentTweets,
      highlightTweets,
      totalTweets,
      recentAnnouncements,
      criticalAnnouncements,
      totalAnnouncements,
      recentNews,
      totalNews,
      latestAnalysis,
      totalAnalyses,
    ] = await Promise.all([
      prisma.exchange.count({ where: hasFeatureData }),
      prisma.exchange.count({ where: { marketType: "turkish", ...hasFeatureData } }),
      prisma.exchange.count({ where: { marketType: "global", ...hasFeatureData } }),
      prisma.feature.count(),
      prisma.featureUpdateSuggestion.count({ where: { status: "pending" } }),
      prisma.exchangeFeature.count(),
      // Recent tweets (last 24h)
      prisma.tweet.findMany({
        where: { collectedAt: { gte: oneDayAgo } },
        include: { exchange: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
      prisma.tweet.findMany({
        where: { isHighlight: true },
        include: { exchange: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 3,
      }),
      prisma.tweet.count(),
      // Recent announcements
      prisma.exchangeAnnouncement.findMany({
        where: { collectedAt: { gte: oneWeekAgo } },
        include: { exchange: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
      prisma.exchangeAnnouncement.findMany({
        where: { importance: { in: ["critical", "high"] } },
        include: { exchange: { select: { name: true } } },
        orderBy: { collectedAt: "desc" },
        take: 3,
      }),
      prisma.exchangeAnnouncement.count(),
      // Recent news
      prisma.newsArticle.findMany({
        where: { collectedAt: { gte: oneWeekAgo } },
        include: { exchange: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),
      prisma.newsArticle.count(),
      // Latest analysis
      prisma.aIAnalysis.findFirst({
        orderBy: { createdAt: "desc" },
      }),
      prisma.aIAnalysis.count(),
    ]);

    const maxCells = totalExchanges * totalFeatures;
    const coveragePercentage = maxCells > 0 ? Math.round((totalCells / maxCells) * 100) : 0;

    return {
      totalExchanges,
      turkishExchanges,
      globalExchanges,
      totalFeatures,
      pendingUpdates,
      coveragePercentage,
      recentTweets,
      highlightTweets,
      totalTweets,
      recentAnnouncements,
      criticalAnnouncements,
      totalAnnouncements,
      recentNews,
      totalNews,
      latestAnalysis,
      totalAnalyses,
    };
  },
  ["terminal-dashboard"],
  { revalidate: 60 }
);

function timeAgo(date: Date | string): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "az önce";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}dk önce`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}sa önce`;
  return `${Math.floor(seconds / 86400)}g önce`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold gradient-text">Rekabet Terminali</h1>
        <p className="text-muted-foreground mt-1">
          Product ekibi için merkezi rekabet istihbarat paneli
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        {[
          { label: "Borsalar", value: data.totalExchanges, sub: `${data.turkishExchanges} TR · ${data.globalExchanges} GL`, icon: Building2 },
          { label: "Özellikler", value: data.totalFeatures, sub: "takipte", icon: ListChecks },
          { label: "Kapsam", value: `${data.coveragePercentage}%`, sub: "matrix", icon: TrendingUp },
          { label: "Tweetler", value: data.totalTweets, sub: "takipte", icon: Twitter },
          { label: "Duyurular", value: data.totalAnnouncements, sub: "kayıtlı", icon: Megaphone },
          { label: "Haberler", value: data.totalNews, sub: "arşivde", icon: Newspaper },
          { label: "Analizler", value: data.totalAnalyses, sub: "rapor", icon: Brain },
        ].map((stat, i) => (
          <Card key={stat.label} className="animate-fade-in-up" style={{ animationDelay: `${(i + 2) * 50}ms` }}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Updates Alert */}
      {data.pendingUpdates > 0 && (
        <Link href="/admin/updates">
          <Card className="border-warning/30 bg-warning/5 card-hover animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
              <span className="text-sm font-medium">{data.pendingUpdates} AI önerisi onay bekliyor</span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Announcements */}
        {data.criticalAnnouncements.length > 0 && (
          <Card className="lg:col-span-2 border-red-500/20 animate-fade-in-up" style={{ animationDelay: "240ms" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Kritik / Önemli Duyurular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.criticalAnnouncements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{a.exchange.name}</span>
                      <Badge className={`text-xs ${a.importance === "critical" ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"}`}>
                        {a.importance === "critical" ? "Kritik" : "Yüksek"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.aiSummary && <p className="text-xs text-muted-foreground mt-1">{a.aiSummary}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Highlight Tweets */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "280ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Öne Çıkan Tweetler
              </CardTitle>
              <Link href="/tweets" className="text-xs text-primary hover:underline">
                Tümünü gör
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.highlightTweets.length > 0 ? (
              data.highlightTweets.map((t) => (
                <div key={t.id} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{t.exchange.name}</span>
                    <span className="text-xs text-muted-foreground">@{t.authorHandle}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {timeAgo(t.publishedAt)}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2">{t.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{formatNumber(t.likeCount)}</span>
                    <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" />{formatNumber(t.retweetCount)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Henüz öne çıkan tweet yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Tweets */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "320ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Twitter className="h-4 w-4" />
                Son Tweetler
              </CardTitle>
              <Link href="/tweets" className="text-xs text-primary hover:underline">
                Tümünü gör
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentTweets.length > 0 ? (
              data.recentTweets.map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{t.exchange.name}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(t.publishedAt)}</span>
                    </div>
                    <p className="text-sm line-clamp-2 mt-0.5">{t.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Son 24 saatte tweet yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Son Duyurular
              </CardTitle>
              <Link href="/announcements" className="text-xs text-primary hover:underline">
                Tümünü gör
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentAnnouncements.length > 0 ? (
              data.recentAnnouncements.map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{a.exchange.name}</span>
                      {a.aiCategory && (
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          {a.aiCategory}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {a.publishedAt ? timeAgo(a.publishedAt) : timeAgo(a.collectedAt)}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-1 mt-0.5 font-medium">{a.title}</p>
                    {a.aiSummary && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.aiSummary}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Son bir haftada duyuru yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent News */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Son Haberler
              </CardTitle>
              <Link href="/news" className="text-xs text-primary hover:underline">
                Tümünü gör
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentNews.length > 0 ? (
              data.recentNews.map((n) => (
                <div key={n.id} className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {n.source}
                      </Badge>
                      {n.exchange && (
                        <span className="text-xs font-medium">{n.exchange.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {n.publishedAt ? timeAgo(n.publishedAt) : timeAgo(n.collectedAt)}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-1 mt-0.5 font-medium">{n.title}</p>
                    {n.aiSummary && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.aiSummary}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Son bir haftada haber yok
              </p>
            )}
          </CardContent>
        </Card>

        {/* Latest AI Analysis */}
        <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "440ms" }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Son AI Analiz
              </CardTitle>
              <Link href="/analysis" className="text-xs text-primary hover:underline">
                Tüm analizler
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.latestAnalysis ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {data.latestAnalysis.analysisType === "daily_brief"
                      ? "Günlük Brifing"
                      : data.latestAnalysis.analysisType === "weekly_summary"
                        ? "Haftalık Özet"
                        : data.latestAnalysis.analysisType === "competitor_alert"
                          ? "Rakip Uyarısı"
                          : "Trend Analizi"}
                  </Badge>
                  <span className="text-sm font-medium">{data.latestAnalysis.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {timeAgo(data.latestAnalysis.createdAt)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                  {data.latestAnalysis.content.replace(/[#*]/g, "").substring(0, 500)}...
                </div>
                <Link
                  href="/analysis"
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-3"
                >
                  <ExternalLink className="h-3 w-3" />
                  Tam analizi oku
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <Brain className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Henüz AI analiz oluşturulmadı
                </p>
                <Link href="/analysis" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Analiz oluştur
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
