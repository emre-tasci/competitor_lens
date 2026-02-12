import * as XLSX from "xlsx";
import { FEATURE_CATEGORY_MAP, slugify } from "./feature-category-map";

export interface ExcelRow {
  exchangeName: string;
  marketType: "turkish" | "global";
  features: Record<string, string>; // feature name -> "VAR" | "YOK" | ""
}

export interface ParsedExcelData {
  rows: ExcelRow[];
  featureColumns: string[];
  errors: string[];
}

export function parseExcelBuffer(buffer: Buffer): ParsedExcelData {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
  });

  const errors: string[] = [];
  const rows: ExcelRow[] = [];

  if (rawData.length === 0) {
    errors.push("Excel dosyası boş");
    return { rows, featureColumns: [], errors };
  }

  // Get all column headers
  const headers = Object.keys(rawData[0]);
  const nameCol = headers.find(
    (h) => h.toLowerCase().trim() === "competitor name"
  );
  const typeCol = headers.find(
    (h) => h.toLowerCase().trim() === "local/global"
  );

  if (!nameCol) {
    errors.push('"competitor name" sütunu bulunamadı');
    return { rows, featureColumns: [], errors };
  }

  // Feature columns = all except name and type
  const featureColumns = headers.filter(
    (h) =>
      h.toLowerCase().trim() !== "competitor name" &&
      h.toLowerCase().trim() !== "local/global"
  );

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const name = row[nameCol]?.trim();
    if (!name) {
      errors.push(`Satır ${i + 2}: Borsa adı boş`);
      continue;
    }

    const typeValue = typeCol ? row[typeCol]?.trim().toUpperCase() : "";
    const marketType: "turkish" | "global" =
      typeValue === "TR" ? "turkish" : "global";

    const features: Record<string, string> = {};
    for (const col of featureColumns) {
      const value = row[col]?.trim().toUpperCase() || "";
      features[col.toLowerCase().trim()] = value;
    }

    rows.push({ exchangeName: name, marketType, features });
  }

  return { rows, featureColumns, errors };
}

export function mapFeatureStatus(value: string): {
  hasFeature: boolean;
  featureStatus: string;
} {
  const normalized = value.toUpperCase().trim();
  switch (normalized) {
    case "VAR":
      return { hasFeature: true, featureStatus: "available" };
    case "YOK":
      return { hasFeature: false, featureStatus: "not_available" };
    case "BETA":
      return { hasFeature: true, featureStatus: "beta" };
    default:
      return { hasFeature: false, featureStatus: "unknown" };
  }
}

export function getFeatureCategoryMapping(featureName: string): string {
  const normalized = featureName.toLowerCase().trim();
  return FEATURE_CATEGORY_MAP[normalized] || "Products";
}

export { slugify };
