import { FeatureMatrix } from "@/components/FeatureMatrix";
import { PageHeader } from "@/components/PageHeader";

export default function MatrixPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Feature Matrix"
        description="Hangi borsa hangi özelliği sunuyor? Tüm sektör tek tabloda. Hücreye dokunarak durumu güncelleyin."
      />
      <FeatureMatrix />
    </div>
  );
}
