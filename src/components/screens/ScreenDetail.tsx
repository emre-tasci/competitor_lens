"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Cpu,
  Clock,
  Hash,
  Languages,
  Smartphone,
  History,
} from "lucide-react";
import { displayLabel } from "@/lib/taxonomy";
import { LabelChip } from "./LabelChip";
import { CorrectionPanel } from "./CorrectionPanel";
import type { ScreenLabel } from "./types";

interface DetailData {
  screenshotId: string;
  exchangeName: string | null;
  contentHash: string;
  taxonomyVersion: string;
  sourceApp: string | null;
  sourceAppConfidence: number | null;
  capturedPlatform: string | null;
  language: string | null;
  modelTier: number;
  modelName: string;
  modelMode: string;
  overlayPresent: boolean;
  salientText: string[];
  rationale: string;
  needsReview: boolean;
  reviewReason: string | null;
  classifiedAt: string;
  imageUrl: string | null;
  labels: (ScreenLabel & { id: string })[];
  overrides: {
    id: string;
    axis: string;
    label: string;
    action: string;
    reviewedBy: string | null;
    note: string | null;
    createdAt: string;
  }[];
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-right font-medium text-foreground">{value ?? "-"}</span>
    </div>
  );
}

export function ScreenDetail({ id }: { id: string }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/classifications/${id}`);
      if (!res.ok) {
        setError(true);
        return;
      }
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border bg-muted" />;
  }
  if (error || !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-muted-foreground">Kayıt bulunamadı.</p>
      </div>
    );
  }

  const actionLabel: Record<string, string> = {
    add: "eklendi",
    remove: "kaldırıldı",
    set_primary: "birincil",
  };

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Image */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-xl border bg-muted">
            {data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.imageUrl}
                alt={data.labels.find((l) => l.axis === "A" && l.isPrimary)?.label ?? "Ekran"}
                className="h-auto w-full"
              />
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center text-muted-foreground">
                Görsel yüklenemedi
              </div>
            )}
          </div>
        </div>

        {/* Detail column */}
        <div className="space-y-6">
          <div>
            <p className="eyebrow">{data.sourceApp || data.exchangeName || "Bilinmeyen uygulama"}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {data.labels.find((l) => l.axis === "A" && l.isPrimary)
                ? displayLabel(data.labels.find((l) => l.axis === "A" && l.isPrimary)!.label)
                : "Sınıflandırılmamış"}
            </h1>
            {data.needsReview && (
              <div className="accent-edge mt-3 rounded-r-md bg-warning/10 py-2 pl-3 pr-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  İnceleme gerekli
                </span>
                {data.reviewReason && (
                  <p className="mt-0.5 text-muted-foreground">{data.reviewReason}</p>
                )}
              </div>
            )}
          </div>

          {/* Axis A correction */}
          <section className="panel p-4">
            <div className="section-head mb-3">
              <span>Fonksiyon · Eksen A</span>
            </div>
            <CorrectionPanel
              screenshotId={data.screenshotId}
              axis="A"
              labels={data.labels}
              onChanged={load}
            />
          </section>

          {/* Axis B correction */}
          <section className="panel p-4">
            <div className="section-head mb-3">
              <span>UI Tipi · Eksen B</span>
            </div>
            <CorrectionPanel
              screenshotId={data.screenshotId}
              axis="B"
              labels={data.labels}
              onChanged={load}
            />
          </section>

          {/* Provenance */}
          <section className="panel p-4">
            <div className="section-head mb-1">
              <span>Kaynak & Model</span>
            </div>
            <div className="divide-y divide-border">
              <MetaRow icon={Smartphone} label="Platform" value={data.capturedPlatform} />
              <MetaRow icon={Languages} label="Dil" value={data.language} />
              <MetaRow
                icon={Cpu}
                label="Model"
                value={
                  <span className="font-mono text-xs">
                    {data.modelName}{" "}
                    <span className="text-muted-foreground">
                      · T{data.modelTier} · {data.modelMode}
                    </span>
                  </span>
                }
              />
              <MetaRow
                icon={Hash}
                label="Taksonomi"
                value={<span className="font-mono text-xs">{data.taxonomyVersion}</span>}
              />
              <MetaRow
                icon={Clock}
                label="Sınıflandırma"
                value={new Date(data.classifiedAt).toLocaleString("tr-TR")}
              />
              <MetaRow
                icon={Hash}
                label="İçerik hash"
                value={<span className="font-mono text-xs">{data.contentHash.slice(0, 12)}…</span>}
              />
            </div>
          </section>

          {/* Salient text */}
          {data.salientText.length > 0 && (
            <section className="panel p-4">
              <div className="section-head mb-3">
                <span>OCR Metin İpuçları</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.salientText.map((t, i) => (
                  <span
                    key={i}
                    className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Rationale */}
          {data.rationale && (
            <section className="panel p-4">
              <div className="section-head mb-3">
                <span>Model Gerekçesi</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{data.rationale}</p>
            </section>
          )}

          {/* Override history */}
          {data.overrides.length > 0 && (
            <section className="panel p-4">
              <div className="section-head mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" /> Düzeltme Geçmişi
                </span>
              </div>
              <ul className="divide-rows">
                {data.overrides.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 py-2 text-sm">
                    <LabelChip label={o.label} axis={o.axis as "A" | "B"} />
                    <span className="text-muted-foreground">
                      {actionLabel[o.action] ?? o.action}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground/70">
                      {new Date(o.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Düzeltmeler ekran kimliğine bağlıdır; yeniden sınıflandırma ve taksonomi
                güncellemelerinde korunur.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/screens"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Galeriye dön
    </Link>
  );
}
