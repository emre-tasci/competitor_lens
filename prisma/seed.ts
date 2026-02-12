import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXCHANGES = [
  // Turkish
  { name: "BtcTurk", marketType: "turkish", websiteUrl: "https://www.btcturk.com" },
  { name: "Paribu", marketType: "turkish", websiteUrl: "https://www.paribu.com" },
  { name: "Bitci", marketType: "turkish", websiteUrl: "https://www.bitci.com" },
  { name: "İcrypex", marketType: "turkish", websiteUrl: "https://www.icrypex.com" },
  { name: "Bitay", marketType: "turkish", websiteUrl: "https://www.bitay.com" },
  { name: "Felans", marketType: "turkish", websiteUrl: "https://www.felans.com" },
  // Global
  { name: "Binance", marketType: "global", websiteUrl: "https://www.binance.com" },
  { name: "Bybit", marketType: "global", websiteUrl: "https://www.bybit.com" },
  { name: "OKX", marketType: "global", websiteUrl: "https://www.okx.com" },
  { name: "Coinbase", marketType: "global", websiteUrl: "https://www.coinbase.com" },
  { name: "Kraken", marketType: "global", websiteUrl: "https://www.kraken.com" },
  { name: "KuCoin", marketType: "global", websiteUrl: "https://www.kucoin.com" },
  { name: "Gate.io", marketType: "global", websiteUrl: "https://www.gate.io" },
  { name: "Bitget", marketType: "global", websiteUrl: "https://www.bitget.com" },
  { name: "MEXC", marketType: "global", websiteUrl: "https://www.mexc.com" },
  { name: "Crypto.com", marketType: "global", websiteUrl: "https://crypto.com" },
];

const CATEGORIES: { name: string; icon: string; sortOrder: number }[] = [
  { name: "Platform", icon: "monitor", sortOrder: 1 },
  { name: "Authentication", icon: "key", sortOrder: 2 },
  { name: "Trading", icon: "candlestick-chart", sortOrder: 3 },
  { name: "Earn", icon: "piggy-bank", sortOrder: 4 },
  { name: "Ecosystem", icon: "globe", sortOrder: 5 },
  { name: "Growth", icon: "trending-up", sortOrder: 6 },
  { name: "Products", icon: "package", sortOrder: 7 },
];

const FEATURE_CATEGORY_MAP: Record<string, string> = {
  // Platform
  "web app": "Platform",
  "mobile app": "Platform",
  "corporate registration": "Platform",
  "public api": "Platform",
  "api management": "Platform",
  // Authentication
  "sign up with bank": "Authentication",
  "sign in with bank": "Authentication",
  "sign in with passkey": "Authentication",
  "sign in with gmail": "Authentication",
  "sign in with apple": "Authentication",
  "sign in with telegram": "Authentication",
  "login with qr": "Authentication",
  // Trading
  "copy trading": "Trading",
  "tradebots for users": "Trading",
  "convert": "Trading",
  "convert small amounts": "Trading",
  "price alarm": "Trading",
  "ai sentimentals": "Trading",
  // Earn
  "locked staking": "Earn",
  "flexible staking": "Earn",
  "dual investment": "Earn",
  "on chain earn": "Earn",
  "try nemalandirma": "Earn",
  "auto-invest (dca)": "Earn",
  "loan borrowing": "Earn",
  // Ecosystem
  "own stablecoin": "Ecosystem",
  "own chain": "Ecosystem",
  "own card": "Ecosystem",
  "crypto as a service": "Ecosystem",
  "stocks and commodity": "Ecosystem",
  "global customers": "Ecosystem",
  // Growth
  "referral": "Growth",
  "affiliate (kol program)": "Growth",
  "academy for logged in users": "Growth",
  "gamification": "Growth",
  "social feed": "Growth",
  // Products
  "nft/marketplace": "Products",
  "fan token": "Products",
  "launchpool/pad": "Products",
  "pay (payments)": "Products",
  "on ramp off ramp (3rd party)": "Products",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("Seeding database...");

  // Create exchanges
  for (const exchange of EXCHANGES) {
    await prisma.exchange.upsert({
      where: { id: exchange.name }, // Will fail on first run, create instead
      update: {},
      create: exchange,
    });
  }
  // Use createMany with skipDuplicates approach instead
  const existingExchanges = await prisma.exchange.findMany();
  const existingNames = new Set(existingExchanges.map((e) => e.name));

  for (const exchange of EXCHANGES) {
    if (!existingNames.has(exchange.name)) {
      await prisma.exchange.create({ data: exchange });
      console.log(`  Created exchange: ${exchange.name}`);
    } else {
      console.log(`  Exchange exists: ${exchange.name}`);
    }
  }

  // Create categories
  const categoryMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const existing = await prisma.featureCategory.findFirst({
      where: { name: cat.name },
    });
    if (existing) {
      categoryMap[cat.name] = existing.id;
      console.log(`  Category exists: ${cat.name}`);
    } else {
      const created = await prisma.featureCategory.create({ data: cat });
      categoryMap[cat.name] = created.id;
      console.log(`  Created category: ${cat.name}`);
    }
  }

  // Create features
  let sortOrder = 0;
  for (const [featureName, categoryName] of Object.entries(FEATURE_CATEGORY_MAP)) {
    sortOrder++;
    const slug = slugify(featureName);
    const categoryId = categoryMap[categoryName];
    if (!categoryId) {
      console.error(`  Category not found for feature: ${featureName} -> ${categoryName}`);
      continue;
    }

    const existing = await prisma.feature.findUnique({ where: { slug } });
    if (existing) {
      console.log(`  Feature exists: ${featureName}`);
    } else {
      await prisma.feature.create({
        data: {
          name: featureName,
          slug,
          categoryId,
          sortOrder,
        },
      });
      console.log(`  Created feature: ${featureName} (${categoryName})`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
