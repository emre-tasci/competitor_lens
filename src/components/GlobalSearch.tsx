"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, ListChecks, Search } from "lucide-react";

interface SearchResult {
  exchanges: { id: string; name: string; marketType: string }[];
  features: { id: string; name: string; category: { name: string } }[];
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    exchanges: [],
    features: [],
  });

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ exchanges: [], features: [] });
      return;
    }
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      setResults(data);
    } catch {
      // ignore search errors
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleSelect(type: string, id: string) {
    onOpenChange(false);
    setQuery("");
    router.push(`/${type}/${id}`);
  }

  const hasResults =
    results.exchanges.length > 0 || results.features.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input
            placeholder="Borsa veya özellik ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 shadow-none"
            autoFocus
          />
        </div>

        {hasResults && (
          <div className="max-h-[300px] overflow-auto p-2">
            {results.exchanges.length > 0 && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground px-2 py-1">
                  Borsalar
                </p>
                {results.exchanges.map((exchange) => (
                  <button
                    key={exchange.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                    onClick={() => handleSelect("exchanges", exchange.id)}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {exchange.name}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {exchange.marketType === "turkish" ? "TR" : "Global"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {results.features.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground px-2 py-1">
                  Özellikler
                </p>
                {results.features.map((feature) => (
                  <button
                    key={feature.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                    onClick={() => handleSelect("features", feature.id)}
                  >
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    {feature.name}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {feature.category.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {query.length >= 2 && !hasResults && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Sonuç bulunamadı
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
