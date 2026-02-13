import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// feature_matrix.json key -> DB feature name + category mapping
const FEATURE_MAP: Record<string, { name: string; category: string }> = {
  "Web App": { name: "Web App", category: "Platform" },
  "Mobile App": { name: "Mobile App", category: "Platform" },
  "Desktop App": { name: "Desktop App", category: "Platform" },
  "Corporate Registration": { name: "Corporate Registration", category: "Platform" },
  "Public API": { name: "Public API", category: "Platform" },
  "API Management": { name: "API Management", category: "Platform" },
  "Stocks & Commodity and Forex Trading": { name: "Stocks & Commodity and Forex Trading", category: "Ecosystem" },
  "Global Customers": { name: "Global Customers", category: "Ecosystem" },
  "Crypto as a Services": { name: "Crypto as a Services", category: "Ecosystem" },
  "Own Stablecoin": { name: "Own Stablecoin", category: "Ecosystem" },
  "Own Chain": { name: "Own Chain", category: "Ecosystem" },
  "Own Card": { name: "Own Card", category: "Ecosystem" },
  "Sign up with Bank": { name: "Sign up with Bank", category: "Authentication" },
  "Sign in with Bank": { name: "Sign in with Bank", category: "Authentication" },
  "Sign in with Passkey": { name: "Sign in with Passkey", category: "Authentication" },
  "Sign in with Gmail": { name: "Sign in with Gmail", category: "Authentication" },
  "Sign in with Apple": { name: "Sign in with Apple", category: "Authentication" },
  "Sign in with Telegram": { name: "Sign in with Telegram", category: "Authentication" },
  "Sign in with Wallet": { name: "Sign in with Wallet", category: "Authentication" },
  "Login with QR": { name: "Login with QR", category: "Authentication" },
  "AI Sentimentals": { name: "AI Sentimentals", category: "Trading" },
  "Copy Trading": { name: "Copy Trading", category: "Trading" },
  "Trade Bots for Users": { name: "Trade Bots for Users", category: "Trading" },
  "Auto-Invest (DCA)": { name: "Auto-Invest (DCA)", category: "Earn" },
  "Convert": { name: "Convert", category: "Trading" },
  "Convert Small Assets": { name: "Convert Small Assets", category: "Trading" },
  "Price Alarm": { name: "Price Alarm", category: "Trading" },
  "Locked Staking": { name: "Locked Staking", category: "Earn" },
  "Flexible Staking": { name: "Flexible Staking", category: "Earn" },
  "Loan Borrowing": { name: "Loan Borrowing", category: "Earn" },
  "Dual Investment": { name: "Dual Investment", category: "Earn" },
  "On-chain Earn": { name: "On-chain Earn", category: "Earn" },
  "VIP Loan": { name: "VIP Loan", category: "Earn" },
  "TRY Nemalandırma": { name: "TRY Nemalandırma", category: "Earn" },
  "Referral": { name: "Referral", category: "Growth" },
  "Affiliate (KOL Program)": { name: "Affiliate (KOL Program)", category: "Growth" },
  "Academy for Logged-in User": { name: "Academy for Logged-in User", category: "Growth" },
  "Gamification": { name: "Gamification", category: "Growth" },
  "Social Feed (Square)": { name: "Social Feed (Square)", category: "Growth" },
  "On-Ramp / Off-Ramp (3rd Party)": { name: "On-Ramp / Off-Ramp (3rd Party)", category: "Products" },
  "NFT / Marketplace": { name: "NFT / Marketplace", category: "Products" },
  "Fan Token": { name: "Fan Token", category: "Products" },
  "Launchpool / Launchpad": { name: "Launchpool / Launchpad", category: "Products" },
  "Pay (Payments)": { name: "Pay (Payments)", category: "Products" },
};

const SKIP_KEYS = new Set([
  "Competitor Name",
  "Local/Global",
  "Coverage Score (%)",
]);

