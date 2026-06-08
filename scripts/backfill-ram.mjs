/**
 * One-off script: update ramGb on all existing assets that are missing it.
 * Reads the Excel file and matches assets by serial number (Mother S/N column).
 * Usage: node scripts/backfill-ram.mjs path/to/your-file.xlsx
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

function extractRamGb(rawValue) {
  if (rawValue == null) return null;
  const str = String(rawValue).trim();
  // extract the first number found (e.g. "8 GB DDR4" → 8, "16GB" → 16, "16" → 16)
  const match = str.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function extractSerial(rawValue) {
  if (rawValue == null) return null;
  return String(rawValue).trim() || null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node scripts/backfill-ram.mjs path/to/file.xlsx");
    process.exit(1);
  }

  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`📄 Read ${rows.length} rows from Excel.\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of rows) {
    // Try common column name variants for serial number and RAM
    const serial =
      extractSerial(row["Mother S/N"]) ||
      extractSerial(row["Serial Number"]) ||
      extractSerial(row["Serial No"]) ||
      extractSerial(row["S/N"]);

    const rawRam =
      row["RAM"] ??
      row["Ram"] ??
      row["ram"] ??
      row["Memory"] ??
      null;

    const ramGb = extractRamGb(rawRam);

    if (!serial) {
      skipped++;
      continue;
    }

    if (!ramGb) {
      skipped++;
      continue;
    }

    const asset = await prisma.asset.findFirst({
      where: { serialNumber: serial },
      select: { id: true, assetId: true, serialNumber: true, ramGb: true },
    });

    if (!asset) {
      console.log(`  ⚠ Not found: serial="${serial}"`);
      notFound++;
      continue;
    }

    if (asset.ramGb === ramGb) {
      console.log(`  ✓ ${asset.assetId} already has ${ramGb} GB RAM`);
      skipped++;
      continue;
    }

    await prisma.asset.update({
      where: { id: asset.id },
      data: { ramGb },
    });

    console.log(`  ✅ ${asset.assetId} (serial: ${serial}) → RAM set to ${ramGb} GB`);
    updated++;
  }

  console.log(`\n🎉 Done! Updated: ${updated}, Skipped: ${skipped}, Not found: ${notFound}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
