import prisma from "@/lib/prisma";

/**
 * Generate a unique asset ID in the format: HW-{YEAR}-{3-digit-sequence}
 * Sequence resets per year.
 * e.g. HW-2024-001, HW-2024-002
 */
export async function generateAssetId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `HW-${year}-`;

  // Find the latest asset with the current year prefix
  const latestAsset = await prisma.asset.findFirst({
    where: {
      assetId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      assetId: "desc",
    },
    select: {
      assetId: true,
    },
  });

  let nextSequence = 1;

  if (latestAsset) {
    const parts = latestAsset.assetId.split("-");
    const lastSequence = parseInt(parts[2], 10);
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}
