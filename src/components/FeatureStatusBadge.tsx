import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, X, Clock, AlertTriangle, HelpCircle } from "lucide-react";

interface FeatureStatusBadgeProps {
  status: string;
  compact?: boolean;
}

const statusConfig: Record<string, {
  label: string;
  className: string;
  compactClassName: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  available: {
    label: "VAR",
    className: "bg-success/10 text-success border-success/20",
    compactClassName: "bg-success/10 text-success",
    icon: Check,
  },
  not_available: {
    label: "YOK",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    compactClassName: "bg-destructive/10 text-destructive",
    icon: X,
  },
  beta: {
    label: "Beta",
    className: "bg-warning/10 text-warning-foreground border-warning/20",
    compactClassName: "bg-warning/10 text-warning-foreground",
    icon: AlertTriangle,
  },
  coming_soon: {
    label: "Yakında",
    className: "bg-info/10 text-info border-info/20",
    compactClassName: "bg-info/10 text-info",
    icon: Clock,
  },
  unknown: {
    label: "Belirsiz",
    className: "bg-muted text-muted-foreground border-muted",
    compactClassName: "bg-muted text-muted-foreground",
    icon: HelpCircle,
  },
};

export function FeatureStatusBadge({ status, compact }: FeatureStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors",
          config.compactClassName
        )}
        title={config.label}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <Badge variant="outline" className={cn("text-xs gap-1", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
