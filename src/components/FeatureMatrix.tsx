"use client";

import { useState, useEffect } from "react";
import { FeatureStatusBadge } from "./FeatureStatusBadge";
import { MarketTypeFilter } from "./MarketTypeFilter";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import type { MatrixData } from "@/types";

export function FeatureMatrix() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [marketType, setMarketType] = useState("");
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const params = marketType ? `?marketType=${marketType}` : "";
    fetch(`/api/matrix${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [marketType]);

  function toggleCategory(categoryId: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function handleExport() {
    const params = marketType ? `?marketType=${marketType}&format=csv` : "?format=csv";
    window.open(`/api/matrix/export${params}`, "_blank");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <MarketTypeFilter value={marketType} onChange={setMarketType} />
        <div className="flex items-center gap-2">
          {data.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Son güncelleme: {new Date(data.lastUpdated).toLocaleDateString("tr-TR")}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[calc(100vh-200px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              <th className="sticky left-0 z-30 bg-background border-b border-r p-2 text-left min-w-[200px]">
                Özellik
              </th>
              {data.exchanges.map((exchange) => (
                <th
                  key={exchange.id}
                  className="border-b border-r p-2 text-center min-w-[80px] whitespace-nowrap"
                >
                  <span className="text-xs">{exchange.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.categories.map((category) => (
              <>
                {/* Category header row */}
                <tr
                  key={`cat-${category.id}`}
                  className="bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => toggleCategory(category.id)}
                >
                  <td
                    className="sticky left-0 z-10 bg-muted/50 border-b border-r p-2 font-semibold text-xs"
                    colSpan={1}
                  >
                    {collapsedCategories.has(category.id) ? "▶" : "▼"}{" "}
                    {category.name}
                    <span className="ml-1 text-muted-foreground font-normal">
                      ({category.features.length})
                    </span>
                  </td>
                  {data.exchanges.map((exchange) => (
                    <td
                      key={`cat-${category.id}-${exchange.id}`}
                      className="border-b border-r p-2"
                    />
                  ))}
                </tr>

                {/* Feature rows */}
                {!collapsedCategories.has(category.id) &&
                  category.features.map((feature) => (
                    <tr key={feature.id} className="hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-background border-b border-r p-2 pl-6 text-xs">
                        {feature.name}
                      </td>
                      {data.exchanges.map((exchange) => {
                        const cell = data.cells[exchange.id]?.[feature.id];
                        const status = cell?.featureStatus || "unknown";
                        return (
                          <td
                            key={`${exchange.id}-${feature.id}`}
                            className="border-b border-r p-1 text-center"
                          >
                            <FeatureStatusBadge status={status} compact />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
