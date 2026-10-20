"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Transaction } from "@/types";
import { getTransactions } from "@/services/transaction-service";
import { exportToCSV, exportToExcel } from "@/services/report-service";
import {
  formatCurrency,
  formatThaiDate,
  getCurrentDateStr,
} from "@/lib/utils";
import {
  FileSpreadsheet,
  Download,
  AlertCircle,
  X,
} from "lucide-react";

export default function ReportsPage() {
  const { uid, categories } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters: default to current month range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [isExporting, setIsExporting] = useState(false);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await getTransactions(uid, {
        startDate,
        endDate,
        categoryId: filterCategory === "all" ? undefined : filterCategory,
      });
      setTransactions(list.filter((t) => t.type === "expense"));
    } catch (err) {
      console.error("Failed to load report transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(firstDay);
      setEndDate(getCurrentDateStr());
      return;
    }
    loadData();
  }, [uid, startDate, endDate, filterCategory]);

  // Calculations
  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate day difference for average
  let dayDiff = 1;
  if (startDate && endDate) {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    dayDiff = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  }
  const dailyAverage = totalExpense > 0 ? totalExpense / dayDiff : 0;

  // Find top expense category
  const catSums = new Map<string, number>();
  for (const t of transactions) {
    catSums.set(t.categoryId, (catSums.get(t.categoryId) || 0) + t.amount);
  }
  let topCatName = "-";
  let maxCatAmount = 0;
  for (const [catId, sum] of catSums.entries()) {
    if (sum > maxCatAmount) {
      maxCatAmount = sum;
      topCatName = categoryMap.get(catId)?.name || "-";
    }
  }

  const [exportNotice, setExportNotice] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const handleExportCSV = () => {
    setIsExporting(true);
    setExportNotice(null);
    try {
      exportToCSV(transactions, categories, `expense-report-${startDate}-to-${endDate}.csv`);
      setExportNotice({
        type: "success",
        message: "ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว",
      });
    } catch (err) {
      console.error("Export CSV error:", err);
      setExportNotice({
        type: "error",
        message: "เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setExportNotice(null);
    try {
      await exportToExcel(
        transactions,
        categories,
        `expense-report-${startDate}-to-${endDate}.xlsx`,
        `รายงานสรุปค่าใช้จ่าย (${startDate} ถึง ${endDate})`
      );
      setExportNotice({
        type: "success",
        message: "สร้างและดาวน์โหลดไฟล์ Excel (.xlsx) สำเร็จแล้ว",
      });
    } catch (err) {
      console.error("Export Excel error:", err);
      setExportNotice({
        type: "error",
        message: "เกิดข้อผิดพลาดในการสร้างไฟล์ Excel (.xlsx)",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Notice Banner */}
      {exportNotice && (
        <div
          className={`px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            exportNotice.type === "error"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportNotice.message}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายงานสรุปค่าใช้จ่าย</h1>
          <p className="text-xs text-slate-500 mt-1">
            สรุปข้อมูลรายจ่ายตามช่วงเวลา พร้อมส่งออกไฟล์ Excel และ CSV ภาษาไทย
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={isExporting || transactions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ดาวน์โหลด CSV (UTF-8)</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExporting || transactions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all shadow-emerald-600/30 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ดาวน์โหลด Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              หมวดหมู่รายจ่าย
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">รายจ่ายรวมทั้งหมด</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">ในช่วงเวลาที่เลือก</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">เฉลี่ยต่อวัน</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrency(dailyAverage)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">รวมระยะเวลา {dayDiff} วัน</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">จำนวนรายการ</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{transactions.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">รายการรายจ่าย</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">หมวดหมู่ที่จ่ายมากสุด</span>
          <p className="text-lg font-bold text-slate-900 mt-1 truncate">
            {topCatName}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {maxCatAmount > 0 ? formatCurrency(maxCatAmount) : "-"}
          </p>
        </div>
      </div>

      {/* Data Table Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            พรีวิวข้อมูลที่จะส่งออก ({transactions.length} รายการ)
          </h3>
          <span className="text-xs text-slate-400">
            {formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">กำลังดึงข้อมูล...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            ไม่พบข้อมูลรายจ่ายในช่วงวันที่และเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">วันที่</th>
                  <th className="py-2.5 px-4">หมวดหมู่</th>
                  <th className="py-2.5 px-4">ชื่อรายการ</th>
                  <th className="py-2.5 px-4">ผู้รับเงิน / ร้านค้า</th>
                  <th className="py-2.5 px-4 text-right">จำนวนเงิน</th>
                  <th className="py-2.5 px-4 text-center">เลขอ้างอิง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => {
                  const cat = categoryMap.get(tx.categoryId);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {formatThaiDate(tx.transactionDate)}
                      </td>
                      <td className="py-2.5 px-4">{cat?.name || "-"}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{tx.title}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {tx.recipientName || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold whitespace-nowrap text-slate-900">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-[10px] text-blue-600">
                        {tx.referenceNumber || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
