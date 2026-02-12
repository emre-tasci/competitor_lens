"use client";

import { useState, useEffect, useCallback } from "react";
import { UpdateSuggestionCard } from "@/components/UpdateSuggestionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Loader2 } from "lucide-react";

interface Suggestion {
  id: string;
  exchangeId: string;
  featureId: string;
  oldStatus: string;
  suggestedStatus: string;
  aiConfidence: number;
  evidence: string | null;
  sourceUrl: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  exchange: { id: string; name: string; marketType: string };
  feature: { id: string; name: string; category: { name: string } };
}

export default function UpdatesPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("pending");
  const [minConfidence, setMinConfidence] = useState("");

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", tab);
    if (minConfidence) params.set("minConfidence", minConfidence);

    try {
      const res = await fetch(`/api/updates?${params}`);
      setSuggestions(await res.json());
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    } finally {
      setLoading(false);
    }
  }, [tab, minConfidence]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === suggestions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(suggestions.map((s) => s.id)));
    }
  }

  async function handleBulkAction(action: "approve" | "reject") {
    if (selected.size === 0) return;
    setProcessing(true);

    try {
      await fetch("/api/updates/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionIds: Array.from(selected),
          action,
        }),
      });
      setSelected(new Set());
      loadSuggestions();
    } catch (error) {
      console.error("Bulk action failed:", error);
    } finally {
      setProcessing(false);
    }
  }

  async function handleSingleAction(id: string, action: "approve" | "reject") {
    setProcessing(true);
    try {
      await fetch("/api/updates/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionIds: [id], action }),
      });
      loadSuggestions();
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Güncelleme Önerileri</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">Bekleyen</TabsTrigger>
            <TabsTrigger value="approved">Onaylanan</TabsTrigger>
            <TabsTrigger value="rejected">Reddedilen</TabsTrigger>
            <TabsTrigger value="all">Hepsi</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={minConfidence} onValueChange={setMinConfidence}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Min güven" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Hepsi</SelectItem>
                <SelectItem value="0.5">50%+</SelectItem>
                <SelectItem value="0.7">70%+</SelectItem>
                <SelectItem value="0.8">80%+</SelectItem>
                <SelectItem value="0.9">90%+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions */}
        {tab === "pending" && suggestions.length > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selected.size === suggestions.length
                ? "Seçimi Kaldır"
                : "Tümünü Seç"}
            </Button>
            {selected.size > 0 && (
              <>
                <Badge variant="secondary">{selected.size} seçili</Badge>
                <Button
                  size="sm"
                  onClick={() => handleBulkAction("approve")}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Toplu Onayla
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("reject")}
                  disabled={processing}
                >
                  <X className="h-3 w-3 mr-1" />
                  Toplu Reddet
                </Button>
              </>
            )}
          </div>
        )}

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              Yükleniyor...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {tab === "pending"
                ? "Bekleyen öneri yok"
                : "Bu kategoride öneri yok"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((s) => (
                <UpdateSuggestionCard
                  key={s.id}
                  id={s.id}
                  exchangeName={s.exchange.name}
                  featureName={s.feature.name}
                  categoryName={s.feature.category.name}
                  oldStatus={s.oldStatus}
                  suggestedStatus={s.suggestedStatus}
                  aiConfidence={s.aiConfidence}
                  evidence={s.evidence}
                  sourceUrl={s.sourceUrl}
                  status={s.status}
                  selected={selected.has(s.id)}
                  onSelect={tab === "pending" ? toggleSelect : undefined}
                  onApprove={
                    tab === "pending"
                      ? (id) => handleSingleAction(id, "approve")
                      : undefined
                  }
                  onReject={
                    tab === "pending"
                      ? (id) => handleSingleAction(id, "reject")
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
