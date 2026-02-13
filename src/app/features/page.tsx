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
import { Skeleton } from "@/components/ui/skeleton";
import { ListChecks } from "lucide-react";

interface Feature {
  id: string;
  name: string;
  slug: string;
  category: { id: string; name: string; icon: string | null };
  _count: { exchangeFeatures: number; screenshots: number };
}

function FeatureSkeletonGrid() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="border rounded-lg p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
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

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-2.5">
              <ListChecks className="h-6 w-6 text-primary" />
            </div>
            Özellikler
          </h1>
          {!loading && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {features.length} özellik
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          Tüm borsalarda izlenen özellikler ve kapsam durumları
        </p>
      </div>

      {loading ? (
        <FeatureSkeletonGrid />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={Object.keys(byCategory)}
          className="animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          {Object.entries(byCategory).map(([key, { name, features: catFeatures }]) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="text-base hover:no-underline">
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
      )}
    </div>
  );
}
