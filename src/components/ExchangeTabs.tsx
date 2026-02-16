"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExchangeCard } from "@/components/ExchangeCard";

interface Exchange {
  id: string;
  name: string;
  marketType: string;
  logoUrl: string | null;
  featureCount: number;
  totalFeatures: number;
  screenshotCount: number;
}

export function ExchangeTabs({ exchanges }: { exchanges: Exchange[] }) {
  const turkish = exchanges.filter((e) => e.marketType === "turkish");
  const global = exchanges.filter((e) => e.marketType === "global");

  return (
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
              screenshotCount={e.screenshotCount}
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
              screenshotCount={e.screenshotCount}
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
              screenshotCount={e.screenshotCount}
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
