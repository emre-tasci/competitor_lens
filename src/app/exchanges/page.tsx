"use client";

import { useState, useEffect } from "react";
import { ExchangeCard } from "@/components/ExchangeCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Exchange {
  id: string;
  name: string;
  marketType: string;
  logoUrl: string | null;
  _count: { screenshots: number; exchangeFeatures: number };
  featureCount: number;
  totalFeatures: number;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Borsalar</h1>

      <Tabs defaultValue="all">
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
    </div>
  );
}
