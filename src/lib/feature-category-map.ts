export const FEATURE_CATEGORY_MAP: Record<string, string> = {
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

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getCategoryForFeature(featureName: string): string | undefined {
  const normalized = featureName.toLowerCase().trim();
  return FEATURE_CATEGORY_MAP[normalized];
}
