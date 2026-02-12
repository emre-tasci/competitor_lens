"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";

interface ImportResult {
  success: boolean;
  exchanges: number;
  features: number;
  cellsCreated: number;
  cellsUpdated: number;
  warnings: string[];
}

export function ExcelImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/matrix/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.errors?.join(", ") || data.error || "Import failed");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {file ? file.name : "Excel dosyası seçin (.xlsx)"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError(null);
            }}
          />
        </div>

        {file && (
          <Button
            onClick={handleImport}
            disabled={importing}
            className="w-full"
          >
            {importing ? "İçe aktarılıyor..." : "İçe Aktar"}
          </Button>
        )}

        {importing && <Progress value={50} className="animate-pulse" />}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded space-y-1 text-sm">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <Check className="h-4 w-4" />
              Import başarılı!
            </div>
            <ul className="text-green-700 text-xs space-y-0.5 ml-6">
              <li>{result.exchanges} borsa işlendi</li>
              <li>{result.features} özellik işlendi</li>
              <li>{result.cellsCreated} yeni hücre oluşturuldu</li>
              <li>{result.cellsUpdated} hücre güncellendi</li>
            </ul>
            {result.warnings.length > 0 && (
              <div className="text-yellow-700 text-xs mt-2">
                <strong>Uyarılar:</strong>
                <ul className="ml-4 list-disc">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
