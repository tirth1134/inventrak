import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // ── 1. Admin User ──────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@company.com";
  const adminPasswordHash =
    process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync("admin123", 10);

  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {
      password: adminPasswordHash,
    },
    create: {
      email: adminEmail,
      password: adminPasswordHash,
      name: "Admin",
    },
  });
  console.log("✅ Admin user created");

  // ── 2. Departments ─────────────────────────────────────────────────────────
  const departments = ["Developer", "Sales", "Production", "HR", "Management"];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✅ Departments created");

  // ── 3. Designations ────────────────────────────────────────────────────────
  const designations = [
    "Developer",
    "Senior Developer",
    "Team Lead",
    "Manager",
  ];
  for (const title of designations) {
    await prisma.designation.upsert({
      where: { title },
      update: {},
      create: { title },
    });
  }
  console.log("✅ Designations created");

  // ── 4. Processors ─────────────────────────────────────────────────────────
  const processors = [
    { name: "Intel i3 7th Gen", brand: "Intel", grade: "LOW" as const },
    { name: "Intel i5 8th Gen", brand: "Intel", grade: "MID" as const },
    { name: "Intel i7 10th Gen", brand: "Intel", grade: "HIGH" as const },
    { name: "Apple M1", brand: "Apple", grade: "HIGH" as const },
    { name: "Apple M2", brand: "Apple", grade: "HIGH" as const },
    { name: "AMD Ryzen 5", brand: "AMD", grade: "MID" as const },
  ];
  for (const proc of processors) {
    await prisma.processor.upsert({
      where: { name: proc.name },
      update: {},
      create: proc,
    });
  }
  console.log("✅ Processors created");

  // ── 5. Stock Location ──────────────────────────────────────────────────────
  await prisma.stockLocation.upsert({
    where: { name: "Storage Room" },
    update: {},
    create: {
      name: "Storage Room",
      description: "Main storage room for IT equipment",
    },
  });
  console.log("✅ Stock location created");

  // ── 6. Default Settings ────────────────────────────────────────────────────
  const defaultSettings: Record<string, string> = {
    alert_days_ahead: "30",
    alert_email_enabled: "true",
    low_stock_threshold: "2",
    company_name: "InvenTrack",
    company_logo_path: "",
    admin_name: "Admin",
    admin_email: adminEmail,
    smtp_host: process.env.SMTP_HOST || "",
    smtp_port: process.env.SMTP_PORT || "587",
    smtp_user: process.env.SMTP_USER || "",
    smtp_pass: process.env.SMTP_PASS || "",
    smtp_from: process.env.SMTP_FROM || "",
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log("✅ Default settings created");

  console.log("🎉 Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
