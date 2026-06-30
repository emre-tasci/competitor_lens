"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, RefreshCw, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

interface Exchange {
  id: string;
  name: string;
  marketType: string;
}
interface Feature {
  id: string;
  name: string;
  category?: { name: string };
}

type ItemStatus = "pending" | "uploading" | "done" | "error";
interface QueueItem {
  file: File;
  status: ItemStatus;
  error?: string;
}

// Upload at most N files at a time so a large batch doesn't overwhelm the
// serverless function or the browser.
const CONCURRENCY = 3;

export function ScreenshotUploader() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [exchangeId, setExchangeId] = useState<string>("");
  const [featureId, setFeatureId] = useState<string>("none");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/exchanges").then((r) => r.json()),
      fetch("/api/features").then((r) => r.json()),
    ]).then(([ex, fe]) => {
      setExchanges(Array.isArray(ex) ? ex : []);
      setFeatures(Array.isArray(fe) ? fe : []);
    });
  }, []);

  function addFiles(files: FileList | File[]) {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    setQueue((q) => [
      ...q,
      ...imgs.map((file) => ({ file, status: "pending" as ItemStatus })),
    ]);
  }

  function removeItem(idx: number) {
    setQueue((q) => q.filter((_, i) => i !== idx));
  }

  async function uploadAll() {
    if (!exchangeId) {
      toast.error("Önce bir borsa seçin / Select an exchange first");
      return;
    }
    const pendingIdx = queue
      .map((it, i) => (it.status === "pending" || it.status === "error" ? i : -1))
      .filter((i) => i >= 0);
    if (pendingIdx.length === 0) return;

    setUploading(true);
    let ok = 0;
    let fail = 0;

    // simple concurrency-limited worker pool
    let cursor = 0;
    async function worker() {
      while (cursor < pendingIdx.length) {
        const idx = pendingIdx[cursor++];
        const item = queue[idx];
        setQueue((q) =>
          q.map((it, i) => (i === idx ? { ...it, status: "uploading" } : it))
        );
        try {
          const fd = new FormData();
          fd.append("file", item.file);
          fd.append("exchangeId", exchangeId);
          fd.append("featureId", featureId);
          const res = await fetch("/api/screenshots/upload", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `HTTP ${res.status}`);
          }
          ok++;
          setQueue((q) =>
            q.map((it, i) => (i === idx ? { ...it, status: "done" } : it))
          );
        } catch (e) {
          fail++;
          setQueue((q) =>
            q.map((it, i) =>
              i === idx
                ? { ...it, status: "error", error: e instanceof Error ? e.message : "error" }
                : it
            )
          );
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pendingIdx.length) }, worker)
    );

    setUploading(false);
    if (ok) toast.success(`${ok} ekran görüntüsü yüklendi`);
    if (fail) toast.error(`${fail} yükleme başarısız oldu`);
  }

  async function syncFromS3() {
    setSyncing(true);
    try {
      const res = await fetch("/api/screenshots/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(
        `Sync tamam: ${data.imported} yeni, ${data.skipped} mevcut${
          data.newExchanges?.length ? `, ${data.newExchanges.length} yeni borsa` : ""
        }`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync başarısız");
    } finally {
      setSyncing(false);
    }
  }

  const doneCount = queue.filter((q) => q.status === "done").length;
  const progressPct = queue.length ? (doneCount / queue.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Sync from S3 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> S3&apos;ten Senkronize Et
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            S3 klasörüne elle yüklediğiniz dosyaları tarayıp veritabanına ekler
            (mevcutları atlar).
          </p>
          <Button onClick={syncFromS3} disabled={syncing} variant="secondary">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Taranıyor…" : "Sync"}
          </Button>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UploadCloud className="h-4 w-4" /> Ekran Görüntüsü Yükle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
            <Select value={exchangeId} onValueChange={setExchangeId}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Borsa seçin (zorunlu)" />
              </SelectTrigger>
              <SelectContent>
                {exchanges.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} {e.marketType === "turkish" ? "🇹🇷" : "🌍"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={featureId} onValueChange={setFeatureId}>
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Özellik (opsiyonel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Özellik yok (sonra sınıflandır)</SelectItem>
                {features.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Fotoğrafları buraya sürükleyin veya tıklayıp seçin
            </p>
            <p className="text-xs text-muted-foreground">
              Birden fazla dosya seçebilirsiniz (toplu yükleme)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {doneCount}/{queue.length} yüklendi
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueue([])}
                    disabled={uploading}
                  >
                    Temizle
                  </Button>
                  <Button onClick={uploadAll} disabled={uploading || !exchangeId}>
                    <UploadCloud className="h-4 w-4" />
                    {uploading ? "Yükleniyor…" : `Yükle (${queue.filter((q) => q.status !== "done").length})`}
                  </Button>
                </div>
              </div>
              <Progress value={progressPct} />
              <div className="max-h-56 overflow-auto space-y-1">
                {queue.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{it.file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          it.status === "done"
                            ? "default"
                            : it.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                        title={it.error}
                      >
                        {it.status === "pending"
                          ? "bekliyor"
                          : it.status === "uploading"
                          ? "yükleniyor"
                          : it.status === "done"
                          ? "tamam"
                          : "hata"}
                      </Badge>
                      {!uploading && it.status !== "done" && (
                        <button
                          onClick={() => removeItem(i)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
