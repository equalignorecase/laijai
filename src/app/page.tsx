"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SlipUploader } from "@/components/transactions/slip-uploader";
import { DuplicateModal } from "@/components/transactions/duplicate-modal";
import {
  createTransaction,
  checkDuplicateTransaction,
  DuplicateCheckResult,
} from "@/services/transaction-service";
import { SlipParseResult } from "@/types";
import { getCurrentDateStr } from "@/lib/utils";
import {
  LayoutDashboard,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function RecordExpensePage() {
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

  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    title?: string;
    categoryId?: string;
  }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      setFieldErrors((prev) => ({ ...prev, amount: undefined }));
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

    // Auto-match category from suggested name
    if (result.data.suggestedCategory) {
      const match = categories.find(
        (c) =>
          c.type === "expense" &&
          c.name.toLowerCase() === result.data.suggestedCategory?.toLowerCase()
      );
      if (match) {
        setCategoryId(match.id);
        setFieldErrors((prev) => ({ ...prev, categoryId: undefined }));
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
    const errors: { amount?: string; title?: string; categoryId?: string } = {};

    if (!uid) {
      setFormError("ยังไม่ได้เข้าสู่ระบบ กำลังเชื่อมต่อฐานข้อมูล กรุณารอสักครู่แล้วกดใหม่อีกครั้ง");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "กรุณากรอกจำนวนเงินให้ถูกต้อง (ต้องเป็นตัวเลขมากกว่า 0)";
    }

    if (!title.trim()) {
      errors.title = "กรุณากรอกชื่อรายการ (เช่น ค่าอาหาร, กาแฟ, ช้อปปิ้ง)";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      // 1. Duplicate Check
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
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Create Transaction
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

      // 3. Success state & navigation to dashboard
      setSaveSuccess(true);
      setTimeout(() => {
        router.refresh();
        router.push("/dashboard");
      }, 500);
    } catch (err: unknown) {
      console.error("Save transaction error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      setFormError(`เกิดข้อผิดพลาด: ${msg} กรุณาลองใหม่อีกครั้ง`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title="ดูแดชบอร์ดภาพรวม"
          >
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">บันทึกรายจ่าย</h1>
            <p className="text-xs text-slate-500">กรอกข้อมูลเอง หรืออัปโหลดสลิปให้ AI ช่วยอ่าน</p>
          </div>
        </div>

        {source === "receipt_ai" && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border self-start sm:self-auto ${
              ocrEngine === "gemini"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {ocrEngine === "gemini" ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>เติมข้อมูลจาก Gemini 2.5 Flash</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />
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
        disabled={isSubmitting || saveSuccess}
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
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(false);
        }}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6"
      >
        {/* Success Banner */}
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>บันทึกรายจ่ายสำเร็จเรียบร้อย! กำลังนำคุณไปยังแดชบอร์ดภาพรวม...</span>
          </div>
        )}

        {/* 1. จำนวนเงิน & 2. ชื่อรายการ */}
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
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (fieldErrors.amount) {
                    setFieldErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-base font-bold text-slate-900 transition-all ${
                  fieldErrors.amount
                    ? "bg-rose-50/50 border-2 border-rose-400 focus:bg-white focus:outline-hidden"
                    : "bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                }`}
              />
            </div>
            {fieldErrors.amount && (
              <p className="text-xs text-rose-500 font-medium mt-1">{fieldErrors.amount}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ชื่อรายการ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              placeholder="เช่น ค่าอาหาร, กาแฟ, น้ำมัน, ค่าเน็ต"
              className={`w-full px-4 py-2.5 rounded-xl text-sm text-slate-900 transition-all ${
                fieldErrors.title
                  ? "bg-rose-50/50 border-2 border-rose-400 focus:bg-white focus:outline-hidden"
                  : "bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              }`}
            />
            {fieldErrors.title && (
              <p className="text-xs text-rose-500 font-medium mt-1">{fieldErrors.title}</p>
            )}

            {/* Quick Suggestion Chip from Slip Recipient */}
            {recipientName && !title && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <span>แนะนำ:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTitle(`จ่าย ${recipientName}`);
                    setFieldErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>ใช้ชื่อ "จ่าย {recipientName}"</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* วันที่ และ เวลา */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">วันที่ทำรายการ</label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">เวลา (ถ้ามี)</label>
            <input
              type="time"
              value={transactionTime}
              onChange={(e) => setTransactionTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* ธนาคาร */}
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

        {/* หมายเหตุ */}
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
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors text-center"
          >
            ดูแดชบอร์ด
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || saveSuccess}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/30 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                <span>กำลังบันทึก...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>บันทึกสำเร็จ!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกรายจ่าย</span>
              </>
            )}
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
