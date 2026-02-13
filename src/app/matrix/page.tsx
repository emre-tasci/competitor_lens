import { FeatureMatrix } from "@/components/FeatureMatrix";
import { Grid3X3 } from "lucide-react";

export default function MatrixPage() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2.5">
            <Grid3X3 className="h-6 w-6 text-primary" />
          </div>
          Feature Matrix
        </h1>
        <p className="text-muted-foreground mt-2">
          Tüm borsa ve özelliklerin karşılaştırma matrisi
        </p>
      </div>
      <FeatureMatrix />
    </div>
  );
}
