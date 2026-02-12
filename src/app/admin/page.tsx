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
import { Plus, Trash2, Bell } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        {pendingCount > 0 && (
          <Link href="/admin/updates">
            <Badge variant="destructive" className="cursor-pointer">
              <Bell className="h-3 w-3 mr-1" />
              {pendingCount} AI önerisi
            </Badge>
          </Link>
        )}
      </div>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">Excel Import</TabsTrigger>
          <TabsTrigger value="exchanges">Borsalar</TabsTrigger>
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
            <CardContent className="flex gap-2">
              <Input
                placeholder="Borsa adı"
                value={newExchangeName}
                onChange={(e) => setNewExchangeName(e.target.value)}
              />
              <Select value={newExchangeType} onValueChange={setNewExchangeType}>
                <SelectTrigger className="w-[120px]">
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
            <CardContent className="space-y-2">
              {exchanges.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{e.name}</span>
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
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
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
            <CardContent className="flex gap-2">
              <Input
                placeholder="Özellik adı"
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
              />
              <Select value={newFeatureCat} onValueChange={setNewFeatureCat}>
                <SelectTrigger className="w-[160px]">
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
    </div>
  );
}
