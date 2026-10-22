"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { UserAuthButton } from "@/components/layout/user-auth-button";
import { Transaction, Budget } from "@/types";
import { getTransactions, deleteTransaction } from "@/services/transaction-service";
import { getPrimaryBudget, savePrimaryBudget } from "@/services/budget-service";
import {
  formatCurrency,
  formatThaiDate,
  getCurrentDateStr,
} from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Wallet,
  PlusCircle,
  Calendar,
  CalendarDays,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowRight,
  Receipt,
  Clock,
  Sparkles,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function DashboardPage() {
  const { uid, isAnonymous } = useAuth();
  const [todayStr, setTodayStr] = useState<string>("");
  const [budget, setBudget] = useState<Budget | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Budget Modal state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [modalStartDate, setModalStartDate] = useState("");
  const [modalEndDate, setModalEndDate] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalFieldErrors, setModalFieldErrors] = useState<{
    startDate?: string;
    endDate?: string;
    amount?: string;
  }>({});
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Delete transaction modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);

  // Notice banner
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [primaryB, txList] = await Promise.all([
        getPrimaryBudget(uid),
        getTransactions(uid, { type: "expense" }),
      ]);
      setBudget(primaryB);
      setAllTransactions(txList);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = getCurrentDateStr();
    setTodayStr(today);
    loadData();
  }, [uid]);

  // Open Edit Budget Modal
  const handleOpenEditModal = () => {
    if (budget) {
      setModalStartDate(budget.startDate || todayStr);
      setModalEndDate(budget.endDate || todayStr);
      setModalAmount(budget.amount > 0 ? String(budget.amount) : "");
    } else {
      setModalStartDate(todayStr);
      const d = new Date(todayStr || getCurrentDateStr());
      d.setDate(d.getDate() + 30);
      setModalEndDate(d.toISOString().split("T")[0]);
      setModalAmount("");
    }
    setModalFieldErrors({});
    setShowBudgetModal(true);
  };

  // Preset days helpers for modal
  const applyPresetDays = (days: number) => {
    const start = modalStartDate || todayStr || getCurrentDateStr();
    const d = new Date(start);
    d.setDate(d.getDate() + (days - 1));
    setModalEndDate(d.toISOString().split("T")[0]);
    if (modalFieldErrors.endDate) {
      setModalFieldErrors((p) => ({ ...p, endDate: undefined }));
    }
  };

  const applyThisMonthPreset = () => {
    const current = todayStr || getCurrentDateStr();
    const [year, month] = current.split("-").map(Number);
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;
    setModalStartDate(firstDay);
    setModalEndDate(lastDay);
    setModalFieldErrors({});
  };

  // Save budget handler with inline validation
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    const errors: typeof modalFieldErrors = {};
    if (!modalStartDate) errors.startDate = "กรุณาระบุวันเริ่มต้น";
    if (!modalEndDate) errors.endDate = "กรุณาระบุวันสิ้นสุด";
    if (modalStartDate && modalEndDate && modalEndDate < modalStartDate) {
      errors.endDate = "วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น";
    }

    const numAmount = parseFloat(modalAmount);
    if (!modalAmount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = "กรุณากรอกงบประมาณเป็นตัวเลขที่มากกว่า 0";
    }

    if (Object.keys(errors).length > 0) {
      setModalFieldErrors(errors);
      return;
    }

    setIsSavingBudget(true);
    setModalFieldErrors({});
    try {
      const saved = await savePrimaryBudget(uid, {
        startDate: modalStartDate,
        endDate: modalEndDate,
        amount: numAmount,
        name: "งบประมาณหลัก",
      });
      setBudget(saved);
      setShowBudgetModal(false);
      setNotice({
        type: "success",
        message: `บันทึกงบประมาณ ${formatCurrency(numAmount)} (${formatThaiDate(modalStartDate)} - ${formatThaiDate(modalEndDate)}) สำเร็จ!`,
      });
    } catch (err) {
      console.error("Failed to save budget:", err);
      setNotice({
        type: "error",
        message: "เกิดข้อผิดพลาดในการบันทึกงบประมาณ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Delete transaction handler
  const handleConfirmDeleteTx = async () => {
    if (!uid || !deleteTarget) return;
    setIsDeletingTx(true);
    try {
      await deleteTransaction(uid, deleteTarget.id);
      setAllTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setNotice({
        type: "success",
        message: `ลบรายการ "${deleteTarget.title}" เรียบร้อยแล้ว`,
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete tx:", err);
      setNotice({
        type: "error",
        message: "เกิดข้อผิดพลาดในการลบรายการ",
      });
      setDeleteTarget(null);
    } finally {
      setIsDeletingTx(false);
    }
  };

  // Compute matched transactions within the current budget period (sorted by date desc -> time desc -> createdAt desc)
  const matchedTransactions = useMemo(() => {
    let list = allTransactions;
    if (budget?.startDate && budget?.endDate) {
      const start = budget.startDate;
      const end = budget.endDate;
      list = allTransactions.filter((tx) => {
        const txDate = (tx.transactionDate || "").slice(0, 10);
        if (!txDate) return false;
        return txDate >= start && txDate <= end;
      });
    }

    return [...list].sort((a, b) => {
      const dateA = a.transactionDate || "";
      const dateB = b.transactionDate || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);

      const timeA = a.transactionTime || "";
      const timeB = b.transactionTime || "";
      if (timeA !== timeB) return timeB.localeCompare(timeA);

      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [allTransactions, budget]);

  // Calculations
  const budgetAmount = budget?.amount || 0;
  const spent = useMemo(
    () => matchedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [matchedTransactions]
  );
  // Calculate today's total spending
  const todaySpent = useMemo(() => {
    if (!todayStr) return 0;
    return allTransactions.reduce((sum, tx) => {
      const txDate = (tx.transactionDate || "").slice(0, 10);
      return txDate === todayStr ? sum + tx.amount : sum;
    }, 0);
  }, [allTransactions, todayStr]);

  // Dashboard Table Pagination (5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(matchedTransactions.length / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return matchedTransactions.slice(startIdx, startIdx + itemsPerPage);
  }, [matchedTransactions, currentPage, itemsPerPage]);

  const remaining = Math.max(0, budgetAmount - spent);
  const isOverBudget = spent > budgetAmount && budgetAmount > 0;
  const percentageUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

  // Days calculations
  const { totalDays, daysRemaining, statusText, isUpcoming, isExpired } = useMemo(() => {
    if (!budget?.startDate || !budget?.endDate || !todayStr) {
      return { totalDays: 1, daysRemaining: 0, statusText: "ไม่ได้กำหนดช่วงวัน", isUpcoming: false, isExpired: false };
    }
    const s = new Date(budget.startDate).getTime();
    const e = new Date(budget.endDate).getTime();
    const t = new Date(todayStr).getTime();

    const total = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);

    if (todayStr > budget.endDate) {
      return { totalDays: total, daysRemaining: 0, statusText: "สิ้นสุดช่วงงบแล้ว", isUpcoming: false, isExpired: true };
    }
    if (todayStr < budget.startDate) {
      const diffStart = Math.ceil((s - t) / (1000 * 60 * 60 * 24));
      return {
        totalDays: total,
        daysRemaining: total,
        statusText: `จะเริ่มในอีก ${diffStart} วัน`,
        isUpcoming: true,
        isExpired: false,
      };
    }

    const diffEnd = Math.ceil((e - t) / (1000 * 60 * 60 * 24)) + 1;
    return {
      totalDays: total,
      daysRemaining: Math.max(0, diffEnd),
      statusText: `เหลืออีก ${diffEnd} วัน`,
      isUpcoming: false,
      isExpired: false,
    };
  }, [budget, todayStr]);

  const dailyAllowance = daysRemaining > 0 && remaining > 0 ? remaining / daysRemaining : 0;
  const dailySpentAvg = totalDays > 0 && spent > 0 ? spent / Math.max(1, totalDays - daysRemaining + 1) : 0;

  // Daily chart data for this period
  const dailyChartData = useMemo(() => {
    if (!budget?.startDate || !budget?.endDate) return [];
    const dayMap = new Map<string, number>();

    // Aggregate by day
    for (const tx of matchedTransactions) {
      const d = (tx.transactionDate || "").slice(0, 10);
      if (d) {
        dayMap.set(d, (dayMap.get(d) || 0) + tx.amount);
      }
    }

    // Sort dates
    const dates = Array.from(dayMap.keys()).sort();
    return dates.map((d) => ({
      date: formatThaiDate(d, "d MMM"),
      fullDate: d,
      amount: dayMap.get(d) || 0,
    }));
  }, [matchedTransactions, budget]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-pulse select-none">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-44 bg-slate-200/80 rounded-xl" />
            <div className="h-3.5 w-56 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-10 w-32 bg-slate-200/70 rounded-2xl" />
        </div>

        {/* Hero Card Skeleton */}
        <div className="rounded-3xl bg-linear-to-br from-white via-slate-50 to-blue-50/30 p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100/70" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-8 w-28 bg-slate-200/80 rounded-xl" />
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="h-12 w-64 bg-slate-200/90 rounded-2xl" />
            <div className="h-3.5 w-72 bg-slate-100 rounded" />
          </div>

          {/* Progress bar skeleton */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-100 rounded-full border border-slate-200/70" />
            <div className="flex justify-between">
              <div className="h-2.5 w-8 bg-slate-100 rounded" />
              <div className="h-2.5 w-8 bg-slate-100 rounded" />
              <div className="h-2.5 w-8 bg-slate-100 rounded" />
            </div>
          </div>

          {/* 4 Stats Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-5 w-24 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="space-y-1.5">
            <div className="h-4 w-44 bg-slate-200 rounded" />
            <div className="h-3 w-64 bg-slate-100 rounded" />
          </div>
          <div className="h-40 w-full flex items-end justify-between gap-3 pt-4 px-2">
            {[45, 75, 30, 90, 50, 65, 40, 85, 35, 60, 70, 55].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-slate-100 rounded-t-lg"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Transactions List Skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-24 bg-slate-100 rounded" />
          </div>

          <div className="divide-y divide-slate-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-5 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Notice Banner */}
      {notice && (
        <div
          className={`px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            notice.type === "error"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">แดชบอร์ดภาพรวม</h1>
            <span className="text-[11px] bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200/60">
              โหมดเรียบง่าย
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            วันนี้ {todayStr ? formatThaiDate(todayStr, "EEEEที่ d MMMM yyyy") : ""}
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ บันทึกรายจ่าย</span>
        </Link>
      </div>

      {/* Anonymous Data Safety Alert */}
      {isAnonymous && (
        <div className="p-3.5 bg-linear-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-700 gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">คุณกำลังใช้งานโหมดชั่วคราว (ไม่ระบุตัวตน)</p>
              <p className="text-[11px] text-slate-500">ข้อมูลอาจหายได้หากเบราว์เซอร์มือถือปิดหรือล้างแคช แนะนำเข้าสู่ระบบด้วย Google เพื่อบันทึกข้อมูลถาวร</p>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <UserAuthButton compact />
          </div>
        </div>
      )}

      {/* HERO CARD: การ์ดงบประมาณช่วงปัจจุบัน (Light Theme) */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-white via-slate-50/80 to-blue-50/40 text-slate-900 p-4 sm:p-6 md:p-8 shadow-xs border border-slate-200">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Card Top Row: Period Badge & Action */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    งบประมาณช่วงปัจจุบัน
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isExpired
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : isUpcoming
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {statusText}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {budget?.startDate && budget?.endDate
                      ? `${formatThaiDate(budget.startDate)} – ${formatThaiDate(budget.endDate)} (${totalDays} วัน)`
                      : "ยังไม่ได้กำหนดช่วงเวลา"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs border border-slate-200 transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-600" />
              <span>{budgetAmount > 0 ? "ปรับแก้งบ & ช่วงวัน" : "ตั้งค่างบประมาณ"}</span>
            </button>
          </div>

          {/* Card Middle: Main Remaining Balance */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">งบประมาณคงเหลือ</span>
              {isOverBudget && (
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  เกินงบไป {formatCurrency(spent - budgetAmount)}
                </span>
              )}
            </div>

            <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 flex flex-wrap items-baseline gap-2">
              <span className={isOverBudget ? "text-rose-600" : "text-slate-900"}>
                {formatCurrency(remaining)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                / {formatCurrency(budgetAmount)}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              ใช้จ่ายไปแล้ว{" "}
              <strong className="text-slate-900 font-bold">{formatCurrency(spent)}</strong>{" "}
              ({percentageUsed.toFixed(1)}%) จากรายการที่บันทึกทั้งหมด {matchedTransactions.length} รายการ
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget
                    ? "bg-rose-500"
                    : percentageUsed >= 80
                    ? "bg-amber-500"
                    : "bg-linear-to-r from-blue-500 to-emerald-500"
                }`}
                style={{ width: `${Math.min(100, percentageUsed)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
              <span>0%</span>
              <span>50%</span>
              <span className={isOverBudget ? "text-rose-600 font-bold" : "font-semibold text-slate-600"}>
                {percentageUsed.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* 4 Quick Stat Pill Boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">วันนี้ใช้ไปแล้ว</span>
              <span className="text-sm sm:text-base font-bold text-amber-600 mt-0.5 block">
                {formatCurrency(todaySpent)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">ใช้ไปแล้ว (รวม)</span>
              <span className="text-sm sm:text-base font-bold text-rose-600 mt-0.5 block">
                {formatCurrency(spent)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">งบที่เหลือ</span>
              <span
                className={`text-sm sm:text-base font-bold mt-0.5 block ${
                  remaining > 0 ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {formatCurrency(remaining)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">เฉลี่ยใช้วันละ</span>
              <span className="text-sm sm:text-base font-bold text-blue-600 mt-0.5 block">
                {daysRemaining > 0 && remaining > 0 ? (
                  <>฿{dailyAllowance.toFixed(0)} / วัน</>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DAILY SPENDING CHART (IF DATA AVAILABLE) */}
      {dailyChartData.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">การใช้จ่ายรายวันในช่วงงบนี้</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เฉลี่ยวันละ {formatCurrency(dailySpentAvg)} จากวันที่เกิดรายการ
              </p>
            </div>
          </div>

          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `฿${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any) => [`${formatCurrency(Number(val))}`, "ยอดใช้จ่าย"]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(_: any, payload: any) => {
                    if (payload && payload[0]) {
                      return formatThaiDate(payload[0].payload.fullDate, "d MMMM yyyy");
                    }
                    return "";
                  }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  }}
                />
                <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* RECENT TRANSACTIONS IN THIS PERIOD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">รายการรายจ่ายในช่วงงบนี้</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {matchedTransactions.length > 0 ? (
                <>
                  แสดง {(currentPage - 1) * itemsPerPage + 1} -{" "}
                  {Math.min(currentPage * itemsPerPage, matchedTransactions.length)} จากทั้งหมด{" "}
                  {matchedTransactions.length} รายการ
                </>
              ) : (
                "ยังไม่มีรายการรายจ่ายในช่วงนี้"
              )}
            </p>
          </div>

          <Link
            href="/transactions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 self-start sm:self-auto"
          >
            <span>ดูประวัติทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {matchedTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">ยังไม่มีรายการรายจ่ายในช่วงนี้</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              เมื่อบันทึกรายการรายจ่ายที่มีวันที่อยู่ในช่วงงบนี้ ยอดจะถูกหักออกจากงบประมาณโดยอัตโนมัติ
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>บันทึกรายจ่ายแรก</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100">
              {paginatedTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-3 hover:bg-slate-50/80 rounded-2xl px-2 sm:px-3 -mx-2 sm:-mx-3 transition-colors"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100/70">
                      <Receipt className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                        {tx.title}
                      </h4>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500 mt-0.5 flex-wrap">
                        <span>{formatThaiDate(tx.transactionDate, "d MMM yyyy")}</span>
                        {tx.transactionTime && <span>• {tx.transactionTime} น.</span>}
                        {tx.recipientName && (
                          <span className="truncate max-w-[100px] sm:max-w-[160px] text-slate-400">
                            • ถึง {tx.recipientName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 whitespace-nowrap">
                      -{formatCurrency(tx.amount)}
                    </span>
                    <button
                      onClick={() => setDeleteTarget({ id: tx.id, title: tx.title })}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer touch-manipulation active:scale-95"
                      title="ลบรายการ"
                      aria-label={`ลบรายการ ${tx.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer touch-manipulation active:scale-95"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">ก่อนหน้า</span>
                </button>

                {/* Page Indicator */}
                <div className="flex items-center gap-1">
                  {/* Mobile compact indicator */}
                  <span className="sm:hidden font-medium text-slate-600 text-xs px-2">
                    หน้า {currentPage} จาก {totalPages}
                  </span>

                  {/* Desktop page numbered buttons */}
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => {
                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-xl font-semibold text-xs flex items-center justify-center transition-all cursor-pointer ${
                            isActive
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer touch-manipulation active:scale-95"
                  title="หน้าถัดไป"
                >
                  <span className="hidden sm:inline">ถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EDIT BUDGET MODAL */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <button
              onClick={() => setShowBudgetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-bold text-lg text-slate-900">กำหนดงบประมาณช่วงเวลา</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดวันเริ่มต้น วันสิ้นสุด และจำนวนเงินงบประมาณสำหรับช่วงนี้
              </p>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  จำนวนเงินงบประมาณ (บาท) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={modalAmount}
                    onChange={(e) => {
                      setModalAmount(e.target.value);
                      if (modalFieldErrors.amount) {
                        setModalFieldErrors((p) => ({ ...p, amount: undefined }));
                      }
                    }}
                    className={`w-full pl-8 pr-4 py-2.5 rounded-xl text-base font-bold text-slate-900 transition-colors focus:bg-white focus:outline-hidden ${
                      modalFieldErrors.amount
                        ? "border-2 border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                    }`}
                  />
                </div>
                {modalFieldErrors.amount && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{modalFieldErrors.amount}</span>
                  </p>
                )}
              </div>

              {/* Quick Presets for Date Range */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    ช่วงเวลาที่ใช้งบ
                  </label>
                  <span className="text-[10px] text-slate-400">กดเลือกด่วน:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyPresetDays(7)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    7 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDays(14)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    14 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDays(30)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    30 วัน
                  </button>
                  <button
                    type="button"
                    onClick={applyThisMonthPreset}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer font-semibold"
                  >
                    เดือนนี้ทั้งเดือน
                  </button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันเริ่มต้น
                  </label>
                  <input
                    type="date"
                    required
                    value={modalStartDate}
                    onChange={(e) => {
                      setModalStartDate(e.target.value);
                      if (modalFieldErrors.startDate) {
                        setModalFieldErrors((p) => ({ ...p, startDate: undefined }));
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs text-slate-900 transition-colors focus:bg-white focus:outline-hidden ${
                      modalFieldErrors.startDate
                        ? "border-2 border-rose-400 bg-rose-50/30"
                        : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                    }`}
                  />
                  {modalFieldErrors.startDate && (
                    <p className="text-[10px] text-rose-600 font-medium mt-1">
                      {modalFieldErrors.startDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    วันสิ้นสุด
                  </label>
                  <input
                    type="date"
                    required
                    value={modalEndDate}
                    onChange={(e) => {
                      setModalEndDate(e.target.value);
                      if (modalFieldErrors.endDate) {
                        setModalFieldErrors((p) => ({ ...p, endDate: undefined }));
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs text-slate-900 transition-colors focus:bg-white focus:outline-hidden ${
                      modalFieldErrors.endDate
                        ? "border-2 border-rose-400 bg-rose-50/30"
                        : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                    }`}
                  />
                  {modalFieldErrors.endDate && (
                    <p className="text-[10px] text-rose-600 font-medium mt-1">
                      {modalFieldErrors.endDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingBudget}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSavingBudget ? "กำลังบันทึก..." : "บันทึกงบประมาณ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Transaction Delete */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ยืนยันการลบรายการรายจ่าย"
        description={`คุณต้องการลบรายการ "${deleteTarget?.title}" ใช่หรือไม่? ข้อมูลนี้จะถูกลบถาวรและยอดเงินจะถูกคืนเข้าสู่งบประมาณ`}
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
        variant="danger"
        isLoading={isDeletingTx}
        onConfirm={handleConfirmDeleteTx}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
