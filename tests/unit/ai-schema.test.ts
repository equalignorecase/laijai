import { describe, it, expect } from "vitest";
import { SlipParseResultSchema } from "@/lib/ai/schemas";

describe("AI OCR Zod Schema Validation", () => {
  it("validates successful slip extraction output", () => {
    const rawAiResponse = {
      success: true,
      data: {
        amount: 350.5,
        date: "2026-10-19",
        time: "14:30",
        recipient: "ร้านกาแฟสุขใจ",
        sender: "สมชาย",
        reference: "202610190001234567",
        bank: "KBANK",
        suggestedCategory: "อาหารและเครื่องดื่ม",
        suggestedTitle: "ชำระเงิน ร้านกาแฟสุขใจ",
      },
      confidence: {
        amount: 0.98,
        date: 0.95,
        time: 0.9,
        recipient: 0.92,
        sender: 0.85,
        reference: 0.99,
        bank: 0.95,
      },
      warnings: [],
      needsReview: true,
    };

    const parsed = SlipParseResultSchema.safeParse(rawAiResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data.amount).toBe(350.5);
      expect(parsed.data.data.recipient).toBe("ร้านกาแฟสุขใจ");
      expect(parsed.data.confidence.amount).toBe(0.98);
    }
  });

  it("handles null fields gracefully when OCR cannot read them", () => {
    const incompleteResponse = {
      success: true,
      data: {
        amount: 1500,
        date: "2026-10-18",
        time: null,
        recipient: null,
        sender: null,
        reference: null,
        bank: null,
      },
      confidence: {
        amount: 0.9,
        date: 0.85,
        time: null,
        recipient: null,
        sender: null,
        reference: null,
        bank: null,
      },
      warnings: ["ไม่พบข้อมูลเวลาและผู้รับเงิน"],
      needsReview: true,
    };

    const parsed = SlipParseResultSchema.safeParse(incompleteResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data.recipient).toBeNull();
      expect(parsed.data.warnings).toHaveLength(1);
    }
  });

  it("rejects confidence score out of bounds (> 1.0)", () => {
    const invalidConfidence = {
      success: true,
      data: {
        amount: 100,
        date: null,
        time: null,
        recipient: null,
        sender: null,
        reference: null,
        bank: null,
      },
      confidence: {
        amount: 1.5, // Invalid > 1.0
        date: null,
        time: null,
        recipient: null,
        sender: null,
        reference: null,
        bank: null,
      },
      warnings: [],
      needsReview: true,
    };

    const parsed = SlipParseResultSchema.safeParse(invalidConfidence);
    expect(parsed.success).toBe(false);
  });
});
