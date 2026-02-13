import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  ListChecks,
  ImageIcon,
  Bell,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { DashboardChartsLoader } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

const hasFeatureData = { exchangeFeatures: { some: {} } };

async function getStats() {
  const [
    totalExchanges,
    turkishExchanges,
    globalExchanges,
    totalFeatures,
    totalScreenshots,
    classifiedScreenshots,
    pendingUpdates,
    totalCells,
    availableCells,
  ] = await Promise.all([
    prisma.exchange.count({ where: hasFeatureData }),
    prisma.exchange.count({ where: { marketType: "turkish", ...hasFeatureData } }),
    prisma.exchange.count({ where: { marketType: "global", ...hasFeatureData } }),
    prisma.feature.count(),
    prisma.screenshot.count(),
    prisma.screenshot.count({ where: { featureId: { not: null } } }),
    prisma.featureUpdateSuggestion.count({ where: { status: "pending" } }),
    prisma.exchangeFeature.count(),
    prisma.exchangeFeature.count({ where: { hasFeature: true } }),
  ]);

  const maxCells = totalExchanges * totalFeatures;
  const coveragePercentage = maxCells > 0
    ? Math.round((totalCells / maxCells) * 100)
    : 0;

  return {
    totalExchanges,
    turkishExchanges,
    globalExchanges,
    totalFeatures,
    totalScreenshots,
    classifiedScreenshots,
    unclassifiedScreenshots: totalScreenshots - classifiedScreenshots,
    pendingUpdates,
    coveragePercentage,
    availableFeatures: availableCells,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const statCards = [
    {
      label: "Borsalar",
      value: stats.totalExchanges,
      sub: `${stats.turkishExchanges} TR / ${stats.globalExchanges} Global`,
      icon: Building2,
    },
    {
      label: "Özellikler",
      value: stats.totalFeatures,
      sub: `${stats.availableFeatures} aktif`,
      icon: ListChecks,
    },
    {
      label: "Screenshotlar",
      value: stats.totalScreenshots,
      sub: `${stats.classifiedScreenshots} sınıflandırılmış`,
      icon: ImageIcon,
    },
    {
      label: "Matrix Kapsam",
      value: `${stats.coveragePercentage}%`,
      sub: "veri kapsam oranı",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Borsa özellik karşılaştırma platformuna genel bakış
          </p>
        </div>
        {stats.pendingUpdates > 0 && (
          <Link href="/admin/updates">
            <Card className="card-hover cursor-pointer border-warning/30 bg-warning/5">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="bg-warning/10 rounded-lg p-2">
                  <Bell className="h-4 w-4 text-warning-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{stats.pendingUpdates} AI önerisi</p>
                  <p className="text-xs text-muted-foreground">Onay bekliyor</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card
            key={stat.label}
            className="card-hover animate-fade-in-up relative overflow-hidden"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="bg-primary/10 rounded-xl p-2.5">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stat.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts - loaded client-side */}
      <DashboardChartsLoader />
    </div>
  );
}
