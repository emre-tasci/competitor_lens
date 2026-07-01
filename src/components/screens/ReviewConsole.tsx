"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Inbox, Layers, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { displayLabel } from "@/lib/taxonomy";
import { ScreensSubnav } from "./ScreensSubnav";
import { CorrectionPanel } from "./CorrectionPanel";
import type { ScreenItem } from "./types";

interface Gap {
  id: string;
  screenshotId: string | null;
  exchangeName: string | null;
  proposedArea: string | null;
  proposedScreen: string | null;
  reason: string;
  resolved: boolean;
  createdAt: string;
}

function ReviewQueue() {
  const [items, setItems] = useState<ScreenItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/classifications?needsReview=true&pageSize=60")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const [resolving, setResolving] = useState<string | null>(null);

  const markReviewed = useCallback(
    async (screenshotId: string) => {
      setResolving(screenshotId);
      try {
        await fetch(`/api/classifications/${screenshotId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewedBy: "admin" }),
        });
        load();
      } finally {
        setResolving(null);
      }
    },
    [load]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="h-64 animate-pulse rounded-xl border bg-muted" />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
        <Inbox className="mb-3 h-7 w-7 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">İnceleme bekleyen ekran yok. Kuyruk temiz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        {total.toLocaleString("tr-TR")} ekran inceleme bekliyor
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.screenshotId} className="panel accent-edge overflow-hidden p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href={`/screens/${item.screenshotId}`}
                className="relative block h-40 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted"
              >
                {item.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbUrl}
                    alt="Ekran"
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Layers className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.sourceApp || item.exchangeName || "Bilinmeyen"}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {item.reviewReason || "İnceleme gerekli"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => markReviewed(item.screenshotId)}
                      disabled={resolving === item.screenshotId}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium transition-colors hover:bg-accent/60 disabled:opacity-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      İncelendi
                    </button>
                    <Link
                      href={`/screens/${item.screenshotId}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Detay <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Fonksiyon
                    </p>
                    <CorrectionPanel
                      screenshotId={item.screenshotId}
                      axis="A"
                      labels={item.labels}
                      onChanged={load}
                    />
                  </div>
                  <div>
                    <p className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      UI Tipi
                    </p>
                    <CorrectionPanel
                      screenshotId={item.screenshotId}
                      axis="B"
                      labels={item.labels}
                      onChanged={load}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapLog() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/classifications/gaps")
      .then((r) => r.json())
      .then((d) => setGaps(d.gaps ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-40 animate-pulse rounded-xl border bg-muted" />;

  if (gaps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        Bekleyen taksonomi boşluğu önerisi yok.
      </div>
    );
  }

  return (
    <div className="panel divide-rows px-4">
      {gaps.map((g) => (
        <div key={g.id} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {g.proposedArea && (
                <Badge variant="outline" className="font-mono text-xs">
                  {g.proposedArea}
                  {g.proposedScreen ? `:${g.proposedScreen}` : ""}
                </Badge>
              )}
              {g.exchangeName && (
                <span className="text-xs text-muted-foreground">{g.exchangeName}</span>
              )}
              {g.resolved && <Badge variant="secondary">Çözüldü</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{g.reason}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground/70">
              {new Date(g.createdAt).toLocaleDateString("tr-TR")}
            </span>
            {g.screenshotId && (
              <Link
                href={`/screens/${g.screenshotId}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReviewConsole() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ekran Konsolu"
        title="İnceleme Kuyruğu"
        description="Modelin emin olmadığı ekranları hızlıca doğrulayın ve taksonomi boşluğu önerilerini gözden geçirin."
      />
      <ScreensSubnav />

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">İnceleme Kuyruğu</TabsTrigger>
          <TabsTrigger value="gaps">Taksonomi Boşlukları</TabsTrigger>
        </TabsList>
        <TabsContent value="queue" className="mt-5">
          <ReviewQueue />
        </TabsContent>
        <TabsContent value="gaps" className="mt-5">
          <GapLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
