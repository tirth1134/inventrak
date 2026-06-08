import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const assets = await req.json();
    if (!Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json({ error: "Invalid data payload" }, { status: 400 });
    }

    // We need to generate unique assetIds (e.g. AST-001) for each imported item.
    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      
      // Get the highest existing AST number to continue from
      const lastAsset = await tx.asset.findFirst({
        orderBy: { assetId: 'desc' },
        where: { assetId: { startsWith: 'AST-' } }
      });
      
      let nextIdNumber = 1;
      if (lastAsset) {
        const match = lastAsset.assetId.match(/AST-(\d+)/);
        if (match) nextIdNumber = parseInt(match[1], 10) + 1;
      }

      for (const item of assets) {
        const assetId = `AST-${String(nextIdNumber++).padStart(3, "0")}`;
        
        let purchaseDate = null;
        if (item.purchaseDate) {
          const date = new Date(item.purchaseDate);
          if (!isNaN(date.getTime())) purchaseDate = date;
        }

        await tx.asset.create({
          data: {
            assetId,
            type: item.type || "OTHER",
            brand: item.brand,
            model: item.model,
            serialNumber: item.serialNumber,
            ramGb: typeof item.ramGb === "number" ? item.ramGb : null,
            purchaseDate,
            purchasePrice: item.purchasePrice,
            status: item.status || "IN_STOCK",
            remarks: item.remarks,
            currency: "INR",
          }
        });
        createdCount++;
      }
      
      return createdCount;
    });

    return NextResponse.json({ data: { count: result } });
  } catch (error: any) {
    console.error("Bulk Import Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to bulk import data" },
      { status: 500 }
    );
  }
}
