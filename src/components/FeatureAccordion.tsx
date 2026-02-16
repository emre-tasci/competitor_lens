"use client";

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
  categoryName: string;
  availableCount: number;
  totalExchanges: number;
  screenshotCount: number;
}

interface CategoryGroup {
  name: string;
  features: Feature[];
}

export function FeatureAccordion({
  categories,
}: {
  categories: CategoryGroup[];
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={categories.map((c) => c.name)}
      className="animate-fade-in-up"
      style={{ animationDelay: "100ms" }}
    >
      {categories.map((cat) => (
        <AccordionItem key={cat.name} value={cat.name}>
          <AccordionTrigger className="text-base hover:no-underline">
            <span className="flex items-center gap-2">
              {cat.name}
              <Badge variant="outline" className="text-xs">
                {cat.features.length}
              </Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {cat.features.map((f) => (
                <FeatureCard
                  key={f.id}
                  id={f.id}
                  name={f.name}
                  categoryName={f.categoryName}
                  availableCount={f.availableCount}
                  totalExchanges={f.totalExchanges}
                  screenshotCount={f.screenshotCount}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
