"use client";

import { useState, useEffect, useCallback } from "react";
import { ClassificationPanel } from "@/components/ClassificationPanel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Screenshot {
  id: string;
  s3Url: string;
  exchange: { name: string };
  feature?: { name: string } | null;
  aiClassification?: Record<string, unknown> | null;
  aiConfidence?: number | null;
}

export default function ClassifyPage() {
  const [unclassified, setUnclassified] = useState<Screenshot[]>([]);
  const [classified, setClassified] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScreenshots = useCallback(async () => {
    setLoading(true);
    try {
      const [unclassifiedRes, classifiedRes] = await Promise.all([
        fetch("/api/screenshots?classified=false"),
        fetch("/api/screenshots?classified=true"),
      ]);
      setUnclassified(await unclassifiedRes.json());
      setClassified(await classifiedRes.json());
    } catch (error) {
      console.error("Failed to load screenshots:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScreenshots();
  }, [loadScreenshots]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Sınıflandırma</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {unclassified.length} sınıflandırılmamış
          </Badge>
          <Badge variant="secondary">
            {classified.length} sınıflandırılmış
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="unclassified">
        <TabsList>
          <TabsTrigger value="unclassified">
            Sınıflandırılmamış ({unclassified.length})
          </TabsTrigger>
          <TabsTrigger value="classified">
            Sınıflandırılmış ({classified.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unclassified" className="mt-4">
          {unclassified.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Tüm screenshotlar sınıflandırılmış!
            </div>
          ) : (
            <ClassificationPanel
              screenshots={unclassified}
              onClassified={loadScreenshots}
            />
          )}
        </TabsContent>

        <TabsContent value="classified" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classified.map((ss) => (
              <div
                key={ss.id}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{ss.exchange.name}</span>
                  {ss.aiConfidence != null && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(ss.aiConfidence * 100)}%
                    </Badge>
                  )}
                </div>
                {ss.feature && (
                  <Badge variant="secondary" className="text-xs">
                    {ss.feature.name}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
