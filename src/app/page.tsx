"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Transaction, Budget } from "@/types";
import { getTransactions } from "@/services/transaction-service";
import { getAllBudgets, computeBudgetStatuses } from "@/services/budget-service";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  formatCurrency,
  formatThaiDate,
  getCurrentDateStr,
} from "@/lib/utils";
import {
  ArrowUpRight,
  PlusCircle,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  CalendarDays,
  Target,
  Clock,
  Calendar,
  Layers,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

type RangePreset = "30days" | "7days" | "this_month" | "all" | "custom";

export default function DashboardPage() {
  const { uid, categories } = useAuth();
  const [rangePreset, setRangePreset] = useState<RangePreset>("30days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [prevPeriodTransactions, setPrevPeriodTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const allExpenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense" && !c.isArchived),
    [categories]
  );

  // Helper to compute date range strings based on preset
  const computePresetRange = (preset: RangePreset, baseDate?: string): { start: string; end: string } => {
    const today = baseDate || todayStr || getCurrentDateStr();
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
    if (preset === "all") {
      return { start: "", end: "" };
    }
    return { start: startDate, end: endDate };
  };

  const handleSelectPreset = (preset: RangePreset) => {
    setRangePreset(preset);
    if (preset !== "custom") {
      const { start, end } = computePresetRange(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Initial setup: default to 30 days inside useEffect
  useEffect(() => {
    const today = getCurrentDateStr();
    setTodayStr(today);
    if (!startDate && !endDate && rangePreset === "30days") {
      const { start, end } = computePresetRange("30days", today);
      setStartDate(start);
      setEndDate(end);
    }
  }, []);

  const loadDashboardData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      // 1. Fetch range transactions, all transactions, and all budgets simultaneously
      const [currTx, allTx, allBudgetsList] = await Promise.all([
        getTransactions(uid, {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          type: "expense",
        }),
        getTransactions(uid, { type: "expense" }),
        getAllBudgets(uid),
      ]);

      // 2. Fetch previous period for comparison if date range is defined
      let prevTx: Transaction[] = [];
      if (startDate && endDate) {
        const s = new Date(startDate).getTime();
        const e = new Date(endDate).getTime();
        const diffDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);

        const prevEndD = new Date(startDate);
        prevEndD.setDate(prevEndD.getDate() - 1);
        const prevStartD = new Date(prevEndD);
        prevStartD.setDate(prevStartD.getDate() - (diffDays - 1));

        prevTx = await getTransactions(uid, {
          startDate: prevStartD.toISOString().split("T")[0],
          endDate: prevEndD.toISOString().split("T")[0],
          type: "expense",
        });
      }

      setBudgets(allBudgetsList);
      setTransactions(currTx.filter((t) => t.type === "expense"));
      setAllTransactions(allTx.filter((t) => t.type === "expense"));
      setPrevPeriodTransactions(prevTx.filter((t) => t.type === "expense"));
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) {
      loadDashboardData();
    }
  }, [uid, startDate, endDate]);

  useEffect(() => {
    const handleFocus = () => {
      if (uid) {
        loadDashboardData();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [uid, startDate, endDate]);

  // Calculations
  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);
  const prevTotalExpense = prevPeriodTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Day count for average
  let daysCount = 30;
  if (startDate && endDate) {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    daysCount = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  } else if (transactions.length > 0) {
    const dates = transactions.map((t) => t.transactionDate).filter(Boolean);
    daysCount = Math.max(1, new Set(dates).size);
  }
  const dailyAverage = totalExpense > 0 ? totalExpense / daysCount : 0;

  // Change %
  let expenseChangePercent: number | null = null;
  if (prevTotalExpense > 0) {
    expenseChangePercent = ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100;
  }

  // Category Expense Map for current view
  const categoryExpenseMap = new Map<string, number>();
  for (const t of transactions) {
    const cur = categoryExpenseMap.get(t.categoryId) || 0;
    categoryExpenseMap.set(t.categoryId, cur + t.amount);
  }

  const categoryChartData = Array.from(categoryExpenseMap.entries())
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      return {
        name: cat?.name || "อื่น ๆ",
        value: amount,
        color: cat?.color || "#64748B",
      };
    })
    .sort((a, b) => b.value - a.value);

  const topExpenseCategory = categoryChartData[0] || null;

  // Daily Chart Data
  const dailyChartData = useMemo(() => {
    if (transactions.length === 0) return [];

    const dateMap = new Map<string, number>();
    for (const t of transactions) {
      const d = (t.transactionDate || "").slice(0, 10);
      if (d) {
        dateMap.set(d, (dateMap.get(d) || 0) + t.amount);
      }
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    return sortedDates.map((dateStr) => {
      const parts = dateStr.split("-");
      const label = parts.length === 3 ? `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}` : dateStr;
      return {
        rawDate: dateStr,
        day: label,
        expense: dateMap.get(dateStr) || 0,
      };
    });
  }, [transactions]);

  // Compute budget statuses using allTransactions so budget spending is 100% accurate across full range
  const allBudgetStatuses = computeBudgetStatuses(budgets, allTransactions, categories, todayStr);

  // Total allocated from all budgets the user created (show all, don't hide)
  const totalAllocatedBudget = budgets.reduce((sum, b) => sum + b.amount, 0);

  // Total spent: In simple auto mode, deduct matched budget spending or at least totalExpense in view
  const sumBudgetSpent = allBudgetStatuses.reduce((sum, b) => sum + b.spent, 0);
  const totalBudgetSpent = Math.max(sumBudgetSpent, totalExpense);
  const totalBudgetRemaining = Math.max(0, totalAllocatedBudget - totalBudgetSpent);
  const totalBudgetPercent =
    totalAllocatedBudget > 0 ? (totalBudgetSpent / totalAllocatedBudget) * 100 : 0;

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Range Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ภาพรวมรายจ่าย</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามและควบคุมค่าใช้จ่ายตามช่วงเวลาที่กำหนดเอง
            </p>
          </div>

          <Link
            href="/transactions/new"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all shadow-blue-600/20 self-start md:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ บันทึกรายจ่าย</span>
          </Link>
        </div>

        {/* Date Range Selector Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">ช่วงเวลา:</span>
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
              onClick={() => handleSelectPreset("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                rangePreset === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด (All Time)
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

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangePreset("custom");
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white focus:outline-hidden"
            />
            <span className="text-xs text-slate-400">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangePreset("custom");
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 4 Cards: 1) รายจ่ายรวม 2) เฉลี่ยต่อวัน 3) เทียบช่วงก่อนหน้า 4) งบประมาณคงเหลือ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รายจ่ายรวมช่วงนี้</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalExpense)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            ทั้งหมด {transactions.length} รายการ
          </p>
        </div>

        {/* Card 2: Daily Average */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">เฉลี่ยต่อวัน</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(dailyAverage)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            คำนวณจากช่วง {daysCount} วัน
          </p>
        </div>

        {/* Card 3: Period-over-Period Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">เทียบช่วงก่อนหน้า</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                expenseChangePercent !== null && expenseChangePercent > 0
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {expenseChangePercent !== null && expenseChangePercent > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {expenseChangePercent !== null
              ? `${expenseChangePercent > 0 ? "+" : ""}${expenseChangePercent.toFixed(1)}%`
              : "0%"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {prevTotalExpense > 0
              ? `ช่วงก่อนหน้าจ่ายไป ${formatCurrency(prevTotalExpense)}`
              : "ไม่มีข้อมูลช่วงก่อน"}
          </p>
        </div>

        {/* Card 4: Remaining Budget (Deducts directly) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">งบประมาณคงเหลือ</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span
              className={`text-2xl font-bold ${
                totalAllocatedBudget > 0 && totalBudgetRemaining === 0
                  ? "text-rose-600"
                  : "text-slate-900"
              }`}
            >
              {totalAllocatedBudget > 0 ? formatCurrency(totalBudgetRemaining) : "ยังไม่ตั้งงบ"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalBudgetPercent > 100
                  ? "bg-rose-500"
                  : totalBudgetPercent >= 80
                  ? "bg-amber-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${Math.min(totalBudgetPercent, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalAllocatedBudget > 0
              ? `ใช้ไปแล้ว ${formatCurrency(totalBudgetSpent)} จากงบ ${formatCurrency(totalAllocatedBudget)}`
              : "ยังไม่ได้สร้างงบประมาณ"}
          </p>
        </div>
      </div>

      {/* Charts Section: Daily Trend & Category Breakdown with Full Categories List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Expense Bar Chart with Average Line */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">แนวโน้มรายจ่ายตามวัน</h3>
              <p className="text-xs text-slate-400">
                แท่งแสดงยอดใช้จ่ายรายวัน พร้อมเส้นประเฉลี่ย ({formatCurrency(dailyAverage)}/วัน)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
              <span>รายจ่าย</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {dailyChartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <Calendar className="w-8 h-8 mb-2 opacity-30" />
                <span>ไม่มีรายการรายจ่ายในช่วงเวลานี้</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`฿${Number(value).toLocaleString()}`, "รายจ่าย"]}
                    labelFormatter={(label, items) => {
                      const item = items?.[0]?.payload;
                      return item?.rawDate ? formatThaiDate(item.rawDate) : `วันที่ ${label}`;
                    }}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="expense" fill="#3B82F6" radius={[4, 4, 0, 0]} name="รายจ่าย" />
                  {dailyAverage > 0 && (
                    <ReferenceLine
                      y={dailyAverage}
                      stroke="#F59E0B"
                      strokeDasharray="4 4"
                      label={{
                        value: "เฉลี่ย",
                        fill: "#D97706",
                        fontSize: 10,
                        position: "right",
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense by Category & All User Categories */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-slate-900">สัดส่วนตามหมวดหมู่</h3>
              <Link href="/categories" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                จัดการหมวด ➔
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              {topExpenseCategory
                ? `ใช้จ่ายสูงสุด: ${topExpenseCategory.name} (${formatCurrency(topExpenseCategory.value)})`
                : "หมวดหมู่ทั้งหมดในระบบ"}
            </p>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="py-6 text-center text-slate-400">
              <PieChartIcon className="w-8 h-8 mb-2 mx-auto opacity-30" />
              <p className="text-xs">ยังไม่มียอดใช้จ่ายในช่วงนี้</p>
            </div>
          ) : (
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => [`฿${Number(value).toLocaleString()}`, "ยอดใช้จ่าย"]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All Categories list showing even 0 THB so user always sees created categories */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              หมวดหมู่ทั้งหมดที่คุณมี ({allExpenseCategories.length} หมวด):
            </span>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {allExpenseCategories.map((c) => {
                const spent = categoryExpenseMap.get(c.id) || 0;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-1.5 px-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate mr-1">
                      <CategoryIcon name={c.icon} color={c.color} size={14} />
                      <span className="font-medium text-slate-700 truncate text-[11px]">{c.name}</span>
                    </div>
                    <span className={`font-bold shrink-0 text-[11px] ${spent > 0 ? "text-slate-900" : "text-slate-400"}`}>
                      {formatCurrency(spent)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & All Budgets List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">รายจ่ายล่าสุด</h3>
              <p className="text-xs text-slate-400">5 รายการล่าสุดในช่วงนี้</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              ดูทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs">ยังไม่มีรายการรายจ่ายในช่วงนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((t) => {
                const cat = categoryMap.get(t.categoryId);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        name={cat?.icon || "CircleDot"}
                        color={cat?.color || "#3B82F6"}
                        size={18}
                      />
                      <div>
                        <p className="font-semibold text-slate-800 text-xs">{t.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatThaiDate(t.transactionDate)} • {cat?.name || "ไม่ระบุ"}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-slate-900">
                      -{formatCurrency(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Budgets Widget (Always displays all user budgets!) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">การควบคุมงบประมาณ</h3>
                <p className="text-xs text-slate-400">
                  {allBudgetStatuses.length > 0 ? `พบ ${allBudgetStatuses.length} งบประมาณที่ตั้งไว้` : "สถานะงบประมาณ"}
                </p>
              </div>
              <Link
                href="/budgets"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                จัดการงบ ➔
              </Link>
            </div>

            {allBudgetStatuses.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Target className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">ยังไม่มีงบประมาณที่ตั้งไว้</p>
                <Link
                  href="/budgets"
                  className="inline-block mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  + ตั้งงบประมาณใหม่
                </Link>
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {allBudgetStatuses.map((b) => {
                  // In auto mode, if spent is 0 but totalExpense > 0 and only 1 budget, reflect totalExpense
                  const displaySpent =
                    b.spent > 0 ? b.spent : allBudgetStatuses.length === 1 ? totalExpense : b.spent;
                  const displayRemaining = Math.max(0, b.allocated - displaySpent);
                  const displayPercent = b.allocated > 0 ? (displaySpent / b.allocated) * 100 : 0;

                  return (
                    <div
                      key={b.budget.id}
                      className="p-3 bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-100 space-y-2 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate mr-1">
                          <span className="font-bold text-slate-800 truncate max-w-[130px]">
                            {b.budget.name || (b.isAllCategories ? "รวมทุกหมวดหมู่" : b.category?.name || "งบประมาณ")}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0 text-xs">
                          {formatCurrency(displaySpent)} / {formatCurrency(b.allocated)}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            displaySpent > b.allocated
                              ? "bg-rose-500"
                              : displayPercent >= 80
                              ? "bg-amber-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${Math.min(displayPercent, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span className="text-[10px] text-slate-400">
                          {b.budget.startDate ? formatThaiDate(b.budget.startDate) : ""} –{" "}
                          {b.budget.endDate ? formatThaiDate(b.budget.endDate) : ""}
                        </span>
                        <span className={`font-semibold ${displaySpent > b.allocated ? "text-rose-600" : "text-slate-600"}`}>
                          คงเหลือ {formatCurrency(displayRemaining)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4">
            <Link
              href="/budgets"
              className="w-full block py-2 text-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
            >
              + ตั้งงบประมาณใหม่
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
