import * as XLSX from "xlsx";
import { writeFileSync } from "fs";

const wb = XLSX.readFile("/home/tirth.v/908-Hardware_Inventory.xlsx", {
  cellDates: true,
  dateNF: "YYYY-MM-DD",
});

const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false, dateNF: "YYYY-MM-DD" });

console.log("Sheet:", sheetName);
console.log("Total rows:", data.length);
console.log("Columns:", JSON.stringify(Object.keys((data[0] as any) || {})));
console.log("---");

// Write full data to file so we can read it without truncation
writeFileSync("/home/tirth.v/Tirth/inventrak/scripts/excel-data.json", JSON.stringify(data, null, 2));
console.log("Written to scripts/excel-data.json");
