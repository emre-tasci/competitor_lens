"use client";

import { useState, useEffect, useCallback } from "react";
import { FeatureStatusBadge } from "./FeatureStatusBadge";
import { MarketTypeFilter } from "./MarketTypeFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Pencil, Lock, Info } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Matrix yükleniyor...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MarketTypeFilter value={marketType} onChange={setMarketType} />
          {data.lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Son güncelleme:{" "}
              {new Date(data.lastUpdated).toLocaleDateString("tr-TR")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg p-3">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span className="text-muted-foreground">
            Hücrelere tıklayarak durumu değiştirebilirsiniz: VAR → YOK → Beta → Yakında → VAR
          </span>
        </div>
      )}

      <div className="border rounded-xl overflow-auto max-h-[calc(100vh-200px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              <th className="sticky left-0 z-30 bg-background border-b border-r p-2.5 text-left min-w-[200px]">
                Özellik
              </th>
              {data.exchanges.map((exchange) => (
                <th
                  key={exchange.id}
                  className="border-b border-r p-2.5 text-center min-w-[80px] whitespace-nowrap"
                >
                  <span className="text-xs font-medium">{exchange.name}</span>
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
                  className="bg-primary/5 cursor-pointer hover:bg-primary/8 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <td
                    className="sticky left-0 z-10 bg-primary/5 border-b border-r p-2.5 font-semibold text-xs"
                    colSpan={1}
                  >
                    <span className="flex items-center gap-2">
                      {collapsedCategories.has(category.id) ? "▶" : "▼"}{" "}
                      {category.name}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {category.features.length}
                      </Badge>
                    </span>
                  </td>
                  {data.exchanges.map((exchange) => (
                    <td
                      key={`cat-${category.id}-${exchange.id}`}
                      className="border-b border-r p-2.5"
                    />
                  ))}
                </tr>

                {/* Feature rows */}
                {!collapsedCategories.has(category.id) &&
                  category.features.map((feature) => (
                    <tr key={feature.id} className="hover:bg-accent/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-background border-b border-r p-2.5 pl-6 text-xs">
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
                                ? "cursor-pointer hover:bg-primary/10 transition-colors"
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
