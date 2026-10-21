"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Transaction } from "@/types";
import {
  getTransactions,
  deleteTransaction,
} from "@/services/transaction-service";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  formatCurrency,
  formatThaiDate,
  getCurrentDateStr,
} from "@/lib/utils";
import {
  PlusCircle,
  Search,
  Trash2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Calendar,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type RangePreset = "all" | "30days" | "7days" | "this_month" | "custom";

export default function TransactionsPage() {
  const { uid, categories } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Range and filter states
  const [rangePreset, setRangePreset] = useState<RangePreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Confirm delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Check URL query param ?month= or ?preset=
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("month");
      if (m) {
        setStartDate(`${m}-01`);
        setEndDate(`${m}-31`);
        setRangePreset("custom");
      }
    }
  }, []);

  const computePresetRange = (preset: RangePreset): { start: string; end: string } => {
    const today = getCurrentDateStr();
    const todayDate = new Date(today);

    if (preset === "7days") {
      const past7 = new Date(todayDate);
      past7.setDate(past7.getDate() - 6);
      return { start: past7.toISOString().split("T")[0], end: today };
    }
    if (preset === "30days") {
      const past30 = new Date(todayDate);
      past30.setDate(past30.getDate() - 29);
      return { start: past30.toISOString().split("T")[0], end: today };
    }
    if (preset === "this_month") {
      const [year, month] = today.split("-").map(Number);
      const first = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const last = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { start: first, end: last };
    }
    return { start: "", end: "" };
  };

  const handleSelectPreset = (preset: RangePreset) => {
    setRangePreset(preset);
    setCurrentPage(1);
    if (preset !== "custom") {
      const { start, end } = computePresetRange(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await getTransactions(uid);
      const expenses = list.filter((t) => t.type === "expense");
      setAllTransactions(expenses);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [uid]);

  useEffect(() => {
    const handleFocus = () => {
      if (uid) {
        loadData();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [uid]);

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!uid || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(uid, deleteTarget.id);
      setAllTransactions((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter transactions by date range
  const dateFiltered = useMemo(() => {
    return allTransactions.filter((tx) => {
      const txDate = (tx.transactionDate || "").slice(0, 10);
      if (startDate && txDate && txDate < startDate) return false;
      if (endDate && txDate && txDate > endDate) return false;
      return true;
    });
  }, [allTransactions, startDate, endDate]);

  // Filter and Search logic
  const filteredList = useMemo(() => {
    return dateFiltered.filter((tx) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchRecipient = tx.recipientName?.toLowerCase().includes(q);
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchRef = tx.referenceNumber?.toLowerCase().includes(q);
        if (!matchTitle && !matchRecipient && !matchDesc && !matchRef) return false;
      }
      return true;
    });
  }, [dateFiltered, searchQuery]);

  // Sort logic
  const sortedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      if (sortBy === "date_desc") return (b.transactionDate || "").localeCompare(a.transactionDate || "");
      if (sortBy === "date_asc") return (a.transactionDate || "").localeCompare(b.transactionDate || "");
      if (sortBy === "amount_desc") return b.amount - a.amount;
      if (sortBy === "amount_asc") return a.amount - b.amount;
      return 0;
    });
  }, [filteredList, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(sortedList.length / itemsPerPage) || 1;
  const paginatedList = sortedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalExpense = filteredList.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รายการรายจ่าย</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ค้นหา ตรวจสอบ และจัดการประวัติรายจ่ายตามช่วงวันที่ต้องการ
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Link
            href="/reports"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ส่งออกรายงาน</span>
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all shadow-blue-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มรายการใหม่</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Preset Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">ช่วงวัน:</span>
            <button
              onClick={() => handleSelectPreset("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rangePreset === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด ({allTransactions.length})
            </button>
            <button
              onClick={() => handleSelectPreset("30days")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rangePreset === "30days"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              30 วันล่าสุด
            </button>
            <button
              onClick={() => handleSelectPreset("7days")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rangePreset === "7days"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => handleSelectPreset("this_month")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rangePreset === "this_month"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              เดือนนี้
            </button>
            <button
              onClick={() => setRangePreset("custom")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rangePreset === "custom"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              กำหนดเอง ➔
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400">จาก</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangePreset("custom");
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white focus:outline-hidden"
            />
            <span className="text-[11px] text-slate-400">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangePreset("custom");
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Search & Sorting */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Search box */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              ค้นหารายการ
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ชื่อรายการ, ผู้รับ, เลขอ้างอิง..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              เรียงลำดับ
            </label>
            <select
              value={sortBy}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            >
              <option value="date_desc">วันที่ (ล่าสุดก่อน)</option>
              <option value="date_asc">วันที่ (เก่าสุดก่อน)</option>
              <option value="amount_desc">ยอดเงิน (มากไปน้อย)</option>
              <option value="amount_asc">ยอดเงิน (น้อยไปมาก)</option>
            </select>
          </div>
        </div>

        {/* Summary info */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            พบ <strong>{filteredList.length}</strong> รายการ
            {startDate && endDate && (
              <span className="text-slate-400 ml-1">
                ({formatThaiDate(startDate)} – {formatThaiDate(endDate)})
              </span>
            )}
          </span>
          <span>
            รวมยอดใช้จ่าย:{" "}
            <strong className="text-slate-900 font-bold text-sm">
              {formatCurrency(totalExpense)}
            </strong>
          </span>
        </div>
      </div>

      {/* Transaction Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-14 text-center text-xs text-slate-400">กำลังโหลดรายการ...</div>
        ) : sortedList.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-base">ไม่พบรายการรายจ่ายในช่วงที่เลือก</p>
              <p className="text-xs text-slate-400 mt-1">
                ลองกดปุ่ม &quot;ทั้งหมด (All Time)&quot; หรือเลือกช่วงวันที่ครอบคลุมรายการของคุณ
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handleSelectPreset("all")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                ดูทั้งหมด ({allTransactions.length} รายการ)
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ เพิ่มรายการใหม่</span>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Mobile View: Transaction Cards (No horizontal scroll needed) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedList.map((tx) => (
                <div key={tx.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm text-slate-900 truncate">{tx.title}</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatThaiDate(tx.transactionDate, "d MMM yyyy")}</span>
                        {tx.transactionTime && <span>• {tx.transactionTime} น.</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-slate-900 whitespace-nowrap">
                        -{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pt-0.5">
                    <div className="truncate text-[11px] text-slate-500 flex-1 min-w-0">
                      {tx.recipientName || tx.merchantName ? (
                        <span>ถึง {tx.recipientName || tx.merchantName}</span>
                      ) : tx.description ? (
                        <span className="text-slate-400">{tx.description}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                      {tx.referenceNumber && (
                        <span className="font-mono text-[10px] text-slate-400 ml-1.5">
                          #{tx.referenceNumber.slice(-6)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(tx.id, tx.title)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">วันที่ / เวลา</th>
                    <th className="py-3 px-4">รายการ</th>
                    <th className="py-3 px-4">ผู้รับ / ร้านค้า / หมายเหตุ</th>
                    <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((tx) => {
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <div className="font-medium text-slate-900">
                            {formatThaiDate(tx.transactionDate, "d MMM yyyy")}
                          </div>
                          {tx.transactionTime && (
                            <div className="text-[11px] text-slate-400">{tx.transactionTime} น.</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{tx.title}</div>
                          {tx.referenceNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Ref: {tx.referenceNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div>{tx.recipientName || tx.merchantName || "-"}</div>
                          {tx.description && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{tx.description}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          -{formatCurrency(tx.amount)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDelete(tx.id, tx.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500">
                <span>
                  หน้า {currentPage} จาก {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deleting Transaction */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ยืนยันการลบรายการ"
        description={`คุณต้องการลบรายการ "${deleteTarget?.title}" ใช่หรือไม่? ข้อมูลนี้จะถูกลบถาวร`}
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
