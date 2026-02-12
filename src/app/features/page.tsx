"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FeatureCard } from "@/components/FeatureCard";
import { Badge } from "@/components/ui/badge";

interface Feature {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string; icon: string | null };
  _count: { exchangeFeatures: number; screenshots: number };
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalExchanges, setTotalExchanges] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/features").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ])
      .then(([featuresData, statsData]) => {
        setFeatures(featuresData);
        setTotalExchanges(statsData.totalExchanges);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Group by category
  const byCategory: Record<string, { name: string; features: Feature[] }> = {};
  for (const f of features) {
    const catName = f.category.name;
    if (!byCategory[catName]) {
      byCategory[catName] = { name: catName, features: [] };
    }
    byCategory[catName].features.push(f);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Özellikler</h1>
        <Badge variant="secondary">{features.length} özellik</Badge>
      </div>

      <Accordion type="multiple" defaultValue={Object.keys(byCategory)}>
        {Object.entries(byCategory).map(([key, { name, features: catFeatures }]) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-base">
              <span className="flex items-center gap-2">
                {name}
                <Badge variant="outline" className="text-xs">
                  {catFeatures.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {catFeatures.map((f) => (
                  <FeatureCard
                    key={f.id}
                    id={f.id}
                    name={f.name}
                    categoryName={f.category.name}
                    availableCount={f._count.exchangeFeatures}
                    totalExchanges={totalExchanges}
                    screenshotCount={f._count.screenshots}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
