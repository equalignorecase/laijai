import ExcelJS from "exceljs";
import { Transaction, Category } from "@/types";

/**
 * Sanitize cell value to prevent CSV Formula Injection (=, +, -, @)
 */
function sanitizeCsvValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/\r\n/g, " ").replace(/\n/g, " ");

  // Prevent CSV Formula Injection
  const cleanStr = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;

  // Escape double quotes
  return `"${cleanStr.replace(/"/g, '""')}"`;
}

/**
 * Export transactions to CSV with UTF-8 BOM for Thai Excel compatibility
 */
export function exportToCSV(
  transactions: Transaction[],
  categories: Category[],
  filename = "expense-report.csv"
): void {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = [
    "วันที่",
    "เวลา",
    "หมวดหมู่รายจ่าย",
    "ชื่อรายการ",
    "จำนวนเงิน (บาท)",
    "ผู้รับเงิน/ร้านค้า",
    "ผู้โอน",
    "ธนาคาร",
    "เลขอ้างอิง",
    "หมายเหตุ",
    "ที่มา",
  ];

  const rows = transactions.map((t) => [
    t.transactionDate,
    t.transactionTime || "-",
    (t.categoryId && categoryMap.get(t.categoryId)) || "ทั่วไป",
    t.title,
    t.amount.toFixed(2),
    t.recipientName || "-",
    t.senderName || "-",
    t.bankName || "-",
    t.referenceNumber || "-",
    t.description || "-",
    t.source === "receipt_ai" ? "Gemini OCR" : "บันทึกเอง",
  ]);

  const csvContent =
    "\uFEFF" + // UTF-8 BOM
    headers.map((h) => sanitizeCsvValue(h)).join(",") +
    "\n" +
    rows.map((row) => row.map((cell) => sanitizeCsvValue(cell)).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export transactions to Excel (.xlsx) file using ExcelJS
 */
export async function exportToExcel(
  transactions: Transaction[],
  categories: Category[],
  filename = "expense-report.xlsx",
  title = "รายงานสรุปค่าใช้จ่าย"
): Promise<void> {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Personal Expense Tracker";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("รายการค่าใช้จ่าย");

  // Title block
  worksheet.mergeCells("A1:I1");
  const titleRow = worksheet.getCell("A1");
  titleRow.value = title;
  titleRow.font = { name: "Sarabun", size: 16, bold: true, color: { argb: "FF1E293B" } };
  titleRow.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 35;

  // Calculation totals
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  worksheet.getCell("A3").value = "รายจ่ายรวม:";
  worksheet.getCell("B3").value = totalExpense;
  worksheet.getCell("B3").numFmt = "฿#,##0.00";
  worksheet.getCell("B3").font = { bold: true, color: { argb: "FFEF4444" } };

  worksheet.getCell("D3").value = "จำนวนรายการ:";
  worksheet.getCell("E3").value = `${transactions.length} รายการ`;
  worksheet.getCell("E3").font = { bold: true, color: { argb: "FF3B82F6" } };

  // Header row
  const headers = [
    "วันที่",
    "เวลา",
    "หมวดหมู่รายจ่าย",
    "ชื่อรายการ",
    "จำนวนเงิน (บาท)",
    "ผู้รับเงิน/ร้านค้า",
    "ธนาคาร",
    "เลขอ้างอิง",
    "ที่มา",
  ];

  const headerRow = worksheet.getRow(5);
  headerRow.values = headers;
  headerRow.font = { name: "Sarabun", bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F6" },
  };
  headerRow.height = 25;
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // Data rows
  transactions.forEach((t) => {
    worksheet.addRow([
      t.transactionDate,
      t.transactionTime || "-",
      (t.categoryId && categoryMap.get(t.categoryId)) || "ทั่วไป",
      t.title,
      t.amount,
      t.recipientName || "-",
      t.bankName || "-",
      t.referenceNumber || "-",
      t.source === "receipt_ai" ? "Gemini OCR" : "บันทึกเอง",
    ]);
  });

  // Format currency column (E)
  worksheet.getColumn(5).numFmt = "฿#,##0.00";

  // Auto-fit column widths
  worksheet.columns.forEach((col) => {
    col.width = 18;
  });
  worksheet.getColumn(4).width = 25; // Title wider

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
