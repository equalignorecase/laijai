import { createWorker } from "tesseract.js";
import { Category, SlipParseResult } from "@/types";

/**
 * Month mappings for Thai abbreviations
 */
const THAI_MONTHS: Record<string, string> = {
  "ม.ค.": "01",
  "ก.พ.": "02",
  "มี.ค.": "03",
  "เม.ย.": "04",
  "พ.ค.": "05",
  "มิ.ย.": "06",
  "ก.ค.": "07",
  "ส.ค.": "08",
  "ก.ย.": "09",
  "ต.ค.": "10",
  "พ.ย.": "11",
  "ธ.ค.": "12",
  "มกราคม": "01",
  "กุมภาพันธ์": "02",
  "มีนาคม": "03",
  "เมษายน": "04",
  "พฤษภาคม": "05",
  "มิถุนายน": "06",
  "กรกฎาคม": "07",
  "สิงหาคม": "08",
  "กันยายน": "09",
  "ตุลาคม": "10",
  "พฤศจิกายน": "11",
  "ธันวาคม": "12",
};

/**
 * Extract transfer amount from text
 */
function extractAmount(text: string): number | null {
  // Look for amount patterns following keywords like จำนวนเงิน, ยอดเงิน, Amount, Baht, บาท
  const amountKeywords = [
    /จำนวนเงิน\s*[:\s]?\s*([0-9,]+\.[0-9]{2})/i,
    /ยอดเงิน\s*[:\s]?\s*([0-9,]+\.[0-9]{2})/i,
    /amount\s*[:\s]?\s*([0-9,]+\.[0-9]{2})/i,
    /([0-9,]+\.[0-9]{2})\s*บาท/i,
    /([0-9,]+\.[0-9]{2})\s*THB/i,
  ];

  for (const regex of amountKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0) return val;
    }
  }

  // Fallback: search any decimal number like 1,250.00 or 150.00
  const genericDecimals = text.match(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g);
  if (genericDecimals && genericDecimals.length > 0) {
    for (const item of genericDecimals) {
      const num = parseFloat(item.replace(/,/g, ""));
      // Common transfer amounts are usually not fee amounts (0.00)
      if (num > 0) return num;
    }
  }

  return null;
}

/**
 * Extract date and convert Buddhist year if applicable
 */
function extractDate(text: string): string | null {
  // 1. Format: DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    let year = parseInt(slashMatch[3], 10);
    if (year > 2500) year -= 543; // Buddhist to Gregorian
    return `${year}-${month}-${day}`;
  }

  // 2. Format: DD [Thai Month] YYYY e.g. 19 ต.ค. 2569 or 19 ต.ค. 2026
  for (const [mName, mNum] of Object.entries(THAI_MONTHS)) {
    const pattern = new RegExp(`(\\d{1,2})\\s*${mName.replace(".", "\\.")}\\s*(\\d{2,4})`, "i");
    const match = text.match(pattern);
    if (match) {
      const day = match[1].padStart(2, "0");
      let year = parseInt(match[2], 10);
      if (year < 100) year += 2000;
      if (year > 2500) year -= 543;
      return `${year}-${mNum}-${day}`;
    }
  }

  return null;
}

/**
 * Extract time HH:mm
 */
function extractTime(text: string): string | null {
  const match = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?\b/);
  if (match) {
    const hh = match[1].padStart(2, "0");
    const mm = match[2].padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return null;
}

/**
 * Extract Bank Name from slip text
 */
function extractBank(text: string): string | null {
  const bankPatterns: [RegExp, string][] = [
    [/กสิกร|kbank|k\s*plus/i, "กสิกรไทย (KBANK)"],
    [/ไทยพาณิชย์|scb/i, "ไทยพาณิชย์ (SCB)"],
    [/กรุงไทย|ktb|krungthai/i, "กรุงไทย (KTB)"],
    [/กรุงเทพ|bbl|bualuang/i, "กรุงเทพ (BBL)"],
    [/ทหารไทย|ttb|ทีทีบี/i, "ทหารไทยธนชาต (TTB)"],
    [/ออมสิน|gsb|mymo/i, "ออมสิน (GSB)"],
    [/กรุงศรี|bay|kma/i, "กรุงศรีอยุธยา (BAY)"],
    [/พร้อมเพย์|promptpay/i, "พร้อมเพย์ (PromptPay)"],
    [/ทรูมันนี่|truemoney/i, "TrueMoney Wallet"],
  ];

  for (const [re, name] of bankPatterns) {
    if (re.test(text)) return name;
  }
  return null;
}

