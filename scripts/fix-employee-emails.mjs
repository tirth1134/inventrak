/**
 * One-off migration: update all employee emails to
 * {firstname}{lastnameinitial}@intuz.net
 * e.g. "Tirth Vyas" → "tirthv@intuz.net"
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

function generateEmail(name) {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0].toLowerCase();
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toLowerCase() : "";
  return `${firstName}${lastInitial}@intuz.net`;
}

async function main() {
  const employees = await prisma.employee.findMany({ select: { id: true, name: true, email: true } });
  console.log(`Found ${employees.length} employees. Updating emails...\n`);

  // Build a map to detect collisions and append a counter if needed
  const emailCount = {};

  for (const emp of employees) {
    let base = generateEmail(emp.name);
    emailCount[base] = (emailCount[base] || 0) + 1;
  }

  const usedEmails = {};

  for (const emp of employees) {
    let base = generateEmail(emp.name);
    let newEmail = base;

    // If there's a collision, append a counter to make it unique
    if (emailCount[base] > 1) {
      usedEmails[base] = (usedEmails[base] || 0) + 1;
      if (usedEmails[base] > 1) {
        newEmail = base.replace("@intuz.net", `${usedEmails[base]}@intuz.net`);
      }
    }

    if (newEmail === emp.email) {
      console.log(`  ✓ ${emp.name} — already correct (${newEmail})`);
      continue;
    }

    // Check if the new email is already taken by a different employee
    const conflict = await prisma.employee.findUnique({ where: { email: newEmail } });
    if (conflict && conflict.id !== emp.id) {
      console.warn(`  ⚠ SKIP ${emp.name}: "${newEmail}" already used by another employee`);
      continue;
    }

    await prisma.employee.update({ where: { id: emp.id }, data: { email: newEmail } });
    console.log(`  ✅ ${emp.name}: ${emp.email} → ${newEmail}`);
  }

  console.log("\n🎉 Done!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
