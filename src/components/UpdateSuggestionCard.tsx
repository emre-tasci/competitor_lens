"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X, ExternalLink } from "lucide-react";
import { FeatureStatusBadge } from "./FeatureStatusBadge";

interface UpdateSuggestionCardProps {
  id: string;
  exchangeName: string;
  featureName: string;
  categoryName: string;
  oldStatus: string;
  suggestedStatus: string;
  aiConfidence: number;
  evidence: string | null;
  sourceUrl: string | null;
  status: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function UpdateSuggestionCard({
  id,
  exchangeName,
  featureName,
  categoryName,
  oldStatus,
  suggestedStatus,
  aiConfidence,
  evidence,
  sourceUrl,
  status,
  selected,
  onSelect,
  onApprove,
  onReject,
}: UpdateSuggestionCardProps) {
  const confidencePercent = Math.round(aiConfidence * 100);

  return (
    <Card
      className={`${selected ? "ring-2 ring-primary" : ""} ${status !== "pending" ? "opacity-60" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onSelect && status === "pending" && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onSelect(id)}
                className="rounded"
              />
            )}
            <CardTitle className="text-sm">{exchangeName}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {categoryName}
            </Badge>
          </div>
          {status !== "pending" && (
            <Badge variant={status === "approved" ? "default" : "destructive"}>
              {status === "approved" ? "Onaylandı" : "Reddedildi"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{featureName}</span>
          <span className="text-muted-foreground">:</span>
          <FeatureStatusBadge status={oldStatus} />
          <span className="text-muted-foreground">→</span>
          <FeatureStatusBadge status={suggestedStatus} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">AI Güven Skoru</span>
            <span className="font-medium">{confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} className="h-1.5" />
        </div>

        {evidence && (
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
            {evidence}
          </p>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Kaynak
          </a>
        )}

        {status === "pending" && (onApprove || onReject) && (
          <div className="flex gap-2 pt-1">
            {onApprove && (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => onApprove(id)}
              >
                <Check className="h-3 w-3 mr-1" />
                Onayla
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onReject(id)}
              >
                <X className="h-3 w-3 mr-1" />
                Reddet
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
