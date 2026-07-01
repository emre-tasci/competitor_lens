import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  ListChecks,
  Twitter,
  Megaphone,
  Newspaper,
  Brain,
  Star,
  AlertTriangle,
  Heart,
  Repeat2,
  ArrowRight,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

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
      exchangesWithData,
      // Sektör gündemi verisi
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
      prisma.exchange.count(),
      prisma.exchange.count({ where: { marketType: "turkish" } }),
      prisma.exchange.count({ where: { marketType: "global" } }),
      prisma.feature.count(),
      prisma.featureUpdateSuggestion.count({ where: { status: "pending" } }),
      prisma.exchangeFeature.count(),
      prisma.exchange.count({ where: hasFeatureData }),
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

    const maxCells = exchangesWithData * totalFeatures;
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

/* ---- Presentational helpers (server components) ---------------------- */

function SectionPanel({
  title,
  icon: Icon,
  href,
  hrefLabel = "Tümü",
  accent,
  className,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  hrefLabel?: string;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Icon className={cn("h-4 w-4", accent ? "text-primary" : "text-muted-foreground")} />
          {title}
        </h3>
        {href && (
          <Link
            href={href}
            className="group inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {hrefLabel}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className="px-5 pb-3">{children}</div>
    </section>
  );
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-9 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground/70">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  const analysisTypeLabel = (t?: string) =>
    t === "daily_brief"
      ? "Günlük Brifing"
      : t === "weekly_summary"
        ? "Haftalık Özet"
        : t === "sector_alert"
          ? "Sektör Uyarısı"
          : "Trend Analizi";

  const secondaryStats = [
    { label: "Tweet", value: data.totalTweets, icon: Twitter, href: "/tweets" },
    { label: "Duyuru", value: data.totalAnnouncements, icon: Megaphone, href: "/announcements" },
    { label: "Haber", value: data.totalNews, icon: Newspaper, href: "/news" },
    { label: "Analiz", value: data.totalAnalyses, icon: Brain, href: "/analysis" },
  ];

  return (
    <div className="space-y-10 pb-4">
      {/* Hero */}
      <PageHeader
        eyebrow="Canlı · Sektör paneli"
        title="Product Terminali"
        size="display"
        description="Kripto borsa sektörünü tek ekrandan izleyin - uygulamaların yeni özellikleri, duyuruları ve gündemi bir arada."
      />

      {/* Metrics band — one panel, real hierarchy by scale (hero figure +
          two medium figures + a compact secondary strip). */}
      <div className="reveal panel overflow-hidden" style={{ animationDelay: "60ms" }}>
        <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-[1.5fr_1fr_1fr] lg:divide-x lg:divide-y-0">
          {/* Featured: matrix coverage */}
          <div className="p-6 sm:p-7">
            <p className="eyebrow">Matrix kapsamı</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="figure text-5xl font-bold leading-none sm:text-6xl">
                {data.coveragePercentage}
              </span>
              <span className="figure mb-1 text-2xl font-semibold text-muted-foreground">%</span>
            </div>
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${data.coveragePercentage}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Borsa × özellik matrisinin doluluk oranı
            </p>
          </div>

          {/* Medium: exchanges */}
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-medium">Takip edilen borsa</span>
            </div>
            <p className="figure mt-4 text-3xl font-bold">{data.totalExchanges}</p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {data.turkishExchanges} Türk · {data.globalExchanges} Global
            </p>
          </div>

          {/* Medium: features */}
          <div className="p-6 sm:p-7">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="h-4 w-4" />
              <span className="text-xs font-medium">İzlenen özellik</span>
            </div>
            <p className="figure mt-4 text-3xl font-bold">{data.totalFeatures}</p>
            <p className="mt-1 text-xs text-muted-foreground">kategori bazında</p>
          </div>
        </div>

        {/* Secondary strip — contextual figures, label left / value right */}
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0">
          {secondaryStats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-accent/50"
            >
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </span>
              <span className="figure text-lg font-semibold tabular-nums">
                {s.value}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending updates — slim, red-anchored action banner */}
      {data.pendingUpdates > 0 && (
        <Link href="/admin/updates" className="reveal block" style={{ animationDelay: "120ms" }}>
          <div className="accent-edge card-hover flex items-center gap-3 rounded-xl border border-border bg-card py-3 pl-5 pr-4">
            <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-medium">
              {data.pendingUpdates} AI önerisi onay bekliyor
            </span>
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Gündem */}
      <div className="reveal space-y-6" style={{ animationDelay: "160ms" }}>
        <div className="section-head">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Gündem</h2>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Sektörden son hareketler
            </span>
          </div>
        </div>

        {/* Critical announcements — featured, red-anchored */}
        {data.criticalAnnouncements.length > 0 && (
          <section className="panel accent-edge overflow-hidden">
            <div className="px-5 pb-3 pt-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Kritik ve önemli duyurular
              </h3>
            </div>
            <div className="divide-rows px-5 pb-2">
              {data.criticalAnnouncements.map((a) => (
                <div key={a.id} className="py-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-medium">{a.exchange.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 text-[10px]",
                        a.importance === "critical"
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-warning/30 bg-warning/10 text-warning-foreground"
                      )}
                    >
                      {a.importance === "critical" ? "Kritik" : "Yüksek"}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">{a.title}</p>
                  {a.aiSummary && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {a.aiSummary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Editorial main column + right rail */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Featured: latest AI analysis */}
            <section className="panel panel-feature overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <Brain className="h-4 w-4 text-primary" />
                  Son AI analiz
                </h3>
                <Link
                  href="/analysis"
                  className="group inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tüm analizler
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="px-6 pb-6">
                {data.latestAnalysis ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {analysisTypeLabel(data.latestAnalysis.analysisType)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(data.latestAnalysis.createdAt)}
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-semibold leading-snug tracking-tight text-balance">
                      {data.latestAnalysis.title}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground line-clamp-4">
                      {data.latestAnalysis.content.replace(/[#*]/g, "").substring(0, 460)}…
                    </p>
                    <Link
                      href="/analysis"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Tam analizi oku
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <EmptyState icon={Brain} message="Henüz AI analiz oluşturulmadı" />
                )}
              </div>
            </section>

            {/* Announcements + news, two compact feeds */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <SectionPanel title="Son duyurular" icon={Megaphone} href="/announcements">
                {data.recentAnnouncements.length > 0 ? (
                  <div className="divide-rows">
                    {data.recentAnnouncements.map((a) => (
                      <div key={a.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-medium">{a.exchange.name}</span>
                          {a.aiCategory && (
                            <Badge variant="outline" className="h-4 px-1 text-[10px]">
                              {a.aiCategory}
                            </Badge>
                          )}
                          <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {a.publishedAt ? timeAgo(a.publishedAt) : timeAgo(a.collectedAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">{a.title}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Megaphone} message="Son bir haftada duyuru yok" />
                )}
              </SectionPanel>

              <SectionPanel title="Son haberler" icon={Newspaper} href="/news">
                {data.recentNews.length > 0 ? (
                  <div className="divide-rows">
                    {data.recentNews.map((n) => (
                      <div key={n.id} className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="h-4 px-1 text-[10px]">
                            {n.source}
                          </Badge>
                          {n.exchange && (
                            <span className="truncate text-xs font-medium">{n.exchange.name}</span>
                          )}
                          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                            {n.publishedAt ? timeAgo(n.publishedAt) : timeAgo(n.collectedAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium leading-snug line-clamp-2">{n.title}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Newspaper} message="Son bir haftada haber yok" />
                )}
              </SectionPanel>
            </div>
          </div>

          {/* Right rail — social */}
          <div className="space-y-6">
            <SectionPanel title="Öne çıkan tweetler" icon={Star} href="/tweets" accent>
              {data.highlightTweets.length > 0 ? (
                <div className="divide-rows">
                  {data.highlightTweets.map((t) => (
                    <div key={t.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{t.exchange.name}</span>
                        <span className="truncate text-xs text-muted-foreground">@{t.authorHandle}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(t.publishedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-snug line-clamp-3">{t.content}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Heart className="h-3 w-3" />
                          {formatNumber(t.likeCount)}
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <Repeat2 className="h-3 w-3" />
                          {formatNumber(t.retweetCount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Star} message="Henüz öne çıkan tweet yok" />
              )}
            </SectionPanel>

            <SectionPanel title="Son tweetler" icon={Twitter} href="/tweets">
              {data.recentTweets.length > 0 ? (
                <div className="divide-rows">
                  {data.recentTweets.map((t) => (
                    <div key={t.id} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{t.exchange.name}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(t.publishedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-snug line-clamp-2">{t.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Twitter} message="Son 24 saatte tweet yok" />
              )}
            </SectionPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
