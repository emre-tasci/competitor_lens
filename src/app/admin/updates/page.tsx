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
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Loader2, Brain } from "lucide-react";

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

function SuggestionSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
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
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2.5">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          AI Güncelleme Önerileri
        </h1>
        <p className="text-muted-foreground mt-2">
          Yapay zeka tarafından önerilen durum güncellemelerini inceleyin
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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
        {tab === "pending" && suggestions.length > 0 && !loading && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
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
            <SuggestionSkeletonGrid />
          ) : suggestions.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-muted/50 rounded-2xl p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Brain className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-muted-foreground">
                {tab === "pending"
                  ? "Bekleyen öneri yok"
                  : "Bu kategoride öneri yok"}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                AI yeni öneriler ürettiğinde burada görünecek
              </p>
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
