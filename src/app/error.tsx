"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Route-level error boundary. A live-data page can throw if a query fails;
// this keeps the failure calm and recoverable instead of a blank 500.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="panel accent-edge max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <AlertTriangle className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">Bir şeyler ters gitti</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sayfa yüklenirken bir hata oluştu. Tekrar deneyebilirsiniz; sorun
          sürerse birazdan yeniden deneyin.
        </p>
        <Button onClick={reset} className="mt-6">
          <RotateCw className="mr-1.5 h-4 w-4" />
          Tekrar dene
        </Button>
      </div>
    </div>
  );
}
