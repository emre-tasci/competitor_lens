"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Camera, ImageIcon } from "lucide-react";
import { getScreenshotUrl } from "@/lib/utils";
import { ScreenshotLightbox } from "./ScreenshotLightbox";

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

interface ScreenshotGroup {
  id: string;
  title: string;
  subtitle?: string;
  screenshots: Screenshot[];
}

interface GroupedScreenshotGalleryProps {
  groups: ScreenshotGroup[];
  unclassified?: Screenshot[];
  showExchangeName?: boolean;
}

export function GroupedScreenshotGallery({
  groups,
  unclassified = [],
  showExchangeName = false,
}: GroupedScreenshotGalleryProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [lightbox, setLightbox] = useState<{
    screenshots: Screenshot[];
    index: number;
  } | null>(null);

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allGroups = [
    ...groups,
    ...(unclassified.length > 0
      ? [
          {
            id: "__unclassified__",
            title: "Sınıflandırılmamış",
            subtitle: undefined,
            screenshots: unclassified,
          },
        ]
      : []),
  ];

  if (allGroups.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-muted/50 rounded-2xl p-4 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-muted-foreground">Henüz screenshot yok</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Bu bölüme ait screenshot eklendiğinde burada görünecek
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {allGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <div key={group.id} className="border rounded-xl overflow-hidden">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="bg-primary/10 rounded-lg p-1.5">
                    <Camera className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{group.title}</span>
                  {group.subtitle && (
                    <Badge variant="outline" className="text-xs">
                      {group.subtitle}
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {group.screenshots.length}
                </Badge>
              </button>

              {/* Group Content */}
              {!isCollapsed && (
                <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {group.screenshots.map((screenshot, index) => {
                    const url = screenshot.thumbnailUrl
                      ? getScreenshotUrl(screenshot.thumbnailUrl)
                      : getScreenshotUrl(screenshot.s3Url);

                    return (
                      <div
                        key={screenshot.id}
                        className="group relative aspect-[9/16] bg-muted rounded-lg overflow-hidden cursor-pointer border hover:border-primary hover:-translate-y-1 hover:shadow-lg transition-all"
                        onClick={() =>
                          setLightbox({
                            screenshots: group.screenshots,
                            index,
                          })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Screenshot ${screenshot.feature?.name || ""}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          {showExchangeName && screenshot.exchange && (
                            <p className="text-white text-xs font-medium">
                              {screenshot.exchange.name}
                            </p>
                          )}
                          {screenshot.feature && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] mt-0.5"
                            >
                              {screenshot.feature.name}
                            </Badge>
                          )}
                          {screenshot.aiConfidence != null && (
                            <span className="text-[10px] text-white/70 ml-1">
                              {Math.round(screenshot.aiConfidence * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <ScreenshotLightbox
          screenshots={lightbox.screenshots}
          currentIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) =>
            setLightbox((prev) => (prev ? { ...prev, index } : null))
          }
        />
      )}
    </>
  );
}
