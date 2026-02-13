"use client";

import { useState, useEffect } from "react";
import { ExchangeCard } from "@/components/ExchangeCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";

interface Exchange {
  id: string;
  name: string;
  marketType: string;
  logoUrl: string | null;
  _count: { screenshots: number; exchangeFeatures: number };
  featureCount: number;
  totalFeatures: number;
}

function ExchangeSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function ExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exchanges")
      .then((r) => r.json())
      .then(setExchanges)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const turkish = exchanges.filter((e) => e.marketType === "turkish");
  const global = exchanges.filter((e) => e.marketType === "global");

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2.5">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          Borsalar
        </h1>
        <p className="text-muted-foreground mt-2">
          Takip edilen kripto para borsaları ve özellik kapsam oranları
        </p>
      </div>

      {loading ? (
        <ExchangeSkeletonGrid />
      ) : (
        <Tabs defaultValue="all" className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <TabsList>
            <TabsTrigger value="all">Hepsi ({exchanges.length})</TabsTrigger>
            <TabsTrigger value="turkish">Türk ({turkish.length})</TabsTrigger>
            <TabsTrigger value="global">Global ({global.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exchanges.map((e) => (
                <ExchangeCard
                  key={e.id}
                  id={e.id}
                  name={e.name}
                  marketType={e.marketType}
                  logoUrl={e.logoUrl}
                  featureCount={e.featureCount}
                  totalFeatures={e.totalFeatures}
                  screenshotCount={e._count.screenshots}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="turkish" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {turkish.map((e) => (
                <ExchangeCard
                  key={e.id}
                  id={e.id}
                  name={e.name}
                  marketType={e.marketType}
                  logoUrl={e.logoUrl}
                  featureCount={e.featureCount}
                  totalFeatures={e.totalFeatures}
                  screenshotCount={e._count.screenshots}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="global" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {global.map((e) => (
                <ExchangeCard
                  key={e.id}
                  id={e.id}
                  name={e.name}
                  marketType={e.marketType}
                  logoUrl={e.logoUrl}
                  featureCount={e.featureCount}
                  totalFeatures={e.totalFeatures}
                  screenshotCount={e._count.screenshots}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
