"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Check, X, Loader2 } from "lucide-react";
import { getScreenshotUrl } from "@/lib/utils";

interface Screenshot {
  id: string;
  s3Url: string;
  exchange: { name: string };
  feature?: { name: string } | null;
  aiClassification?: Record<string, unknown> | null;
  aiConfidence?: number | null;
}

interface ClassificationPanelProps {
  screenshots: Screenshot[];
  onClassified: () => void;
}

export function ClassificationPanel({ screenshots, onClassified }: ClassificationPanelProps) {
  const [classifying, setClassifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<
    { screenshotId: string; status: string; classification?: Record<string, unknown>; error?: string }[]
  >([]);

  async function handleBatchClassify() {
    setClassifying(true);
    setProgress(0);
    setResults([]);

    try {
      const response = await fetch("/api/classify/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshotIds: screenshots.map((s) => s.id),
        }),
      });

      const data = await response.json();
      setResults(data.results || []);
      setProgress(100);
      onClassified();
    } catch (error) {
      console.error("Classification failed:", error);
    } finally {
      setClassifying(false);
    }
  }

  async function handleSingleClassify(screenshotId: string) {
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshotId }),
      });

      const data = await response.json();
      setResults((prev) => [
        ...prev,
        {
          screenshotId,
          status: "success",
          classification: data.classification,
        },
      ]);
      onClassified();
    } catch (error) {
      setResults((prev) => [
        ...prev,
        {
          screenshotId,
          status: "error",
          error: error instanceof Error ? error.message : "Failed",
        },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Sınıflandırılmamış ({screenshots.length})
        </h3>
        <Button
          onClick={handleBatchClassify}
          disabled={classifying || screenshots.length === 0}
        >
          {classifying ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 mr-2" />
          )}
          Toplu Sınıflandır
        </Button>
      </div>

      {classifying && <Progress value={progress} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {screenshots.map((screenshot) => {
          const result = results.find((r) => r.screenshotId === screenshot.id);

          return (
            <Card key={screenshot.id}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {screenshot.exchange.name}
                  </CardTitle>
                  {result && (
                    <Badge
                      variant={
                        result.status === "success" ? "default" : "destructive"
                      }
                    >
                      {result.status === "success" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="aspect-video bg-muted rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getScreenshotUrl(screenshot.s3Url)}
                    alt="Screenshot"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {result?.classification && (
                  <div className="text-xs space-y-1">
                    <p>
                      <strong>Kategori:</strong>{" "}
                      {String(result.classification.category)}
                    </p>
                    <p>
                      <strong>Özellik:</strong>{" "}
                      {String(result.classification.feature)}
                    </p>
                    <p>
                      <strong>Güven:</strong>{" "}
                      {Math.round(Number(result.classification.confidence) * 100)}%
                    </p>
                  </div>
                )}

                {!result && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSingleClassify(screenshot.id)}
                    disabled={classifying}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    Sınıflandır
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
