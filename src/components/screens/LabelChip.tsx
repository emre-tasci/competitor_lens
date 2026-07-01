import { cn } from "@/lib/utils";
import { displayLabel } from "@/lib/taxonomy";

interface LabelChipProps {
  label: string;
  axis: "A" | "B";
  isPrimary?: boolean;
  confidence?: number | null;
  className?: string;
  onClick?: () => void;
  title?: string;
}

/**
 * A single classification-label pill. Primary labels read louder (near-black
 * border, medium weight); secondaries stay quiet. Axis-B (UI type) labels carry
 * a subtle red left tick so the two axes are visually separable at a glance.
 */
export function LabelChip({
  label,
  axis,
  isPrimary = false,
  confidence,
  className,
  onClick,
  title,
}: LabelChipProps) {
  const Comp: React.ElementType = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title ?? displayLabel(label)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs leading-tight transition-colors",
        isPrimary
          ? "border-foreground/25 bg-foreground/[0.04] font-medium text-foreground"
          : "border-border bg-transparent text-muted-foreground",
        axis === "B" && "pl-2",
        onClick && "cursor-pointer hover:border-foreground/40 hover:text-foreground",
        className
      )}
    >
      {axis === "B" && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            isPrimary ? "bg-primary" : "bg-primary/40"
          )}
          aria-hidden
        />
      )}
      <span className="truncate">{displayLabel(label)}</span>
      {confidence != null && (
        <span className="font-mono tabular-nums text-[10px] text-muted-foreground/70">
          {Math.round(confidence * 100)}
        </span>
      )}
    </Comp>
  );
}
