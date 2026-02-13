"use client";

import { useState, useEffect } from "react";
import { ExcelImporter } from "@/components/ExcelImporter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Bell, Settings } from "lucide-react";
import Link from "next/link";

interface Exchange {
  id: string;
  name: string;
  marketType: string;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // New exchange form
  const [newExchangeName, setNewExchangeName] = useState("");
  const [newExchangeType, setNewExchangeType] = useState("global");
  const [newExchangeUrl, setNewExchangeUrl] = useState("");

  // New feature form
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureCat, setNewFeatureCat] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/exchanges").then((r) => r.json()),
      fetch("/api/features").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ]).then(([exchangesData, featuresData, stats]) => {
      setExchanges(exchangesData);
      // Extract unique categories
      const cats: Record<string, string> = {};
      for (const f of featuresData) {
        cats[f.category.id] = f.category.name;
      }
      setCategories(Object.entries(cats).map(([id, name]) => ({ id, name })));
      setPendingCount(stats.pendingUpdates || 0);
      setLoading(false);
    });
  }, []);

  async function createExchange() {
    if (!newExchangeName) return;
    const res = await fetch("/api/exchanges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newExchangeName,
        marketType: newExchangeType,
        websiteUrl: newExchangeUrl || null,
      }),
    });
    if (res.ok) {
      const exchange = await res.json();
      setExchanges((prev) => [...prev, exchange]);
      setNewExchangeName("");
      setNewExchangeUrl("");
    }
  }

  async function createFeature() {
    if (!newFeatureName || !newFeatureCat) return;
    const res = await fetch("/api/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newFeatureName,
        categoryId: newFeatureCat,
      }),
    });
    if (res.ok) {
      setNewFeatureName("");
    }
  }

  async function deleteExchange(id: string) {
    if (!confirm("Bu borsayı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/exchanges/${id}`, { method: "DELETE" });
    setExchanges((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-2.5">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            Admin
          </h1>
          <p className="text-muted-foreground mt-2">
            Borsalar, özellikler ve veri yönetimi
          </p>
        </div>
        {pendingCount > 0 && (
          <Link href="/admin/updates">
            <Card className="card-hover cursor-pointer border-warning/30 bg-warning/5">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="bg-warning/10 rounded-lg p-2">
                  <Bell className="h-4 w-4 text-warning-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{pendingCount} AI önerisi</p>
                  <p className="text-xs text-muted-foreground">Onay bekliyor</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : (
        <Tabs defaultValue="import" className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <TabsList>
            <TabsTrigger value="import">Excel Import</TabsTrigger>
            <TabsTrigger value="exchanges">Borsalar ({exchanges.length})</TabsTrigger>
            <TabsTrigger value="features">Özellikler</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-4">
            <ExcelImporter />
          </TabsContent>

          <TabsContent value="exchanges" className="mt-4 space-y-4">
            {/* Create Exchange */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yeni Borsa Ekle</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-2">
                <Input
                  placeholder="Borsa adı"
                  value={newExchangeName}
                  onChange={(e) => setNewExchangeName(e.target.value)}
                />
                <Select value={newExchangeType} onValueChange={setNewExchangeType}>
                  <SelectTrigger className="w-full md:w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="turkish">TR</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Website URL"
                  value={newExchangeUrl}
                  onChange={(e) => setNewExchangeUrl(e.target.value)}
                />
                <Button onClick={createExchange}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Exchange List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Borsalar ({exchanges.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {exchanges.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{e.name}</span>
                      <Badge
                        variant={
                          e.marketType === "turkish" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {e.marketType === "turkish" ? "TR" : "Global"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteExchange(e.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="mt-4 space-y-4">
            {/* Create Feature */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yeni Özellik Ekle</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-2">
                <Input
                  placeholder="Özellik adı"
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                />
                <Select value={newFeatureCat} onValueChange={setNewFeatureCat}>
                  <SelectTrigger className="w-full md:w-[160px]">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={createFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
