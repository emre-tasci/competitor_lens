import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  ListChecks,
  ImageIcon,
  Brain,
  Bell,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
    prisma.exchange.count(),
    prisma.exchange.count({ where: { marketType: "turkish" } }),
    prisma.exchange.count({ where: { marketType: "global" } }),
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

async function getExchangeCoverage() {
  const exchanges = await prisma.exchange.findMany({
    include: {
      _count: {
        select: { exchangeFeatures: { where: { hasFeature: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalFeatures = await prisma.feature.count();

  return exchanges.map((e) => ({
    name: e.name,
    marketType: e.marketType,
    count: e._count.exchangeFeatures,
    total: totalFeatures,
    percentage: totalFeatures > 0
      ? Math.round((e._count.exchangeFeatures / totalFeatures) * 100)
      : 0,
  }));
}

export default async function DashboardPage() {
  const [stats, coverage] = await Promise.all([
    getStats(),
    getExchangeCoverage(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {stats.pendingUpdates > 0 && (
          <Link href="/admin/updates">
            <Badge variant="destructive" className="text-sm px-3 py-1 cursor-pointer">
              <Bell className="h-3 w-3 mr-1" />
              {stats.pendingUpdates} AI önerisi onay bekliyor
            </Badge>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Borsalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalExchanges}</p>
            <p className="text-xs text-muted-foreground">
              {stats.turkishExchanges} TR / {stats.globalExchanges} Global
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Özellikler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalFeatures}</p>
            <p className="text-xs text-muted-foreground">
              {stats.availableFeatures} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Screenshotlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalScreenshots}</p>
            <p className="text-xs text-muted-foreground">
              {stats.classifiedScreenshots} sınıflandırılmış
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Matrix Kapsam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.coveragePercentage}%</p>
            <Progress value={stats.coveragePercentage} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/exchanges">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 text-center">
              <Building2 className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Borsalar</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/matrix">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 text-center">
              <ListChecks className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Feature Matrix</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/classify">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 text-center">
              <Brain className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">AI Sınıflandır</p>
              {stats.unclassifiedScreenshots > 0 && (
                <Badge variant="secondary" className="mt-1">
                  {stats.unclassifiedScreenshots}
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4 text-center">
              <Brain className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">Admin</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Coverage Chart */}
      {coverage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Borsa Başına Feature Kapsam</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {coverage.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {item.name}
                    <Badge variant={item.marketType === "turkish" ? "default" : "secondary"} className="text-xs">
                      {item.marketType === "turkish" ? "TR" : "Global"}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {item.count}/{item.total} ({item.percentage}%)
                  </span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
