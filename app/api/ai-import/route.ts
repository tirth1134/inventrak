import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// ── Prompts ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are InvenTrack's intelligent hardware asset data extraction engine. Your ONLY job is to analyse raw spreadsheet data (provided as a JSON array of row objects) and convert every row into a structured hardware asset record for an IT inventory management system.

STRICT OUTPUT RULES:
1. Return ONLY a single valid JSON object with an "assets" array. Zero explanation, zero markdown, zero code fences.
2. Map EVERY non-empty data row to one asset record. Never skip rows that have any useful data.
3. For MISSING / unknown data, use null — never use empty strings, "N/A", "Unknown", or placeholder text.

━━━ FIELD MAPPING GUIDE ━━━

▸ type  (required)
  Map to exactly one of: DESKTOP | LAPTOP | MONITOR | SERVER | PERIPHERAL | OTHER
  • DESKTOP  → desktop, PC, tower, workstation, all-in-one, AIO
  • LAPTOP   → laptop, notebook, MacBook, ThinkPad, ultrabook, netbook
  • MONITOR  → monitor, display, screen, LCD, LED, curved display
  • SERVER   → server, rack, NAS, blade, UPS, network switch, router, firewall
  • PERIPHERAL → keyboard, mouse, printer, scanner, headset, webcam, dock, hub, USB, speaker, projector, tablet, iPad, phone
  • OTHER    → anything not matching above

▸ brand  (optional)
  Manufacturer name only, properly capitalised (e.g. "Dell", "Apple", "HP", "Lenovo", "Samsung", "Asus", "Acer").
  Strip model info — brand is the company, not the product line.

▸ model  (optional)
  Full product model/name (e.g. "XPS 15 9530", "MacBook Pro 14-inch M3", "ThinkPad X1 Carbon Gen 11").
  Include generation / year suffix if present.

▸ serialNumber  (optional)
  Any serial number, service tag, asset tag, or unique hardware identifier. Columns like "Mother S/N" map to this. Preserve exact casing and format.

▸ ramGb (optional)
  Extract the numeric RAM capacity in Gigabytes (GB). Ignore memory types like "ddr4" or "ddr3". Return as a plain JSON number (e.g. 16).

▸ purchaseDate  (optional)
  Convert ANY date format to ISO 8601: YYYY-MM-DD.
  • If only year given → YYYY-01-01
  • Ambiguous DD/MM/YY vs MM/DD/YY → prefer DD/MM/YYYY (Indian standard)
  • If completely unparseable → null

▸ purchasePrice  (optional)
  Numeric value ONLY. Strip all currency symbols (₹, $, £, €), commas, thousands separators, and text like "INR", "USD".
  Return as a plain JSON number (e.g. 85000, not "85,000" or "₹85000").
  If a price range is given, use the lower bound.

▸ status  (required — default to IN_STOCK if genuinely unclear)
  Map to exactly one of: IN_USE | IN_STOCK | IN_REPAIR | SCRAPPED
  • IN_USE    → "assigned", "in use", "deployed", "active", has an employee/user name in any column
  • IN_STOCK  → "available", "stock", "storage", "warehouse", "unassigned", "spare", "new", "idle"
  • IN_REPAIR → "repair", "maintenance", "service", "AMC", "broken", "faulty", "RMA"
  • SCRAPPED  → "scrap", "disposed", "retired", "EOL", "dead", "written off", "condemned"

▸ remarks  (optional)
  Combine any additional context into one concise sentence: location, assigned person name, department, warranty notes, condition notes, etc.
  Example: "Assigned to Rahul Sharma (Finance Dept). Warranty expires Jan 2026."