const CATEGORIES = [
  { name: "Platform", icon: "monitor", sortOrder: 1 },
  { name: "Authentication", icon: "key", sortOrder: 2 },
  { name: "Trading", icon: "candlestick-chart", sortOrder: 3 },
  { name: "Earn", icon: "piggy-bank", sortOrder: 4 },
  { name: "Ecosystem", icon: "globe", sortOrder: 5 },
  { name: "Growth", icon: "trending-up", sortOrder: 6 },
  { name: "Products", icon: "package", sortOrder: 7 },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const jsonPath = path.resolve(__dirname, "../../feature_matrix.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const competitors: Record<string, string>[] = JSON.parse(raw);

  console.log(`Found ${competitors.length} competitors in feature_matrix.json\n`);

  // 1. Upsert categories
  console.log("--- Categories ---");
  const categoryMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const existing = await prisma.featureCategory.findFirst({
      where: { name: cat.name },
    });
    if (existing) {
      categoryMap[cat.name] = existing.id;
      console.log(`  [exists] ${cat.name}`);
    } else {
      const created = await prisma.featureCategory.create({ data: cat });
      categoryMap[cat.name] = created.id;
      console.log(`  [created] ${cat.name}`);
    }
  }

  // 2. Upsert features
  console.log("\n--- Features ---");
  const featureMap: Record<string, string> = {}; // JSON key -> feature DB id
  let sortOrder = 0;
  for (const [jsonKey, mapping] of Object.entries(FEATURE_MAP)) {
    sortOrder++;
    const slug = slugify(mapping.name);
    const categoryId = categoryMap[mapping.category];
    if (!categoryId) {
      console.error(`  [error] No category for: ${jsonKey} -> ${mapping.category}`);
      continue;
    }

    let feature = await prisma.feature.findUnique({ where: { slug } });
    if (!feature) {
      feature = await prisma.feature.create({
        data: {
          name: mapping.name,
          slug,
          categoryId,
          sortOrder,
        },
      });
      console.log(`  [created] ${mapping.name} (${mapping.category})`);
    } else {
      console.log(`  [exists] ${mapping.name}`);
    }
    featureMap[jsonKey] = feature.id;
  }

  // 3. Upsert exchanges & exchange features
  console.log("\n--- Exchanges & Features ---");
  let totalCreated = 0;
  let totalUpdated = 0;

  for (const competitor of competitors) {
    const name = competitor["Competitor Name"];
    const marketType = competitor["Local/Global"] === "TR" ? "turkish" : "global";

    // Find or create exchange
    let exchange = await prisma.exchange.findFirst({ where: { name } });
    if (!exchange) {
      exchange = await prisma.exchange.create({
        data: { name, marketType },
      });
      console.log(`  [exchange created] ${name} (${marketType})`);
    } else {
      console.log(`  [exchange exists] ${name}`);
    }

    // Process each feature for this exchange
    for (const [jsonKey, value] of Object.entries(competitor)) {
      if (SKIP_KEYS.has(jsonKey)) continue;

      const featureId = featureMap[jsonKey];
      if (!featureId) {
        console.warn(`    [skip] Unknown feature key: "${jsonKey}"`);
        continue;
      }

      const hasFeature = value === "Var";
      const featureStatus = hasFeature ? "available" : "not_available";

      const existing = await prisma.exchangeFeature.findUnique({
        where: {
          exchangeId_featureId: {
            exchangeId: exchange.id,
            featureId,
          },
        },
      });

      if (existing) {
        if (existing.featureStatus !== featureStatus) {
          await prisma.exchangeFeature.update({
            where: { id: existing.id },
            data: { hasFeature, featureStatus },
          });
          totalUpdated++;
        }
      } else {
        await prisma.exchangeFeature.create({
          data: {
            exchangeId: exchange.id,
            featureId,
            hasFeature,
            featureStatus,
          },
        });
        totalCreated++;
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Exchange-Feature records created: ${totalCreated}`);
  console.log(`  Exchange-Feature records updated: ${totalUpdated}`);
  console.log("Import complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
