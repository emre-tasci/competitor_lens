"use client";

import { useState } from "react";
import { getScreenshotUrl } from "@/lib/utils";
import { ScreenshotLightbox } from "./ScreenshotLightbox";
import { Badge } from "@/components/ui/badge";

interface Screenshot {
  id: string;
  s3Url: string;
  thumbnailUrl?: string | null;
  aiConfidence?: number | null;
  isVerified: boolean;
  exchange?: { name: string };
  feature?: { name: string } | null;
  category?: { name: string } | null;
}

interface ScreenshotGalleryProps {
  screenshots: Screenshot[];
  showExchangeName?: boolean;
}

export function ScreenshotGallery({
  screenshots,
  showExchangeName = false,
}: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Henüz screenshot yok
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {screenshots.map((screenshot, index) => {
          const url = screenshot.thumbnailUrl
            ? getScreenshotUrl(screenshot.thumbnailUrl)
            : getScreenshotUrl(screenshot.s3Url);

          return (
            <div
              key={screenshot.id}
              className="group relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
              onClick={() => setSelectedIndex(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Screenshot ${screenshot.feature?.name || "unclassified"}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                {showExchangeName && screenshot.exchange && (
                  <p className="text-white text-xs font-medium">
                    {screenshot.exchange.name}
                  </p>
                )}
                {screenshot.feature && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {screenshot.feature.name}
                  </Badge>
                )}
                {!screenshot.feature && (
                  <Badge variant="outline" className="text-xs mt-1 bg-yellow-100 text-yellow-800">
                    Sınıflandırılmamış
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedIndex !== null && (
        <ScreenshotLightbox
          screenshots={screenshots}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onNavigate={setSelectedIndex}
        />
      )}
    </>
  );
}