/**
 * Extract transaction reference code
 */
function extractReference(text: string): string | null {
  const refKeywords = [
    /(?:เลขอ้างอิง|รหัสอ้างอิง|เลขที่รายการ|Ref(?:\s*No)?|Transaction\s*ID)\s*[:\s]?\s*([A-Za-z0-9]{10,30})/i,
    /\b([0-9]{15,25})\b/,
  ];

  for (const regex of refKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract recipient or merchant name
 */
function extractRecipient(text: string): string | null {
  const recipientKeywords = [
    /(?:ไปยัง|ผู้รับเงิน|โอนให้|To)\s*[:\s]?\s*([ก-๙a-zA-Z\s]{3,35})/i,
    /(?:ร้าน|บจก|บริษัท)\s*([ก-๙a-zA-Z\s]{2,30})/i,
  ];

  for (const regex of recipientKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const clean = match[1].split("\n")[0].trim();
      if (clean.length > 2 && !clean.includes("จำนวนเงิน")) {
        return clean;
      }
    }
  }
  return null;
}

/**
 * Suggest expense category from extracted text & merchant name
 */
function suggestCategory(text: string, recipient: string | null, categories: Category[]): Category | null {
  const combined = `${text} ${recipient || ""}`.toLowerCase();

  const rules: { keywords: string[]; categoryKeyword: string }[] = [
    {
      keywords: ["อาหาร", "ข้าว", "กาแฟ", "cafe", "ชา", "หมูกระทะ", "สเต็ก", "เบเกอรี่", "7-eleven", "เซเว่น", "โลตัส", "บิ๊กซี", "tops", "kfc", "mcdonald", "food"],
      categoryKeyword: "อาหาร",
    },
    {
      keywords: ["น้ำมัน", "ปั๊ม", "ptt", "ปตท", "บางจาก", "shell", "caltex", "ค่ารถ", "bts", "mrt", "แท็กซี่", "grab", "lineman", "ทางด่วน", "ตั๋วรถ"],
      categoryKeyword: "เดินทาง",
    },
    {
      keywords: ["ค่าน้ำ", "ค่าไฟ", "การไฟฟ้า", "การประปา", "mea", "pea", "mwa", "pwa"],
      categoryKeyword: "ค่าน้ำ",
    },
    {
      keywords: ["เน็ต", "อินเทอร์เน็ต", "ais", "true", "dtac", "ทรู", "เอไอเอส", "ค่าโทร"],
      categoryKeyword: "อินเทอร์เน็ต",
    },
    {
      keywords: ["โฮมโปร", "ไทวัสดุ", "ikea", "homepro", "ของใช้ในบ้าน", "ซ่อม"],
      categoryKeyword: "บ้าน",
    },
    {
      keywords: ["ยา", "คลินิก", "โรงพยาบาล", "เภสัช", "ฟัน", "หมอ"],
      categoryKeyword: "สุขภาพ",
    },
    {
      keywords: ["ตั๋ว", "หนัง", "เมเจอร์", "sf", "คอนเสิร์ต", "เกม", "steam"],
      categoryKeyword: "บันเทิง",
    },
    {
      keywords: ["netflix", "spotify", "youtube", "ค่าสมาชิก", "premium"],
      categoryKeyword: "สมาชิก",
    },
    {
      keywords: ["ช้อปปิ้ง", "shopee", "lazada", "tiktok", "เสื้อผ้า"],
      categoryKeyword: "ซื้อของ",
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => combined.includes(k))) {
      const matchedCat = categories.find(
        (c) => c.type === "expense" && c.name.includes(rule.categoryKeyword)
      );
      if (matchedCat) return matchedCat;
    }
  }

  return categories.find((c) => c.type === "expense") || null;
}

/**
 * Parse raw text into structured SlipParseResult
 */
