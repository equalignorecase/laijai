"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SlipUploader } from "@/components/transactions/slip-uploader";
import { DuplicateModal } from "@/components/transactions/duplicate-modal";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  createTransaction,
  checkDuplicateTransaction,
  DuplicateCheckResult,
} from "@/services/transaction-service";
import { Transaction, SlipParseResult } from "@/types";
import { getCurrentDateStr } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Sparkles,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function NewTransactionPage() {
  const router = useRouter();
  const { uid, categories } = useAuth();

  const type = "expense";
  const [amount, setAmount] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<string>("");
  const [transactionTime, setTransactionTime] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("PromptPay/โอนเงิน");
  const [recipientName, setRecipientName] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [source, setSource] = useState<"manual" | "receipt_ai">("manual");
  const [ocrEngine, setOcrEngine] = useState<"tesseract" | "gemini" | null>(null);

  // Duplicate check modal state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [aiConfidenceWarning, setAiConfidenceWarning] = useState<string[]>([]);

  // Filter categories by type
  const availableCategories = categories.filter((c) => c.type === type && !c.isArchived);

  // Set default category and dates
  React.useEffect(() => {
    if (availableCategories.length > 0 && !categoryId) {
      setCategoryId(availableCategories[0].id);
    }
    if (!transactionDate) {
      setTransactionDate(getCurrentDateStr());
    }
    if (!transactionTime) {
      setTransactionTime(format(new Date(), "HH:mm"));
    }
  }, [availableCategories, categoryId, transactionDate, transactionTime]);

  // Handle OCR Result from Tesseract or Gemini
  const handleSlipParsed = (result: SlipParseResult, engine: "tesseract" | "gemini") => {
    setSource("receipt_ai");
    setOcrEngine(engine);

    if (result.data.amount) {
      setAmount(result.data.amount.toString());
    }
    if (result.data.date) {
      setTransactionDate(result.data.date);
    }
    if (result.data.time) {
      setTransactionTime(result.data.time);
    }
    if (result.data.recipient) {
      setRecipientName(result.data.recipient);
    }
    if (result.data.sender) {
      setSenderName(result.data.sender);
    }
    if (result.data.bank) {
      setBankName(result.data.bank);
    }
    if (result.data.reference) {
      setReferenceNumber(result.data.reference);
    }
    // Note: Do not auto-fill title, user enters manually

    // Auto-match category from suggested name
    if (result.data.suggestedCategory) {
      const match = categories.find(
        (c) =>
          c.type === "expense" &&
          c.name.toLowerCase() === result.data.suggestedCategory?.toLowerCase()
      );
      if (match) {
        setCategoryId(match.id);
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      setAiConfidenceWarning(result.warnings);
    } else {
      setAiConfidenceWarning([]);
    }
  };

  const handleSave = async (forceBypassDuplicate = false) => {
    setFormError(null);

    if (!uid) {
      setFormError("ยังไม่ได้เข้าสู่ระบบ กรุณารอสักครู่");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("กรุณากรอกจำนวนเงินให้ถูกต้อง (ต้องเป็นตัวเลขมากกว่า 0)");
      return;
    }

    if (!title.trim()) {
      setFormError("กรุณากรอกชื่อรายการ");
      return;
    }

    if (!categoryId) {
      setFormError("กรุณาเลือกหมวดหมู่");
      return;
    }

    // Duplicate Check
    if (!forceBypassDuplicate) {
      const dupCheck = await checkDuplicateTransaction(uid, {
        referenceNumber: referenceNumber.trim() || undefined,
        amount: parsedAmount,
        transactionDate,
        recipientName: recipientName.trim() || undefined,
        bankName: bankName.trim() || undefined,
      });

      if (dupCheck.isDuplicate && dupCheck.matchedTransaction) {
        setDuplicateInfo(dupCheck);
        setDuplicateModalOpen(true);
        return;
      }
    }

    // Proceed to save
    setIsSubmitting(true);
    try {
      await createTransaction(uid, {
        type,
        amount: parsedAmount,
        currency: "THB",
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId,
        transactionDate,
        transactionTime: transactionTime || undefined,
        timezone: "Asia/Bangkok",
        paymentMethod: paymentMethod || undefined,
        merchantName: recipientName.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        senderName: senderName.trim() || undefined,
        bankName: bankName.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        source,
        duplicateStatus: forceBypassDuplicate ? "possible_duplicate" : "unique",
      });

      router.push("/transactions");
    } catch (err: unknown) {
      console.error("Save transaction error:", err);
      setFormError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">บันทึกรายการใหม่</h1>
            <p className="text-xs text-slate-500">กรอกข้อมูลเอง หรืออัปโหลดสลิปให้ AI ช่วยอ่าน</p>
          </div>
        </div>

        {source === "receipt_ai" && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              ocrEngine === "gemini"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {ocrEngine === "gemini" ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>เติมข้อมูลจาก Gemini 2.5 Flash</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>เติมข้อมูลจาก Tesseract OCR (ในเครื่อง)</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Slip Uploader (Ephemeral OCR) */}
      <SlipUploader
        categories={categories}
        onParsed={handleSlipParsed}
        disabled={isSubmitting}
      />

      {/* AI Warnings if any */}
      {aiConfidenceWarning.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>คำแนะนำจาก AI:</span>
          </div>
          {aiConfidenceWarning.map((w, idx) => (
            <p key={idx} className="pl-5">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* Transaction Form Card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(false);
        }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6"
      >

        {/* 1. จำนวนเงิน & 2. ชื่อรายการ (กรอกเอง) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                ฿
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อรายการ (กรอกเอง) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ค่าอาหาร, กาแฟ, น้ำมัน, ค่าเน็ต"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
            />
          </div>
        </div>

        {/* 3. หมวดหมู่ & 4. วันที่ และ เวลา */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              หมวดหมู่ <span className="text-rose-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
            >
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">วันที่</label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">เวลา</label>
              <input
                type="time"
                value={transactionTime}
                onChange={(e) => setTransactionTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 5. ธนาคาร */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            ธนาคาร
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="เช่น กสิกรไทย, ไทยพาณิชย์, กรุงไทย, พร้อมเพย์"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* 6. หมายเหตุ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            หมายเหตุ
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* Error message */}
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {formError}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Link
            href="/transactions"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/30 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "กำลังบันทึก..." : "บันทึกรายจ่าย"}</span>
          </button>
        </div>
      </form>

      {/* Duplicate Modal Dialog */}
      {duplicateInfo?.matchedTransaction && (
        <DuplicateModal
          isOpen={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          onConfirm={() => {
            setDuplicateModalOpen(false);
            handleSave(true); // force bypass duplicate check
          }}
          existingTransaction={duplicateInfo.matchedTransaction}
          newCandidate={{
            title,
            amount: parseFloat(amount) || 0,
            transactionDate,
            recipientName,
            referenceNumber,
            bankName,
          }}
          reasonMessage={duplicateInfo.message}
        />
      )}
    </div>
  );
}
