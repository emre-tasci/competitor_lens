"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  RefreshCw,
  FileText,
  Calendar,
  AlertCircle,
  TrendingUp,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface Analysis {
  id: string;
  analysisType: string;
  title: string;
  content: string;
  dataSources: {
    tweetCount?: number;
    announcementCount?: number;
    newsCount?: number;
  } | null;
  period: string | null;
  createdAt: string;
  exchange: {
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
}

const typeConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  daily_brief: {
    label: "Günlük Brifing",
    icon: <Calendar className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  weekly_summary: {
    label: "Haftalık Özet",
    icon: <FileText className="h-4 w-4" />,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  competitor_alert: {
    label: "Rakip Uyarısı",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  trend_analysis: {
    label: "Trend Analizi",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
};

export default function AnalysisPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("type", selectedType);
      params.set("limit", "50");

      const res = await fetch(`/api/analysis?${params}`);
      const data = await res.json();
      setAnalyses(data.analyses || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Analizler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.analysis) {
        toast.success("Analiz oluşturuldu");
        fetchAnalyses();
      } else {
        toast.error(data.error || "Analiz oluşturulamadı");
      }
    } catch {
      toast.error("Analiz oluşturma başarısız");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <Brain className="h-8 w-8" />
            AI Analizler
          </h1>
          <p className="text-muted-foreground mt-1">
            Yapay zeka ile oluşturulan rekabet analizleri ve brifingler
          </p>
        </div>
      </div>

      {/* Generate buttons */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        {Object.entries(typeConfig).map(([type, config]) => (
          <Button
            key={type}
            variant="outline"
            className="h-auto py-3 flex-col items-start gap-1"
            onClick={() => handleGenerate(type)}
            disabled={generating !== null}
          >
            {generating === type ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3" />
                {config.icon}
              </div>
            )}
            <span className="text-xs">{config.label} Oluştur</span>
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tüm tipler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Analizler</SelectItem>
            {Object.entries(typeConfig).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="ml-auto self-center">
          {total} analiz
        </Badge>
      </div>

      {/* Analysis List */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Henüz analiz yok</h3>
            <p className="text-muted-foreground mb-4">
              Yukarıdaki butonlardan birini kullanarak yeni bir analiz oluşturun
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {analyses.map((analysis, i) => {
            const config = typeConfig[analysis.analysisType] || typeConfig.daily_brief;
            const isExpanded = expandedId === analysis.id;

            return (
              <Card
                key={analysis.id}
                className="card-hover animate-fade-in-up"
                style={{ animationDelay: `${(i % 10) * 50}ms` }}
              >
                <CardHeader
                  className="pb-3 cursor-pointer"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : analysis.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`${config.color} text-xs`}>
                        {config.icon}
                        <span className="ml-1">{config.label}</span>
                      </Badge>
                      <CardTitle className="text-base">
                        {analysis.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                      {analysis.dataSources && (
                        <span className="text-xs text-muted-foreground">
                          {analysis.dataSources.tweetCount || 0} tweet ·{" "}
                          {analysis.dataSources.announcementCount || 0} duyuru ·{" "}
                          {analysis.dataSources.newsCount || 0} haber
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(analysis.createdAt).toLocaleDateString("tr-TR")}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html: simpleMarkdown(analysis.content),
                        }}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, "<br/>");
}
