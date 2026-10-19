"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/context/auth-context";
import { RecurringTransaction } from "@/types";
import {
  getRecurringTransactions,
  executeRecurringTransaction,
} from "@/services/recurring-service";
import { getCurrentDateStr } from "@/lib/utils";
import { CalendarSync, CheckCircle2, X } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { uid } = useAuth();
  const [dueRecurring, setDueRecurring] = useState<RecurringTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const fetchDue = async () => {
      try {
        const list = await getRecurringTransactions(uid);
        const today = getCurrentDateStr();
        const due = list.filter((item) => item.isActive && item.nextDueDate <= today);
        setDueRecurring(due);
      } catch (err) {
        console.error("Failed to check recurring due:", err);
      }
    };
    fetchDue();
  }, [uid]);

  const handleConfirmAllDue = async () => {
    if (!uid || dueRecurring.length === 0) return;
    setIsProcessing(true);
    try {
      for (const item of dueRecurring) {
        await executeRecurringTransaction(uid, item);
      }
      setDueRecurring([]);
      alert("บันทึกรายการประจำที่ถึงกำหนดเรียบร้อยแล้ว!");
      window.location.reload();
    } catch (err) {
      console.error("Error executing recurring transactions:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกรายการประจำ");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Recurring Due Alert Banner */}
        {dueRecurring.length > 0 && !bannerDismissed && (
          <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between text-sm shadow-sm transition-all animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5 font-medium">
              <CalendarSync className="w-5 h-5 shrink-0" />
              <span>
                มีรายการประจำถึงกำหนดชำระแล้ว <strong>{dueRecurring.length}</strong> รายการ
                ต้องการบันทึกเป็นธุรกรรมจริงหรือไม่?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirmAllDue}
                disabled={isProcessing}
                className="bg-white text-amber-700 hover:bg-amber-50 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isProcessing ? "กำลังบันทึก..." : "ยืนยันบันทึกทั้งหมด"}</span>
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-white/80 hover:text-white p-1 rounded-md"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
