export type MarketType = "turkish" | "global";

export type FeatureStatus =
  | "available"
  | "not_available"
  | "beta"
  | "coming_soon"
  | "unknown";

export type UpdateStatus = "pending" | "approved" | "rejected";

export type UpdateSource = "manual" | "ai_approved" | "excel_import";

export interface ExchangeWithCounts {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  marketType: string;
  description: string | null;
  _count: {
    screenshots: number;
    exchangeFeatures: number;
  };
  featureCount?: number;
  totalFeatures?: number;
}

export interface FeatureWithCounts {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    icon: string | null;
  };
  _count: {
    exchangeFeatures: number;
    screenshots: number;
  };
  availableCount?: number;
}

export interface MatrixCell {
  exchangeId: string;
  featureId: string;
  hasFeature: boolean;
  featureStatus: FeatureStatus;
  notes: string | null;
}

export interface MatrixData {
  exchanges: {
    id: string;
    name: string;
    marketType: string;
  }[];
  categories: {
    id: string;
    name: string;
    icon: string | null;
    features: {
      id: string;
      name: string;
      slug: string;
    }[];
  }[];
  cells: Record<string, Record<string, MatrixCell>>; // [exchangeId][featureId]
  lastUpdated: string | null;
}

export interface DashboardStats {
  totalExchanges: number;
  turkishExchanges: number;
  globalExchanges: number;
  totalFeatures: number;
  totalScreenshots: number;
  classifiedScreenshots: number;
  unclassifiedScreenshots: number;
  pendingUpdates: number;
  coveragePercentage: number;
}

export interface ClassificationRequest {
  screenshotId: string;
  imageUrl: string;
}

export interface UpdateSuggestion {
  id: string;
  exchangeId: string;
  featureId: string;
  oldStatus: string;
  suggestedStatus: string;
  aiConfidence: number;
  evidence: string | null;
  sourceUrl: string | null;
  status: string;
  reviewedBy: string | null;
  createdAt: string;
  reviewedAt: string | null;
  exchange: { name: string };
  feature: { name: string; category: { name: string } };
}
