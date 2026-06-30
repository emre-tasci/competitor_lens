import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional right-aligned action area (buttons, filters, etc.) */
  action?: React.ReactNode;
  /** Small eyebrow label rendered above the title in muted uppercase */
  eyebrow?: string;
  className?: string;
}

/**
 * Wealthsimple-style page header: a confident, near-black, tightly-tracked
 * title with a calm muted subtitle and generous breathing room. No colored
 * titles, no icon-in-a-red-box — red stays reserved as a deliberate accent.
 */
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in-up",
        className
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
