"use client";

import { useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getScreenshotUrl } from "@/lib/utils";

interface Screenshot {
  id: string;
  s3Url: string;
  aiConfidence?: number | null;
  isVerified: boolean;
  exchange?: { name: string };
  feature?: { name: string } | null;
  category?: { name: string } | null;
}

interface ScreenshotLightboxProps {
  screenshots: Screenshot[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ScreenshotLightbox({
  screenshots,
  currentIndex,
  onClose,
  onNavigate,
}: ScreenshotLightboxProps) {
  const current = screenshots[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < screenshots.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
      if (e.key === "Escape") onClose();
    },
    [currentIndex, hasPrev, hasNext, onNavigate, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!current) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden backdrop-blur-md animate-scale-in">
        <div className="relative flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              {current.exchange && (
                <Badge variant="default">{current.exchange.name}</Badge>
              )}
              {current.feature && (
                <Badge variant="secondary">{current.feature.name}</Badge>
              )}
              {current.category && (
                <Badge variant="outline">{current.category.name}</Badge>
              )}
              {current.aiConfidence != null && (
                <span className="text-xs text-muted-foreground">
                  AI: {Math.round(current.aiConfidence * 100)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {screenshots.length}
              </span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative flex items-center justify-center bg-black min-h-[60vh]">
            {hasPrev && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 bg-black/50 text-white hover:bg-black/70"
                onClick={() => onNavigate(currentIndex - 1)}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getScreenshotUrl(current.s3Url)}
              alt={`Screenshot ${current.feature?.name || ""}`}
              className="max-h-[70vh] max-w-full object-contain"
            />

            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                onClick={() => onNavigate(currentIndex + 1)}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Keyboard hints */}
          <div className="flex items-center justify-center gap-4 p-2.5 border-t bg-muted/30 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">←</kbd>
              Önceki
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">→</kbd>
              Sonraki
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
              Kapat
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
