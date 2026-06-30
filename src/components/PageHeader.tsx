import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional right-aligned action area (buttons, filters, etc.) */
  action?: React.ReactNode;
  /** Small eyebrow label rendered above the title (muted, red-dot kicker) */
  eyebrow?: string;
  /** Visual weight of the title. `display` is the big, confident hero size. */
  size?: "default" | "display";
  /** Render a hairline rule beneath the header for an editorial divide. */
  divider?: boolean;
  /** Optional meta node rendered under the description (counts, timestamps). */
  meta?: React.ReactNode;
  className?: string;
}

/**
 * Editorial page header — a confident, near-black, tightly-tracked title with
 * a red-dot eyebrow kicker and generous breathing room. Wealthsimple's calm
 * hierarchy; StableX red appears only as the kicker dot and (optionally) the
 * primary action. No colored titles, no icon-in-a-box.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  size = "default",
  divider = false,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "reveal flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        divider && "border-b border-border pb-6",
        className
      )}
    >
      <div className="space-y-3">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1
          className={cn(
            "font-bold text-foreground text-balance",
            size === "display"
              ? "text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.04] tracking-[-0.035em]"
              : "text-3xl md:text-4xl tracking-tight"
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
        {meta && <div className="pt-1">{meta}</div>}
      </div>
      {action && (
        <div className="flex items-center gap-2 shrink-0">{action}</div>
      )}
    </div>
  );
}
