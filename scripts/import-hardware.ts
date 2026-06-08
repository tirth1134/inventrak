/**
 * Clean import: Employees + their assigned systems
 * Green rows (FF81D41A) = Laptops | Others = Desktop/Mac type
 * Run: npx tsx scripts/import-hardware.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Parsed from Excel: name, designation, system details, isLaptop (green bg)
const records = [
  // ── Desktops / iMac / Mac Mini (no green background) ──────────────────
  { name: "Tirth Vora",           designation: "Jr. System Admin",           system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "Default String" },
  { name: "Bimal Shah",           designation: "Sr. System Administrator",   system: "Windows Desktop",        brand: "Generic",  isLaptop: false, serialNo: "Default String" },
  { name: "Nishit Rajani",        designation: "Jr. Cloud Engineer",          system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "Default String" },
  { name: "Jalpa Solanki",        designation: "Lead Designer",               system: "iMac M1 2021",           brand: "Apple",    isLaptop: false, serialNo: "C02HR018Q6X3" },
  { name: "Het Suthar",           designation: "Jr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "MXL92958FF" },
  { name: "Sagar Solanki",        designation: "Jr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Dell",     isLaptop: false, serialNo: "F5FG703/CNPE100996080N" },
  { name: "Dhanrajsinh Mahida",   designation: "Jr. Software Developer",      system: "Mac Mini M1 2020",       brand: "Apple",    isLaptop: false, serialNo: "C07JR1CUQ6P0" },
  { name: "Pramit Kumar",         designation: "Software Engineer",           system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "Default String" },
  { name: "Vatsal Babariya",      designation: "Jr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "Default String" },
  { name: "Urmil Parsaniya",      designation: "Jr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "MXL029374J" },
  { name: "Smith Pateliya",       designation: "Jr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "Default String" },
  { name: "Bhavya Radadiya",      designation: "Trainee Software Engineer",   system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "4BFG703" },
  { name: "Saumya Jain",          designation: "Trainee Software Engineer",   system: "Ubuntu Desktop",         brand: "Dell",     isLaptop: false, serialNo: "1XJ5R13" },
  { name: "Devangi Kachhadiya",   designation: "Trainee Developer - AI/ML",   system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "75FG703" },
  { name: "Sparsh Sharma",        designation: "Jr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "G9FG703" },
  { name: "Sachin Gupta",         designation: "Trainee Software Engineer",   system: "Ubuntu Desktop",         brand: "HP",       isLaptop: false, serialNo: "JPH9172YPY" },
  { name: "Jainil Salot",         designation: "Trainee Software Engineer",   system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "Default String" },
  { name: "Shreyash Pujara",      designation: "Trainee Cloud Engineer",      system: "Ubuntu Desktop",         brand: "Lenovo",   isLaptop: false, serialNo: "59FG703" },
  { name: "Maitri Pancholi",      designation: "Sr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "7JFG703" },
  { name: "Ayushi Nagaria",       designation: "Trainee Firmware Developer",  system: "Windows Desktop",        brand: "Lenovo",   isLaptop: false, serialNo: "3305102663355" },
  { name: "Deep Kanani",          designation: "Jr. Software Engineer",       system: "Mac Mini",               brand: "Apple",    isLaptop: false, serialNo: null },
  { name: "Hard Patel",           designation: "Jr. Software Engineer",       system: "Mac Mini",               brand: "Apple",    isLaptop: false, serialNo: null },
  { name: "Darshan J Patel",      designation: "Sr. UI/UX Designer",          system: "Mac Mini",               brand: "Apple",    isLaptop: false, serialNo: null },
  { name: "Raj Zadafiya",         designation: "Jr. Software Engineer",       system: "Mac Mini",               brand: "Apple",    isLaptop: false, serialNo: null },
  { name: "Darshan Raval",        designation: "Jr. QA Executive",            system: "Windows Desktop",        brand: "Generic",  isLaptop: false, serialNo: null },
  { name: "Sachin Nariya",        designation: "Software Developer",          system: "iMac",                   brand: "Apple",    isLaptop: false, serialNo: null },
  { name: "Gautam Langa",         designation: "Trainee Software Engineer",   system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: null },
  { name: "Bhavesh Makwana",      designation: "Jr. Software Engineer",       system: "Ubuntu Desktop",         brand: "Generic",  isLaptop: false, serialNo: "4BFG703 / 1THH9X2" },

  // ── Laptops (green background = FF81D41A) ─────────────────────────────
  { name: "Ankur Vachhani",       designation: "Software Engineer",           system: "MacBook Air",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Yesha Goyal",          designation: "Business Development Manager",system: "Windows HP Laptop",      brand: "HP",       isLaptop: true,  serialNo: null },
  { name: "Manishdan Langa",      designation: "CTO",                         system: "MacBook Pro",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Vatsal Raval",         designation: "Sr. Software Engineer",       system: "MacBook Pro",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Anal Rayait",          designation: "Digital Marketing Manager",   system: "MacBook Air",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Manali Doshi",         designation: "Project Manager",             system: "MacBook Air M1",         brand: "Apple",    isLaptop: true,  serialNo: "FVHJL0UT1WFV" },
  { name: "Smit Trivedi",         designation: "Sr. Software Engineer",       system: "Ubuntu Dell Laptop",     brand: "Dell",     isLaptop: true,  serialNo: "H0XVN93" },
  { name: "Ritesh Khatri",        designation: "Sr. Software Engineer",       system: "Ubuntu Dell Laptop",     brand: "Dell",     isLaptop: true,  serialNo: null },
  // MacBook Air section
  { name: "Nirvee Shah",          designation: "Sr. Accountant",              system: "Windows HP Laptop",      brand: "HP",       isLaptop: true,  serialNo: "2678194A" },
  { name: "Dhruvi Patel",         designation: "HR",                          system: "Windows Dell Laptop",    brand: "Dell",     isLaptop: true,  serialNo: null },
  { name: "Kirtan Prajapati",     designation: "Sr. Software Engineer",       system: "Ubuntu Dell Laptop",     brand: "Dell",     isLaptop: true,  serialNo: null },
  { name: "Shimoli Shah",         designation: "Technical Head",              system: "MacBook Air",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Vivek Munjapara",      designation: "Digital Marketing Executive", system: "MacBook Air",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Sachin Nariya",        designation: "Sr. Software Engineer",       system: "MacBook Air",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Harshita Jain",        designation: "Project Manager",             system: "MacBook Pro",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Jaimin Patel",         designation: "Sr. Analyst Programmer",      system: "MacBook Pro",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Harsh Bhatt",          designation: "Jr. Software Engineer",       system: "Ubuntu Dell Laptop",     brand: "Dell",     isLaptop: true,  serialNo: null },
  { name: "Manish Kumar",         designation: "Jr. Software Engineer",       system: "Ubuntu Lenovo Laptop",   brand: "Lenovo",   isLaptop: true,  serialNo: null },
  { name: "Nalin Ratanpara",      designation: "Technical Head",              system: "Ubuntu Lenovo Laptop",   brand: "Lenovo",   isLaptop: true,  serialNo: "C02GT2YKQ6LZ" },
  { name: "Meet Shah",            designation: "Team Lead",                   system: "Ubuntu Dell Laptop",     brand: "Dell",     isLaptop: true,  serialNo: null },
  { name: "Jaimin Joshi",         designation: "Sr. QA",                      system: "Windows Dell Laptop",    brand: "Dell",     isLaptop: true,  serialNo: null },
  { name: "Jitesh Jani",          designation: "Engineering Manager",         system: "Ubuntu Lenovo Laptop",   brand: "Lenovo",   isLaptop: true,  serialNo: null },
  { name: "Dhrumi Shah",          designation: "Digital Marketing Executive", system: "MacBook Air",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Aashlesha Umbarkar",   designation: "Marketing",                   system: "MacBook Air",            brand: "Apple",    isLaptop: true,  serialNo: null },
  { name: "Hiten Gangajaliya",    designation: "Sr. Software Engineer",       system: "Ubuntu Asus Laptop",     brand: "Asus",     isLaptop: true,  serialNo: "N2NXCV12C226088" },
  // Meeting / special
  { name: "Dhanrajsinh Mahida",   designation: "Jr. Software Engineer",       system: "MacBook Pro",            brand: "Apple",    isLaptop: true,  serialNo: null },
];

async function main() {
  console.log("🚀 Starting import...\n");

  // ── 1. Unique designations ───────────────────────────────────────────────
  const uniqueDesigs = [...new Set(records.map(r => r.designation))];
  console.log(`📋 Creating ${uniqueDesigs.length} designations...`);
  const desigMap: Record<string, string> = {};
  for (const title of uniqueDesigs) {
    const ex = await prisma.designation.findFirst({ where: { title } });
    if (ex) { desigMap[title] = ex.id; continue; }
    const cr = await prisma.designation.create({ data: { title } });
    desigMap[title] = cr.id;
    console.log(`   ✅ ${title}`);
  }

  // ── 2. Default department ────────────────────────────────────────────────
  let dept = await prisma.department.findFirst({ where: { name: "General" } });
  if (!dept) dept = await prisma.department.create({ data: { name: "General" } });

  // ── 3. Create employees (deduplicate by name) ────────────────────────────
  console.log(`\n👤 Creating employees...`);
  const empMap: Record<string, string> = {}; // name → db id
  const seenNames = new Set<string>();

  for (const r of records) {
    if (seenNames.has(r.name)) continue;
    seenNames.add(r.name);

    const ex = await prisma.employee.findFirst({ where: { name: r.name } });
    if (ex) { empMap[r.name] = ex.id; console.log(`   ↳ Exists: ${r.name}`); continue; }

    const emailSlug = r.name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
    const emp = await prisma.employee.create({
      data: {
        name: r.name,
        email: `${emailSlug}@company.local`,
        departmentId: dept.id,
        designationId: desigMap[r.designation],
        status: "ACTIVE",
        isTeamLead: false,
      },
    });
    empMap[r.name] = emp.id;
    console.log(`   ✅ ${r.name} — ${r.designation}`);
  }

  // ── 4. Next AST-xxx number ───────────────────────────────────────────────
  const lastAsset = await prisma.asset.findFirst({
    orderBy: { assetId: "desc" },
    where: { assetId: { startsWith: "AST-" } },
  });
  let nextId = 1;
  if (lastAsset) {
    const m = lastAsset.assetId.match(/AST-(\d+)/);
    if (m) nextId = parseInt(m[1]) + 1;
  }

  // ── 5. Create assets + assign ────────────────────────────────────────────
  console.log(`\n🖥️  Creating assets & assignments...`);
  let assetCount = 0;

  for (const r of records) {
    const assetId = `AST-${String(nextId++).padStart(3, "0")}`;
    const type = r.isLaptop ? "LAPTOP"
      : r.system.toLowerCase().includes("imac") ? "DESKTOP"
      : r.system.toLowerCase().includes("mac mini") ? "DESKTOP"
      : "DESKTOP";

    const asset = await prisma.asset.create({
      data: {
        assetId,
        type: type as any,
        brand: r.brand,
        model: r.system,
        serialNumber: r.serialNo && r.serialNo !== "Default String" && r.serialNo !== "-" ? r.serialNo : null,
        status: "IN_USE",
        currency: "INR",
        remarks: r.isLaptop ? "Laptop (green row in inventory sheet)" : null,
      },
    });
    assetCount++;

    // Assign to employee
    const empId = empMap[r.name];
    if (empId) {
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          employeeId: empId,
          isCurrent: true,
          notes: "Imported from 908-Hardware_Inventory.xlsx",
        },
      });
    }

    const tag = r.isLaptop ? "💻" : "🖥️ ";
    console.log(`   ${tag} ${assetId} | ${r.brand} ${r.system} → ${r.name}`);
  }

  console.log(`\n🎉 Done!`);
  console.log(`   Designations : ${uniqueDesigs.length}`);
  console.log(`   Employees    : ${Object.keys(empMap).length}`);
  console.log(`   Assets       : ${assetCount}`);
}

main()
  .catch(e => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
