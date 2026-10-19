"use client";

import React from "react";
import { Transaction } from "@/types";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";

interface DuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingTransaction: Transaction;
  newCandidate: {
    title: string;
    amount: number;
    transactionDate: string;
    recipientName?: string;
    referenceNumber?: string;
    bankName?: string;
  };
  reasonMessage?: string;
}

export function DuplicateModal({
  isOpen,
  onClose,
  onConfirm,
  existingTransaction,
  newCandidate,
  reasonMessage,
}: DuplicateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-amber-600 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">ตรวจพบรายการที่อาจซ้ำ</h3>
            <p className="text-xs text-slate-500">กรุณาตรวจสอบข้อมูลก่อนยืนยันบันทึก</p>
          </div>
        </div>

        {reasonMessage && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            {reasonMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
          {/* Existing */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">
              รายการเดิมในระบบ
            </div>
            <div>
              <span className="text-slate-400 block">ชื่อรายการ:</span>
              <span className="font-medium text-slate-800">{existingTransaction.title}</span>
            </div>
            <div>
              <span className="text-slate-400 block">จำนวนเงิน:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(existingTransaction.amount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">วันที่:</span>
              <span>{formatThaiDate(existingTransaction.transactionDate)}</span>
            </div>
            {existingTransaction.recipientName && (
              <div>
                <span className="text-slate-400 block">ผู้รับ:</span>
                <span>{existingTransaction.recipientName}</span>
              </div>
            )}
            {existingTransaction.referenceNumber && (
              <div>
                <span className="text-slate-400 block">เลขอ้างอิง:</span>
                <span className="font-mono text-[11px] text-blue-600">
                  {existingTransaction.referenceNumber}
                </span>
              </div>
            )}
          </div>

          {/* New Candidate */}
          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 space-y-2">
            <div className="font-bold text-blue-800 border-b border-blue-200 pb-1">
              รายการใหม่ที่จะบันทึก
            </div>
            <div>
              <span className="text-blue-400 block">ชื่อรายการ:</span>
              <span className="font-medium text-slate-800">{newCandidate.title || "-"}</span>
            </div>
            <div>
              <span className="text-blue-400 block">จำนวนเงิน:</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(newCandidate.amount)}
              </span>
            </div>
            <div>
              <span className="text-blue-400 block">วันที่:</span>
              <span>{formatThaiDate(newCandidate.transactionDate)}</span>
            </div>
            {newCandidate.recipientName && (
              <div>
                <span className="text-blue-400 block">ผู้รับ:</span>
                <span>{newCandidate.recipientName}</span>
              </div>
            )}
            {newCandidate.referenceNumber && (
              <div>
                <span className="text-blue-400 block">เลขอ้างอิง:</span>
                <span className="font-mono text-[11px] text-blue-600">
                  {newCandidate.referenceNumber}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
          >
            ยืนยันบันทึกต่อ (ไม่ใช่รายการซ้ำ)
          </button>
        </div>
      </div>
    </div>
  );
}