━━━ EXACT OUTPUT FORMAT ━━━
{
  "assets": [
    {
      "type": "LAPTOP",
      "brand": "Dell",
      "model": "XPS 15 9530",
      "serialNumber": "SVC-TAG-ABCD123",
      "ramGb": 16,
      "purchaseDate": "2023-06-01",
      "purchasePrice": 125000,
      "status": "IN_USE",
      "remarks": "Assigned to Priya Mehta, Engineering team. Carry bag included."
    }
  ]
}`;

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const schemaType = formData.get("schemaType") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (schemaType !== "HARDWARE") {
      return NextResponse.json({ error: "Unsupported schema type" }, { status: 400 });
    }

    // Retrieve the OpenRouter API key stored in Settings
    const apiKeySetting = await prisma.setting.findUnique({
      where: { key: "openai_api_key" },
    });

    if (!apiKeySetting?.value) {
      return NextResponse.json(
        { error: "AI API Key is not configured. Please add your OpenRouter API key in Settings → AI Configuration." },
        { status: 400 }
      );
    }

    // ── Parse Excel / CSV on the server ─────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(firstSheet);

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: "No data found in the spreadsheet" }, { status: 400 });
    }

    // Limit payload to avoid hitting token limits (~300 rows is typically safe)
    const dataSlice = rawData.slice(0, 300);
    const userPrompt = `Here is the raw spreadsheet data as a JSON array. Extract all hardware assets from it:\n\n${JSON.stringify(dataSlice, null, 2)}`;

    // ── Call OpenRouter with automatic fallback ──────────────────────────────
    // Try primary model first; if rate-limited (429), automatically use backup.
    const MODELS = [
      "google/gemma-4-31b-it:free",          // Primary — fast Google model
      "nvidia/nemotron-3-super-120b-a12b:free", // Fallback — NVIDIA reasoning model
    ];

    const callOpenRouter = async (model: string) => {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKeySetting!.value}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://inventrak.app",
          "X-Title": "InvenTrack",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          top_p: 0.9,
          response_format: { type: "json_object" },
        }),
      });
      return res;
    };

    let orResponse: Response | null = null;
    let usedModel = MODELS[0];

    for (const model of MODELS) {
      const res = await callOpenRouter(model);
      if (res.status === 429) {
        console.warn(`[AI Import] ${model} is rate-limited, trying next model...`);
        continue; // try next model
      }
      orResponse = res;
      usedModel = model;
      break;
    }

    if (!orResponse) {
      throw new Error("All AI models are currently rate-limited. Please wait a minute and try again.");
    }

    console.log(`[AI Import] Using model: ${usedModel}`);

    if (!orResponse.ok) {
      const errBody = await orResponse.json().catch(() => ({}));
      const errMsg = (errBody as any)?.error?.message || `OpenRouter returned ${orResponse.status}`;
      throw new Error(`OpenRouter API error: ${errMsg}`);
    }

    const orJson = await orResponse.json() as {
      choices: { message: { content: string } }[];
    };

    const rawContent = orJson.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if model ignores the instruction
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: { assets: any[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("AI response was not valid JSON:", rawContent);
      throw new Error("The AI returned an unexpected format. Please try again.");
    }

    if (!Array.isArray(parsed?.assets)) {
      throw new Error("AI response did not contain an 'assets' array. Please try again.");
    }

    // Sanitise each record — ensure required fields have valid enum values
    const validTypes = ["DESKTOP", "LAPTOP", "MONITOR", "SERVER", "PERIPHERAL", "OTHER"];
    const validStatuses = ["IN_USE", "IN_STOCK", "IN_REPAIR", "SCRAPPED"];

    const sanitisedAssets = parsed.assets.map((a: any) => ({
      type: validTypes.includes(a.type) ? a.type : "OTHER",
      brand: a.brand || null,
      model: a.model || null,
      serialNumber: a.serialNumber || null,
      ramGb: typeof a.ramGb === "number" ? a.ramGb : null,
      purchaseDate: a.purchaseDate || null,
      purchasePrice: typeof a.purchasePrice === "number" ? a.purchasePrice : null,
      status: validStatuses.includes(a.status) ? a.status : "IN_STOCK",
      remarks: a.remarks || null,
    }));

    return NextResponse.json({ data: sanitisedAssets });
  } catch (error: any) {
    console.error("AI Import Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process data with AI" },
      { status: 500 }
    );
  }
}
