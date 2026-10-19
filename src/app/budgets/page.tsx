"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Budget, Transaction } from "@/types";
import {
  getBudgetsByMonth,
  upsertBudget,
  deleteBudget,
  computeBudgetStatuses,
  BudgetStatusItem,
} from "@/services/budget-service";
import { getTransactions } from "@/services/transaction-service";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  formatCurrency,
  getCurrentYearMonth,
  formatThaiMonth,
} from "@/lib/utils";
import {
  PieChart,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Calendar,
  Save,
  X,
} from "lucide-react";

export default function BudgetsPage() {
  const { uid, categories } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.isArchived);

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [bList, txList] = await Promise.all([
        getBudgetsByMonth(uid, selectedMonth),
        getTransactions(uid, { month: selectedMonth }),
      ]);
      setBudgets(bList);
      setTransactions(txList);
    } catch (err) {
      console.error("Failed to load budgets:", err);
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

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !selectedCategory) return;
    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) {
      alert("กรุณากรอกงบประมาณเป็นจำนวนเงินที่มากกว่า 0");
      return;
    }

    setIsSaving(true);
    try {
      await upsertBudget(uid, selectedCategory, selectedMonth, num);
      setShowModal(false);
      setAmountInput("");
      await loadData();
    } catch (err) {
      console.error("Save budget error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกงบประมาณ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`คุณต้องการลบงบประมาณของหมวดหมู่ "${catName}" ใช่หรือไม่?`)) return;
    if (!uid) return;
    try {
      await deleteBudget(uid, id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Delete budget error:", err);
      alert("ไม่สามารถลบงบประมาณได้");
    }
  };

  const budgetStatuses = computeBudgetStatuses(budgets, transactions, categories);
  const totalAllocated = budgetStatuses.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = budgetStatuses.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการงบประมาณรายเดือน</h1>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดวงเงินการใช้จ่ายตามหมวดหมู่เพื่อควบคุมวินัยทางการเงิน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden"
          />

          <button
            onClick={() => {
              if (expenseCategories.length > 0) {
                setSelectedCategory(expenseCategories[0].id);
              }
              setAmountInput("");
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ตั้งงบประมาณ</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">งบประมาณที่ตั้งไว้ทั้งหมด</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalAllocated)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">ประจำเดือน {formatThaiMonth(selectedMonth)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">ใช้จ่ายไปแล้วในงบ</span>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalAllocated > 0
              ? `คิดเป็น ${((totalSpent / totalAllocated) * 100).toFixed(1)}% ของงบรวม`
              : "ยังไม่มีงบที่ตั้งไว้"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">งบคงเหลือที่ใช้ได้</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {formatCurrency(totalRemaining)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalSpent > totalAllocated ? "ใช้จ่ายเกินงบรวมแล้ว" : "ยังอยู่ในกรอบงบประมาณ"}
          </p>
        </div>
      </div>

      {/* Budgets List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="font-bold text-base text-slate-900 mb-4">
          รายการงบประมาณตามหมวดหมู่ ({budgetStatuses.length})
        </h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดงบประมาณ...</div>
        ) : budgetStatuses.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <PieChart className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">
              ยังไม่มีการตั้งงบประมาณในเดือน {formatThaiMonth(selectedMonth)}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              กดปุ่ม &quot;ตั้งงบประมาณ&quot; เพื่อกำหนดเพดานการใช้จ่ายในหมวดหมู่อาหาร การเดินทาง ช้อปปิ้ง ฯลฯ
            </p>
            <button
              onClick={() => {
                if (expenseCategories.length > 0) setSelectedCategory(expenseCategories[0].id);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เริ่มตั้งงบประมาณ</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetStatuses.map((item) => (
              <div
                key={item.budget.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      name={item.category?.icon || "CircleDot"}
                      color={item.category?.color || "#3B82F6"}
                      size={18}
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {item.category?.name || "หมวดหมู่"}
                      </h4>
                      <span className="text-xs text-slate-500">
                        งบ {formatCurrency(item.allocated)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        handleDelete(item.budget.id, item.category?.name || "หมวดหมู่")
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="ลบงบประมาณ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-600">
                      ใช้ไปแล้ว {formatCurrency(item.spent)}
                    </span>
                    <span
                      className={`font-bold ${
                        item.isOverBudget
                          ? "text-rose-600"
                          : item.isWarning
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}
                    >
                      {item.percentageUsed.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
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

                {/* Warning message */}
                {item.isOverBudget && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>ใช้เกินงบประมาณไปแล้ว {formatCurrency(item.spent - item.allocated)}</span>
                  </div>
                )}
                {item.isWarning && !item.isOverBudget && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-[11px] font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>ใช้ไปแล้วมากกว่า 80% ของงบที่กำหนด</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for setting/updating budget */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-slate-900 mb-1">ตั้งงบประมาณรายเดือน</h3>
            <p className="text-xs text-slate-500 mb-4">
              กำหนดวงเงินสำหรับเดือน {formatThaiMonth(selectedMonth)}
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกหมวดหมู่รายจ่าย
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  จำนวนเงินงบประมาณ (บาท)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="เช่น 5000"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกงบประมาณ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
