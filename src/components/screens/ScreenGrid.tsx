"use client";

import Link from "next/link";
import { AlertTriangle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { displayLabel } from "@/lib/taxonomy";
import type { ScreenItem } from "./types";

function ScreenCard({ item }: { item: ScreenItem }) {
  return (
    <Link
      href={`/screens/${item.screenshotId}`}
      className="group reveal block overflow-hidden rounded-xl border bg-card transition-all card-hover"
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-muted">
        {item.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbUrl}
            alt={item.primaryA ? displayLabel(item.primaryA) : "Ekran görüntüsü"}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Layers className="h-6 w-6" />
          </div>
        )}

        {item.needsReview && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-medium text-warning-foreground shadow-sm">
            <AlertTriangle className="h-3 w-3" />
            İnceleme
          </span>
        )}
        {item.overlayPresent && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
            Overlay
          </span>
        )}

        {/* Bottom chips over gradient */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-2 pt-8">
          {item.primaryA && (
            <span className="truncate text-[11px] font-medium text-white">
              {displayLabel(item.primaryA)}
            </span>
          )}
          {item.primaryB && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] text-white backdrop-blur">
              <span className="h-1 w-1 rounded-full bg-primary" aria-hidden />
              {displayLabel(item.primaryB)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="truncate text-xs font-medium text-foreground">
          {item.sourceApp || item.exchangeName || "-"}
        </span>
        <span className="shrink-0 font-mono text-[10px] uppercase tabular-nums text-muted-foreground">
          {item.capturedPlatform || "-"}
        </span>
      </div>
    </Link>
  );
}

export function ScreenGrid({
  items,
  loading,
  emptyLabel = "Bu filtrelerle eşleşen ekran yok.",
}: {
  items: ScreenItem[];
  loading?: boolean;
  emptyLabel?: string;
}) {
  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[9/16] animate-pulse rounded-xl border bg-muted"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
        <Layers className="mb-3 h-7 w-7 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
        loading && "opacity-60 transition-opacity"
      )}
    >
      {items.map((item) => (
        <ScreenCard key={item.screenshotId} item={item} />
      ))}
    </div>
  );
}
