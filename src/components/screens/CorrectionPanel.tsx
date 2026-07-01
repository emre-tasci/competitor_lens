"use client";

import { useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AXIS_A_AREAS,
  AXIS_B_GROUPS,
  displayLabel,
} from "@/lib/taxonomy";
import { LabelChip } from "./LabelChip";
import type { ScreenLabel } from "./types";

type Action = "add" | "remove" | "set_primary";

function titleCase(s: string) {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function CorrectionPanel({
  screenshotId,
  axis,
  labels,
  onChanged,
}: {
  screenshotId: string;
  axis: "A" | "B";
  labels: ScreenLabel[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");

  const axisLabels = labels.filter((l) => l.axis === axis);
  const present = new Set(axisLabels.map((l) => l.label));

  const options = useMemo(() => {
    if (axis === "A") {
      return Object.entries(AXIS_A_AREAS).map(([area, screens]) => ({
        group: titleCase(area),
        slugs: screens.map((s) => `${area}:${s}`),
      }));
    }
    return (["base", "overlay", "state"] as const).map((g) => ({
      group: { base: "Temel", overlay: "Katman", state: "Durum" }[g],
      slugs: AXIS_B_GROUPS[g],
    }));
  }, [axis]);

  async function apply(action: Action, label: string, key: string) {
    setBusy(key);
    try {
      const res = await fetch(`/api/classifications/${screenshotId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ axis, label, action, reviewedBy: "console" }),
      });
      if (res.status === 401) {
        toast.error("Düzeltme için admin girişi gerekli.", {
          description: "/admin/login üzerinden giriş yapın.",
        });
        return;
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error("Düzeltme kaydedilemedi", { description: e.error });
        return;
      }
      const verb =
        action === "add" ? "eklendi" : action === "remove" ? "kaldırıldı" : "birincil yapıldı";
      toast.success(`Etiket ${verb}`, { description: displayLabel(label) });
      onChanged();
    } catch {
      toast.error("Ağ hatası");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {axisLabels.length === 0 && (
          <span className="text-xs text-muted-foreground">Bu eksende etiket yok.</span>
        )}
        {axisLabels.map((l) => {
          const removeKey = `rm-${l.label}`;
          const primKey = `pr-${l.label}`;
          return (
            <div
              key={l.label}
              className="group inline-flex items-center gap-1 rounded-full border border-border bg-card py-0.5 pl-0.5 pr-1"
            >
              <LabelChip
                label={l.label}
                axis={axis}
                isPrimary={l.isPrimary}
                confidence={l.confidence}
                className="border-0 bg-transparent"
              />
              {!l.isPrimary && (
                <button
                  type="button"
                  title="Birincil yap"
                  disabled={busy === primKey}
                  onClick={() => apply("set_primary", l.label, primKey)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                title="Kaldır"
                disabled={busy === removeKey}
                onClick={() => apply("remove", l.label, removeKey)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <option value="">Etiket ekle…</option>
          {options.map((o) => (
            <optgroup key={o.group} label={o.group}>
              {o.slugs
                .filter((s) => !present.has(s))
                .map((s) => (
                  <option key={s} value={s}>
                    {axis === "A"
                      ? displayLabel(s).split(" / ")[1] ?? displayLabel(s)
                      : displayLabel(s).replace(/^UI: /, "")}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          className={cn("gap-1.5", !addValue && "opacity-50")}
          disabled={!addValue || busy === `add-${addValue}`}
          onClick={() => addValue && apply("add", addValue, `add-${addValue}`)}
        >
          <Plus className="h-4 w-4" />
          Ekle
        </Button>
      </div>
    </div>
  );
}
