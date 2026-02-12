"use client";

import { cn } from "@/lib/utils";

interface MarketTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  { label: "Hepsi", value: "" },
  { label: "Türk", value: "turkish" },
  { label: "Global", value: "global" },
];

export function MarketTypeFilter({ value, onChange }: MarketTypeFilterProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-sm transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
