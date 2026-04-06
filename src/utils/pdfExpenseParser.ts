import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface ParsedExpense {
  date: string;
  description: string;
  category: string;
  amount: number;
  payment_method: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["swiggy", "zomato", "food", "restaurant", "dining", "cafe", "dominos", "pizza", "burger", "mcdonalds", "kfc"],
  Transport: ["uber", "ola", "rapido", "auto", "cab", "taxi", "metro", "petrol", "fuel", "diesel", "parking"],
  Shopping: ["amazon", "flipkart", "shop", "myntra", "ajio", "mall", "retail", "store", "market"],
  Entertainment: ["netflix", "spotify", "prime", "hotstar", "movie", "cinema", "theatre", "gaming", "youtube"],
  "Bills & Utilities": ["electricity", "water", "bill", "broadband", "wifi", "internet", "gas", "recharge", "mobile", "telephone", "airtel", "jio", "vodafone"],
  Cash: ["atm", "cash withdrawal", "cash"],
};

function categorize(description: string): string {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "Other";
}

/** Parses DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY into YYYY-MM-DD */
function parseBankDate(raw: string): string | null {
  const trimmed = raw.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const slashDash = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashDash) {
    const dd = slashDash[1].padStart(2, "0");
    const mm = slashDash[2].padStart(2, "0");
    const yyyy = slashDash[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  // DD MMM YYYY (e.g. 05 Mar 2026)
  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const monthMatch = trimmed.match(/^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})$/i);
  if (monthMatch) {
    const dd = monthMatch[1].padStart(2, "0");
    const mm = monthNames[monthMatch[2].toLowerCase().slice(0, 3)];
    const yyyy = monthMatch[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    return isNaN(new Date(iso).getTime()) ? null : iso;
  }

  return null;
}

/** Parse amount string like "1,234.56" or "12345" into a number */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

/** Checks if a token signals a credit (not an expense) */
function isCreditIndicator(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return ["cr", "cr.", "credit"].includes(lower);
}

function isDebitIndicator(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return ["dr", "dr.", "debit"].includes(lower);
}

/**
 * Extracts text from a PDF using pdfjs-dist, then parses transactions.
 * Returns an array of parsed expenses (debits only).
 */
export async function parsePdfBankStatement(file: File): Promise<ParsedExpense[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item) => "str" in item && typeof (item as Record<string, unknown>).str === "string")
      .map((item) => (item as Record<string, unknown>).str as string);
    fullText += strings.join(" ") + "\n";
  }

  return parseTransactionsFromText(fullText);
}

function parseTransactionsFromText(text: string): ParsedExpense[] {
  const expenses: ParsedExpense[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Regex to find date-like patterns at start of segments
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4})/i,
  ];

  // Amount pattern: number with optional commas and decimal
  const amountPattern = /(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

  for (const line of lines) {
    // Try to find a date in the line
    let dateStr: string | null = null;
    let dateMatch: RegExpMatchArray | null = null;

    for (const pattern of datePatterns) {
      dateMatch = line.match(pattern);
      if (dateMatch) {
        dateStr = parseBankDate(dateMatch[1]);
        if (dateStr) break;
      }
    }

    if (!dateStr) continue;

    // Check for credit indicator — skip credit transactions
    const hasCredit = isCreditIndicator(line.split(/\s+/).pop() || "") ||
      /\bcr\.?\b/i.test(line) ||
      /\bcredit\b/i.test(line);

    const hasDebit = isDebitIndicator(line.split(/\s+/).pop() || "") ||
      /\bdr\.?\b/i.test(line) ||
      /\bdebit\b/i.test(line);

    // If line explicitly says Credit and NOT Debit, skip it
    if (hasCredit && !hasDebit) continue;

    // Find all amounts in the line
    const amounts: number[] = [];
    let m: RegExpExecArray | null;
    const amtRegex = new RegExp(amountPattern.source, "g");
    while ((m = amtRegex.exec(line)) !== null) {
      const parsed = parseAmount(m[1]);
      if (parsed !== null && parsed > 0.5) {
        amounts.push(parsed);
      }
    }

    if (amounts.length === 0) continue;

    // For lines with multiple amounts (Debit/Credit columns), pick intelligently
    // Many Indian statements have: Date | Description | Debit | Credit | Balance
    // We want the debit column (usually first non-zero of the two middle amounts)
    let amount: number;
    if (amounts.length >= 3) {
      // Typically: debit amount, credit amount (0 or missing), balance
      // If explicitly debit, use first significant amount
      amount = amounts[0];
    } else {
      // Use the largest amount that isn't likely a balance
      amount = amounts[0];
    }

    // Extract description: text between date and first amount
    const dateEnd = (dateMatch?.index ?? 0) + (dateMatch?.[0]?.length ?? 0);
    const firstAmountIdx = line.indexOf(String(Math.floor(amount)), dateEnd);
    let description = line
      .substring(dateEnd, firstAmountIdx > dateEnd ? firstAmountIdx : undefined)
      .replace(/\b(dr\.?|cr\.?|debit|credit)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!description || description.length < 2) {
      description = "Bank Transaction";
    }

    // Cap description length
    if (description.length > 100) {
      description = description.substring(0, 100).trim();
    }

    expenses.push({
      date: dateStr,
      description,
      category: categorize(description),
      amount,
      payment_method: "Bank Transfer",
    });
  }

  return expenses;
}