export function parseThaiSlipText(text: string, categories: Category[]): SlipParseResult {
  const amount = extractAmount(text);
  const date = extractDate(text);
  const time = extractTime(text);
  const bank = extractBank(text);
  const reference = extractReference(text);
  const recipient = extractRecipient(text);
  const matchedCat = suggestCategory(text, recipient, categories);

  const suggestedTitle = recipient
    ? `ชำระเงิน ${recipient}`
    : amount
    ? `โอนเงิน ${amount.toLocaleString()} บาท`
    : "ค่าใช้จ่าย (อ่านจากสลิป)";

  const warnings: string[] = [];
  if (!amount) warnings.push("อ่านจำนวนเงินไม่ชัดเจน กรุณากรอกจำนวนเงินด้วยตนเอง");
  if (!date) warnings.push("อ่านวันที่ไม่ชัดเจน ระบบตั้งเป็นวันที่ปัจจุบันให้");

  return {
    success: true,
    data: {
      amount,
      date,
      time,
      recipient,
      sender: null,
      reference,
      bank,
      suggestedCategory: matchedCat?.name || null,
      suggestedTitle,
    },
    confidence: {
      amount: amount ? 0.9 : null,
      date: date ? 0.85 : null,
      time: time ? 0.85 : null,
      recipient: recipient ? 0.75 : null,
      sender: null,
      reference: reference ? 0.95 : null,
      bank: bank ? 0.9 : null,
    },
    warnings,
    needsReview: true,
  };
}

export interface PreprocessOptions {
  contrast?: number; // -100 to 100, default 35
  brightness?: number; // -100 to 100, default 0
  threshold?: number; // 0 to 255 (0 = off), default 0
  grayscale?: boolean; // default true
  invert?: boolean; // default false
}

export interface RegexTrace {
  field: "amount" | "date" | "time" | "bank" | "reference" | "recipient" | "category";
  rule: string;
  pattern: string;
  matched: boolean;
  matchedText?: string;
  extractedValue?: string | number | null;
}

export interface SlipDiagnosticResult extends SlipParseResult {
  rawText: string;
  traces: RegexTrace[];
}

/**
 * Detailed parser that records each regex rule evaluation for debugging
 */
