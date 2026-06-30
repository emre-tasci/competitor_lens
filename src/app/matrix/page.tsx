import { FeatureMatrix } from "@/components/FeatureMatrix";
import { PageHeader } from "@/components/PageHeader";

export default function MatrixPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Feature Matrix"
        description="Tüm borsa ve özelliklerin tek tabloda karşılaştırması. Hücreye dokunarak detayları görün."
      />
      <FeatureMatrix />
    </div>
  );
}
