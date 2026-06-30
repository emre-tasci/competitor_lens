import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const total = await prisma.screenshot.count();
  const classified = await prisma.screenshot.count({ where: { NOT: { classifiedAt: null } } });
  const withFeature = await prisma.screenshot.count({ where: { NOT: { featureId: null } } });
  const features = await prisma.feature.count();
  const cats = await prisma.featureCategory.count();
  console.log(JSON.stringify({ total, classified, withFeature, features, cats }, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
