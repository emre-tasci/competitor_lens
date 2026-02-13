"use client";

import { useState, useEffect, useCallback } from "react";
import { FeatureStatusBadge } from "./FeatureStatusBadge";
import { MarketTypeFilter } from "./MarketTypeFilter";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Pencil, Lock } from "lucide-react";
import { toast } from "sonner";
import type { MatrixData, FeatureStatus } from "@/types";

const STATUS_CYCLE: FeatureStatus[] = [
  "available",
  "not_available",
  "beta",
  "coming_soon",
];

export function FeatureMatrix() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [marketType, setMarketType] = useState("");
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set()
  );
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const params = marketType ? `?marketType=${marketType}` : "";
    fetch(`/api/matrix${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [marketType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleCategory(categoryId: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function handleExport() {
    const params = marketType
      ? `?marketType=${marketType}&format=csv`
      : "?format=csv";
    window.open(`/api/matrix/export${params}`, "_blank");
  }

  async function handleCellClick(exchangeId: string, featureId: string) {
    if (!editMode || !data) return;

    const currentStatus =
      (data.cells[exchangeId]?.[featureId]?.featureStatus as FeatureStatus) ||
      "unknown";
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus =
      STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
    const hasFeature = nextStatus === "available" || nextStatus === "beta";

    const cellKey = `${exchangeId}-${featureId}`;
    setSaving(cellKey);

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const newCells = { ...prev.cells };
      if (!newCells[exchangeId]) newCells[exchangeId] = {};
      newCells[exchangeId] = {
        ...newCells[exchangeId],
        [featureId]: {
          exchangeId,
          featureId,
          hasFeature,
          featureStatus: nextStatus,
          notes: newCells[exchangeId]?.[featureId]?.notes || null,
        },
      };
      return { ...prev, cells: newCells };
    });

    try {
      const res = await fetch("/api/matrix", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchangeId, featureId, hasFeature, featureStatus: nextStatus }),
      });

      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Durum güncellendi: ${nextStatus}`);
    } catch {
      // Revert on error
      loadData();
      toast.error("Güncelleme başarısız");
    } finally {
      setSaving(null);
    }
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
              Son güncelleme:{" "}
              {new Date(data.lastUpdated).toLocaleDateString("tr-TR")}
            </span>
          )}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <Lock className="h-4 w-4 mr-1" />
            ) : (
              <Pencil className="h-4 w-4 mr-1" />
            )}
            {editMode ? "Kilitle" : "Düzenle"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {editMode && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          Hücrelere tıklayarak durumu değiştirebilirsiniz: VAR → YOK → Beta → Yakında → VAR
        </div>
      )}

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
                        const cell =
                          data.cells[exchange.id]?.[feature.id];
                        const status = cell?.featureStatus || "unknown";
                        const cellKey = `${exchange.id}-${feature.id}`;
                        const isSaving = saving === cellKey;

                        return (
                          <td
                            key={cellKey}
                            className={`border-b border-r p-1 text-center ${
                              editMode
                                ? "cursor-pointer hover:bg-accent/50 transition-colors"
                                : ""
                            } ${isSaving ? "opacity-50" : ""}`}
                            onClick={() =>
                              handleCellClick(exchange.id, feature.id)
                            }
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
