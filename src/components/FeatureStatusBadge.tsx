import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FeatureStatusBadgeProps {
  status: string;
  compact?: boolean;
}

const statusConfig: Record<string, { label: string; className: string; icon: string }> = {
  available: {
    label: "VAR",
    className: "bg-green-100 text-green-800 border-green-200",
    icon: "✅",
  },
  not_available: {
    label: "YOK",
    className: "bg-red-100 text-red-800 border-red-200",
    icon: "❌",
  },
  beta: {
    label: "Beta",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "🔶",
  },
  coming_soon: {
    label: "Yakında",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "🔜",
  },
  unknown: {
    label: "Belirsiz",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: "❓",
  },
};

export function FeatureStatusBadge({ status, compact }: FeatureStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown;

  if (compact) {
    return (
      <span
        className={cn("inline-flex items-center justify-center w-6 h-6 text-xs rounded", config.className)}
        title={config.label}
      >
        {config.icon}
      </span>
    );
  }

  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.icon} {config.label}
    </Badge>
  );
}
