import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeatureStatusBadge } from "@/components/FeatureStatusBadge";
import { ScreenshotGallery } from "@/components/ScreenshotGallery";
import { ListChecks } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const feature = await prisma.feature.findUnique({
    where: { id },
    include: {
      category: true,
      exchangeFeatures: {
        include: { exchange: true },
        orderBy: { exchange: { name: "asc" } },
      },
      screenshots: {
        include: { exchange: true, category: true },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!feature) notFound();

  const available = feature.exchangeFeatures.filter((ef) => ef.hasFeature);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <ListChecks className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{feature.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{feature.category.name}</Badge>
              <span className="text-sm text-muted-foreground">
                {available.length}/{feature.exchangeFeatures.length} borsada var
              </span>
            </div>
          </div>
        </div>
        {feature.description && (
          <p className="text-muted-foreground mt-2">{feature.description}</p>
        )}
      </div>

      <Separator />

      {/* Exchange Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hangi Borsalarda Var?</CardTitle>
        </CardHeader>
        <CardContent>
          {feature.exchangeFeatures.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Henüz veri yok. Excel import ile ekleyin.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borsa</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Not</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feature.exchangeFeatures.map((ef) => (
                  <TableRow key={ef.id}>
                    <TableCell>
                      <Link
                        href={`/exchanges/${ef.exchange.id}`}
                        className="text-primary hover:underline"
                      >
                        {ef.exchange.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ef.exchange.marketType === "turkish"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {ef.exchange.marketType === "turkish" ? "TR" : "Global"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <FeatureStatusBadge status={ef.featureStatus} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ef.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Screenshots */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Screenshotlar ({feature.screenshots.length})
        </h2>
        <ScreenshotGallery
          screenshots={feature.screenshots}
          showExchangeName
        />
      </div>
    </div>
  );
}
