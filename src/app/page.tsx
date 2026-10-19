"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Transaction, Budget } from "@/types";
import { getTransactions } from "@/services/transaction-service";
import { getBudgetsByMonth, computeBudgetStatuses } from "@/services/budget-service";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  formatCurrency,
  formatThaiDate,
  getCurrentYearMonth,
  formatThaiMonth,
} from "@/lib/utils";
import {
  ArrowUpRight,
  Receipt,
  PlusCircle,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Target,
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

export default function DashboardPage() {
  const { uid, categories } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(30);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Calculate previous month string (YYYY-MM)
  const getPreviousMonthStr = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    const prevYear = date.getFullYear();
    const prevMonth = String(date.getMonth() + 1).padStart(2, "0");
    return `${prevYear}-${prevMonth}`;
  };

  useEffect(() => {
    if (!selectedMonth) {
      setSelectedMonth(getCurrentYearMonth());
      return;
    }
    const currentYM = getCurrentYearMonth();
    if (selectedMonth === currentYM) {
      setDaysCount(new Date().getDate());
    } else {
      setDaysCount(30);
    }

    if (!uid) return;

    const loadDashboardData = async () => {
      try {
        const prevMonth = getPreviousMonthStr(selectedMonth);

        const [currTx, prevTx, monthBudgets] = await Promise.all([
          getTransactions(uid, { month: selectedMonth }),
          getTransactions(uid, { month: prevMonth }),
          getBudgetsByMonth(uid, selectedMonth),
        ]);

        setTransactions(currTx.filter((t) => t.type === "expense"));
        setPrevMonthTransactions(prevTx.filter((t) => t.type === "expense"));
        setBudgets(monthBudgets);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      }
    };

    loadDashboardData();
  }, [uid, selectedMonth]);

  // Calculations
  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);
  const prevTotalExpense = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Daily average calculation
  const dailyAverage = totalExpense > 0 ? totalExpense / Math.max(1, daysCount) : 0;

  // Month-over-month expense change %
  let expenseMoMPercent: number | null = null;
  if (prevTotalExpense > 0) {
    expenseMoMPercent = ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100;
  }

  // Expenses grouped by Category for Pie Chart
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
  const daysInMonth = 31;
  const dailyMap = new Map<string, { day: string; expense: number }>();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, "0");
    dailyMap.set(dayStr, { day: dayStr, expense: 0 });
  }

  for (const t of transactions) {
    const dayPart = t.transactionDate.split("-")[2];
    if (dayPart && dailyMap.has(dayPart)) {
      const entry = dailyMap.get(dayPart)!;
      entry.expense += t.amount;
    }
  }

  const dailyChartData = Array.from(dailyMap.values());

  // Budget Status calculation
  const budgetStatuses = computeBudgetStatuses(budgets, transactions, categories);
  const totalAllocatedBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalBudgetSpent = budgetStatuses.reduce((sum, b) => sum + b.spent, 0);
  const totalBudgetRemaining = Math.max(0, totalAllocatedBudget - totalBudgetSpent);
  const totalBudgetPercent =
    totalAllocatedBudget > 0 ? (totalBudgetSpent / totalAllocatedBudget) * 100 : 0;

  // Recent 5 transactions
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Bar with Month Selector & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ภาพรวมรายจ่าย</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ติดตามและควบคุมค่าใช้จ่ายประจำเดือน {formatThaiMonth(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden"
          />

          <Link
            href="/transactions/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all shadow-blue-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>บันทึกรายจ่าย</span>
          </Link>
        </div>
      </div>

      {/* 4 Cards: 1) รายจ่ายเดือนนี้ 2) เฉลี่ยต่อวัน 3) เทียบเดือนก่อน 4) งบประมาณคงเหลือ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รายจ่ายรวมเดือนนี้</span>
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
            คำนวณจาก {daysCount} วันที่ผ่านมา
          </p>
        </div>

        {/* Card 3: Month-over-Month Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">เทียบกับเดือนก่อน</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                expenseMoMPercent !== null && expenseMoMPercent > 0
                  ? "bg-rose-50 text-rose-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {expenseMoMPercent !== null && expenseMoMPercent > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {expenseMoMPercent !== null
              ? `${expenseMoMPercent > 0 ? "+" : ""}${expenseMoMPercent.toFixed(1)}%`
              : "0%"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {prevTotalExpense > 0
              ? `เดือนก่อนจ่ายไป ${formatCurrency(prevTotalExpense)}`
              : "ไม่มีข้อมูลเดือนก่อน"}
          </p>
        </div>

        {/* Card 4: Remaining Budget */}
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
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Expense Bar Chart with Average Line */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">รายจ่ายรายวัน</h3>
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
                  labelFormatter={(day) => `วันที่ ${day} ${formatThaiMonth(selectedMonth)}`}
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
          </div>
        </div>

        {/* Expense by Category Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="mb-2">
            <h3 className="font-bold text-sm text-slate-900">สัดส่วนตามหมวดหมู่</h3>
            <p className="text-xs text-slate-400">
              {topExpenseCategory
                ? `ใช้จ่ายสูงสุด: ${topExpenseCategory.name} (${formatCurrency(topExpenseCategory.value)})`
                : "ยังไม่มีรายจ่ายในเดือนนี้"}
            </p>
          </div>

          {categoryChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <PieChartIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs">ไม่มีข้อมูลรายจ่ายในเดือนนี้</p>
            </div>
          ) : (
            <div className="flex-1 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
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
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & Budget Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">รายจ่ายล่าสุด</h3>
              <p className="text-xs text-slate-400">5 รายการล่าสุดที่ถูกบันทึก</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>ดูทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <span>ยังไม่มีรายจ่ายในเดือนนี้</span>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((t) => {
                const cat = categoryMap.get(t.categoryId);

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        name={cat?.icon || "CircleDot"}
                        color={cat?.color || "#64748B"}
                        size={16}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">{t.title}</span>
                          {t.source === "receipt_ai" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>AI</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {formatThaiDate(t.transactionDate)} • {cat?.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-900">
                        {formatCurrency(t.amount)}
                      </span>
                      {t.recipientName && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[120px]">
                          {t.recipientName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Budget Status Watchlist */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">การควบคุมงบประมาณ</h3>
              <p className="text-xs text-slate-400">สถานะงบประมาณรายหมวดหมู่</p>
            </div>
            <Link
              href="/budgets"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>จัดการ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {budgetStatuses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <PieChartIcon className="w-8 h-8 mx-auto opacity-30" />
              <p>ยังไม่มีการตั้งงบประมาณสำหรับเดือนนี้</p>
              <Link
                href="/budgets"
                className="inline-block text-xs font-semibold text-blue-600 hover:underline"
              >
                + ตั้งงบประมาณแรก
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetStatuses.map((item) => (
                <div key={item.budget.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      {item.category?.name || "หมวดหมู่"}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(item.spent)}{" "}
                      <span className="text-slate-400 font-normal">
                        / {formatCurrency(item.allocated)}
                      </span>
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.isOverBudget
                          ? "bg-rose-500"
                          : item.isWarning
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${Math.min(item.percentageUsed, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
