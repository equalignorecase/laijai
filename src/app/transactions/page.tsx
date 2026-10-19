"use client";

import React, { useEffect, useState } from "react";
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
  getCurrentYearMonth,
  formatThaiMonth,
} from "@/lib/utils";
import {
  PlusCircle,
  Search,
  Trash2,
  Sparkles,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";

export default function TransactionsPage() {
  const { uid, categories } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await getTransactions(uid, {
        month: selectedMonth,
      });
      setTransactions(list.filter((t) => t.type === "expense"));
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedMonth) {
      setSelectedMonth(getCurrentYearMonth());
      return;
    }
    loadData();
  }, [uid, selectedMonth]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`คุณต้องการลบรายการ "${title}" ใช่หรือไม่?`)) return;
    if (!uid) return;

    try {
      await deleteTransaction(uid, id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      alert("ไม่สามารถลบรายการได้");
    }
  };

  // Filter and Search logic
  const filteredList = transactions.filter((tx) => {
    if (filterCategory !== "all" && tx.categoryId !== filterCategory) return false;
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

  // Sort logic
  const sortedList = [...filteredList].sort((a, b) => {
    if (sortBy === "date_desc") return b.transactionDate.localeCompare(a.transactionDate);
    if (sortBy === "date_asc") return a.transactionDate.localeCompare(b.transactionDate);
    if (sortBy === "amount_desc") return b.amount - a.amount;
    if (sortBy === "amount_asc") return a.amount - b.amount;
    return 0;
  });

  // Pagination slice
  const totalPages = Math.ceil(sortedList.length / itemsPerPage) || 1;
  const paginatedList = sortedList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายการธุรกรรม</h1>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหา ตรวจสอบ และจัดการประวัติรายรับ-รายจ่ายของคุณ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ส่งออกรายงาน</span>
          </Link>
          <Link
            href="/transactions/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มรายการใหม่</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Month selector */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              เดือนที่แสดง
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* Search box */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              ค้นหารายการ
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ชื่อ, ผู้รับ, เลขอ้างอิง..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              หมวดหมู่รายจ่าย
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort order options */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>พบ {sortedList.length} รายการ</span>

          <div className="flex items-center gap-2">
            <span>เรียงตาม:</span>
            <select
              value={sortBy}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-medium text-slate-700 hover:text-blue-600 focus:outline-hidden"
            >
              <option value="date_desc">วันที่ (ล่าสุดก่อน)</option>
              <option value="date_asc">วันที่ (เก่าสุดก่อน)</option>
              <option value="amount_desc">ยอดเงิน (มากไปน้อย)</option>
              <option value="amount_asc">ยอดเงิน (น้อยไปมาก)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">กำลังโหลดรายการ...</div>
        ) : sortedList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">ยังไม่มีรายการในเดือนนี้</p>
              <p className="text-xs text-slate-400 mt-1">
                คุณสามารถเพิ่มรายการด้วยตนเอง หรืออัปโหลดสลิปธนาคารให้ AI อ่านได้
              </p>
            </div>
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เพิ่มรายการแรก</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">วันที่ / เวลา</th>
                  <th className="py-3 px-4">รายการ & หมวดหมู่</th>
                  <th className="py-3 px-4">ผู้รับ / ผู้โอน / เลขอ้างอิง</th>
                  <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                  <th className="py-3 px-4 text-center">ที่มา</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);
                  const isIncome = tx.type === "income";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 block">
                          {formatThaiDate(tx.transactionDate, "d MMM yyyy")}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {tx.transactionTime || "-"}
                        </span>
                      </td>

                      {/* Title & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <CategoryIcon
                            name={cat?.icon || "CircleDot"}
                            color={cat?.color || "#64748B"}
                            size={16}
                            className="p-2"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {tx.title}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {cat?.name || "ไม่ระบุหมวดหมู่"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Recipient & Ref */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {tx.recipientName ? (
                          <span className="font-medium text-slate-800 block">
                            {tx.recipientName}
                          </span>
                        ) : (
                          <span className="text-slate-400 block">-</span>
                        )}
                        {tx.referenceNumber && (
                          <span className="font-mono text-[10px] text-blue-600 block">
                            Ref: {tx.referenceNumber}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-sm ${
                            isIncome ? "text-emerald-600" : "text-slate-900"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>

                      {/* Source & Duplicate badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {tx.source === "receipt_ai" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            <span>AI OCR</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">บันทึกเอง</span>
                        )}

                        {tx.duplicateStatus === "possible_duplicate" && (
                          <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            อาจซ้ำ
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDelete(tx.id, tx.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
            <span>
              หน้า {currentPage} จาก {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
