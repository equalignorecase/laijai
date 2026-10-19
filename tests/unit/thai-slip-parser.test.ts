import { describe, it, expect } from "vitest";
import { parseThaiSlipText } from "@/lib/ocr/thai-slip-parser";
import { Category } from "@/types";

const mockCategories: Category[] = [
  {
    id: "cat-food",
    name: "อาหารและเครื่องดื่ม",
    type: "expense",
    icon: "Utensils",
    color: "#f97316",
    isDefault: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cat-transport",
    name: "การเดินทาง",
    type: "expense",
    icon: "Car",
    color: "#3b82f6",
    isDefault: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("Thai Slip Text Parser (Tesseract Heuristics)", () => {
  it("extracts amount, date, bank, reference, and category accurately", () => {
    const rawSlipOcrText = `
      ธนาคารกสิกรไทย K PLUS
      โอนเงินสำเร็จ
      19 ต.ค. 2569 13:45 น.
      ไปยัง: ร้านกาแฟสุขใจ Cafe
      จำนวนเงิน: 245.50 บาท
      รหัสอ้างอิง: 20261019KBANK987654321
    `;

    const result = parseThaiSlipText(rawSlipOcrText, mockCategories);

    expect(result.success).toBe(true);
    expect(result.data.amount).toBe(245.5);
    expect(result.data.date).toBe("2026-10-19");
    expect(result.data.time).toBe("13:45");
    expect(result.data.bank).toBe("กสิกรไทย (KBANK)");
    expect(result.data.reference).toBe("20261019KBANK987654321");
    expect(result.data.suggestedCategory).toBe("อาหารและเครื่องดื่ม");
  });

  it("handles slash date format with Buddhist year conversion", () => {
    const rawSlipOcrText = `
      ไทยพาณิชย์ SCB EASY
      วันที่ทำรายการ: 25/12/2569 09:15
      ยอดเงิน: 1,500.00 บาท
      เลขอ้างอิง: 202612250001
      ผู้รับเงิน: ปั๊มน้ำมัน PTT
    `;

    const result = parseThaiSlipText(rawSlipOcrText, mockCategories);

    expect(result.data.amount).toBe(1500);
    expect(result.data.date).toBe("2026-12-25");
    expect(result.data.bank).toBe("ไทยพาณิชย์ (SCB)");
    expect(result.data.suggestedCategory).toBe("การเดินทาง");
  });

  it("adds warning when amount cannot be read", () => {
    const blurrySlipText = `
      สลิปชำรุด เบลอ อ่านไม่ออก
      วันที่ 15 ม.ค. 2569
    `;

    const result = parseThaiSlipText(blurrySlipText, mockCategories);

    expect(result.data.amount).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("จำนวนเงิน"))).toBe(true);
  });
});