export function parseThaiSlipTextWithDiagnostics(
  text: string,
  categories: Category[]
): SlipDiagnosticResult {
  const traces: RegexTrace[] = [];

  // 1. Amount diagnostics
  let foundAmount: number | null = null;
  const amountKeywords = [
    { name: "คำค้น 'จำนวนเงิน'", regex: /จำนวนเงิน\s*[:\s]?\s*([0-9,]+\.[0-9]{2})/i },
    { name: "คำค้น 'ยอดเงิน'", regex: /ยอดเงิน\s*[:\s]?\s*([0-9,]+\.[0-9]{2})/i },
    { name: "คำค้น 'Amount'", regex: /amount\s*[:\s]?\s*([0-9,]+\.[0-9]{2})/i },
    { name: "ลงท้าย 'บาท'", regex: /([0-9,]+\.[0-9]{2})\s*บาท/i },
    { name: "ลงท้าย 'THB'", regex: /([0-9,]+\.[0-9]{2})\s*THB/i },
  ];

  for (const item of amountKeywords) {
    const match = text.match(item.regex);
    const matched = !!(match && match[1]);
    const val = matched ? parseFloat(match[1].replace(/,/g, "")) : null;
    if (matched && !foundAmount && val && val > 0) {
      foundAmount = val;
    }
    traces.push({
      field: "amount",
      rule: item.name,
      pattern: item.regex.toString(),
      matched,
      matchedText: match ? match[0] : undefined,
      extractedValue: val,
    });
  }

  // Generic decimals fallback
  const genericDecimals = text.match(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g);
  let genericVal: number | null = null;
  if (genericDecimals) {
    for (const item of genericDecimals) {
      const num = parseFloat(item.replace(/,/g, ""));
      if (num > 0) {
        genericVal = num;
        break;
      }
    }
  }
  traces.push({
    field: "amount",
    rule: "ค้นหาทศนิยมทั่วไป (Fallback)",
    pattern: "/\\b\\d{1,3}(?:,\\d{3})*\\.\\d{2}\\b/g",
    matched: !!genericVal,
    matchedText: genericDecimals?.join(", "),
    extractedValue: genericVal,
  });

  // 2. Date diagnostics
  let foundDate: string | null = null;
  const slashMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    let year = parseInt(slashMatch[3], 10);
    if (year > 2500) year -= 543;
    foundDate = `${year}-${month}-${day}`;
  }
  traces.push({
    field: "date",
    rule: "รูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY",
    pattern: "/\\b(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})\\b/",
    matched: !!slashMatch,
    matchedText: slashMatch ? slashMatch[0] : undefined,
    extractedValue: foundDate,
  });

  if (!foundDate) {
    for (const [mName, mNum] of Object.entries(THAI_MONTHS)) {
      const pattern = new RegExp(`(\\d{1,2})\\s*${mName.replace(".", "\\.")}\\s*(\\d{2,4})`, "i");
      const match = text.match(pattern);
      if (match) {
        const day = match[1].padStart(2, "0");
        let year = parseInt(match[2], 10);
        if (year < 100) year += 2000;
        if (year > 2500) year -= 543;
        foundDate = `${year}-${mNum}-${day}`;
        traces.push({
          field: "date",
          rule: `ตัวย่อเดือนไทย (${mName})`,
          pattern: pattern.toString(),
          matched: true,
          matchedText: match[0],
          extractedValue: foundDate,
        });
        break;
      }
    }
  }

  // 3. Time diagnostics
  const timeMatch = text.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?\b/);
  const foundTime = timeMatch
    ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2].padStart(2, "0")}`
    : null;
  traces.push({
    field: "time",
    rule: "เวลา HH:mm",
    pattern: "/\\b([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?\\b/",
    matched: !!timeMatch,
    matchedText: timeMatch ? timeMatch[0] : undefined,
    extractedValue: foundTime,
  });

  // 4. Bank diagnostics
  const bankPatterns: [RegExp, string][] = [
    [/กสิกร|kbank|k\s*plus/i, "กสิกรไทย (KBANK)"],
    [/ไทยพาณิชย์|scb/i, "ไทยพาณิชย์ (SCB)"],
    [/กรุงไทย|ktb|krungthai/i, "กรุงไทย (KTB)"],
    [/กรุงเทพ|bbl|bualuang/i, "กรุงเทพ (BBL)"],
    [/ทหารไทย|ttb|ทีทีบี/i, "ทหารไทยธนชาต (TTB)"],
    [/ออมสิน|gsb|mymo/i, "ออมสิน (GSB)"],
    [/กรุงศรี|bay|kma/i, "กรุงศรีอยุธยา (BAY)"],
    [/พร้อมเพย์|promptpay/i, "พร้อมเพย์ (PromptPay)"],
    [/ทรูมันนี่|truemoney/i, "TrueMoney Wallet"],
  ];
  let foundBank: string | null = null;
  for (const [re, name] of bankPatterns) {
    const isMatched = re.test(text);
    if (isMatched && !foundBank) foundBank = name;
    traces.push({
      field: "bank",
      rule: `ธนาคาร ${name}`,
      pattern: re.toString(),
      matched: isMatched,
      matchedText: isMatched ? (text.match(re)?.[0] || "") : undefined,
      extractedValue: isMatched ? name : null,
    });
  }

  // 5. Reference diagnostics
  let foundRef = extractReference(text);
  traces.push({
    field: "reference",
    rule: "รหัสอ้างอิง (Ref No / Transaction ID)",
    pattern: "รหัส 10-30 หลัก",
    matched: !!foundRef,
    extractedValue: foundRef,
  });

  // 6. Recipient diagnostics
  let foundRecipient = extractRecipient(text);
  traces.push({
    field: "recipient",
    rule: "ผู้รับเงิน / ร้านค้า",
    pattern: "ไปยัง / ผู้รับเงิน / โอนให้ / ร้าน / บจก",
    matched: !!foundRecipient,
    extractedValue: foundRecipient,
  });

  // 7. Category diagnostics
  const matchedCat = suggestCategory(text, foundRecipient, categories);
  traces.push({
    field: "category",
    rule: "แนะนำหมวดหมู่อัตโนมัติ",
    pattern: "จับคู่คำสำคัญ (อาหาร, เดินทาง, ช้อปปิ้ง ฯลฯ)",
    matched: !!matchedCat,
    extractedValue: matchedCat?.name || null,
  });

  const baseResult = parseThaiSlipText(text, categories);
  return {
    ...baseResult,
    rawText: text,
    traces,
  };
}

/**
 * Preprocess image via HTML5 Canvas with configurable options
 */
export async function preprocessImageDetails(
  file: File,
  options?: PreprocessOptions
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { blob: file, dataUrl: "", width: 0, height: 0 };
  }

  const contrast = options?.contrast ?? 35;
  const brightness = options?.brightness ?? 0;
  const threshold = options?.threshold ?? 0;
  const grayscale = options?.grayscale ?? true;
  const invert = options?.invert ?? false;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const maxDim = 2000;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ blob: file, dataUrl: "", width, height });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Contrast formula factor
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // 1. Grayscale
          if (grayscale) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray;
            g = gray;
            b = gray;
          }

          // 2. Brightness
          if (brightness !== 0) {
            r += brightness;
            g += brightness;
            b += brightness;
          }

          // 3. Contrast
          if (contrast !== 0) {
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;
          }

          // 4. Thresholding / Binarization (if > 0)
          if (threshold > 0) {
            const avg = (r + g + b) / 3;
            const bin = avg >= threshold ? 255 : 0;
            r = bin;
            g = bin;
            b = bin;
          }

          // 5. Invert
          if (invert) {
            r = 255 - r;
            g = 255 - g;
            b = 255 - b;
          }

          data[i] = Math.min(255, Math.max(0, r));
          data[i + 1] = Math.min(255, Math.max(0, g));
          data[i + 2] = Math.min(255, Math.max(0, b));
        }

        ctx.putImageData(imgData, 0, 0);

        const dataUrl = canvas.toDataURL("image/png");
        canvas.toBlob(
          (blob) => {
            resolve({
              blob: blob || file,
              dataUrl,
              width,
              height,
            });
          },
          "image/png"
        );
      } catch {
        resolve({ blob: file, dataUrl: "", width, height });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, dataUrl: "", width: 0, height: 0 });
    };

    img.src = url;
  });
}

/**
 * Preprocess image via HTML5 Canvas (grayscale + contrast stretch) to improve Thai OCR accuracy
 */
export async function preprocessImageWithCanvas(
  file: File,
  options?: PreprocessOptions
): Promise<Blob> {
  const details = await preprocessImageDetails(file, options);
  return details.blob;
}

/**
 * Run client-side Tesseract.js OCR directly in user's browser
 */
export async function recognizeSlipWithTesseract(
  imageFile: File,
  categories: Category[],
  onProgress?: (percent: number, status: string) => void
): Promise<SlipParseResult> {
  onProgress?.(5, "กำลังปรับแต่งภาพ (Grayscale + Contrast)...");

  let processedBlob: Blob = imageFile;
  try {
    processedBlob = await preprocessImageWithCanvas(imageFile);
  } catch (err) {
    console.warn("Canvas preprocessing failed, fallback to original", err);
  }

  onProgress?.(15, "กำลังโหลดโมเดล OCR ภาษาไทย (tha+eng)...");

  const worker = await createWorker(["tha", "eng"], 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        const progress = Math.round(m.progress * 100);
        onProgress?.(30 + Math.round(progress * 0.65), `กำลังประมวลผลข้อความ... ${progress}%`);
      } else if (m.status === "loading tesseract core") {
        onProgress?.(20, "กำลังโหลด Core OCR...");
      }
    },
  });

  try {
    const { data } = await worker.recognize(processedBlob);
    onProgress?.(95, "กำลังสกัดยอดเงินและรายละเอียดสลิป...");

    const result = parseThaiSlipText(data.text, categories);
    onProgress?.(100, "อ่านข้อมูลสำเร็จ!");
    return result;
  } finally {
    await worker.terminate();
  }
}

/**
 * Diagnostic version of Tesseract runner for Debug OCR page
 */
export async function recognizeSlipWithTesseractDiagnostics(
  imageSource: File | Blob,
  categories: Category[],
  onProgress?: (percent: number, status: string) => void
): Promise<SlipDiagnosticResult> {
  onProgress?.(15, "กำลังโหลดโมเดล OCR ภาษาไทย (tha+eng)...");

  const worker = await createWorker(["tha", "eng"], 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        const progress = Math.round(m.progress * 100);
        onProgress?.(30 + Math.round(progress * 0.65), `กำลังประมวลผลข้อความ... ${progress}%`);
      } else if (m.status === "loading tesseract core") {
        onProgress?.(20, "กำลังโหลด Core OCR...");
      }
    },
  });

  try {
    const { data } = await worker.recognize(imageSource);
    onProgress?.(95, "กำลังสกัดยอดเงินและตรวจสอบ Regex...");

    const diag = parseThaiSlipTextWithDiagnostics(data.text, categories);
    onProgress?.(100, "อ่านข้อมูลและวิเคราะห์เสร็จสมบูรณ์!");
    return diag;
  } finally {
    await worker.terminate();
  }
}
