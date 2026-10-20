"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Budget, Transaction } from "@/types";
import {
  getAllBudgets,
  saveBudget,
  deleteBudget,
  computeBudgetStatuses,
  BudgetStatusItem,
} from "@/services/budget-service";
import { getTransactions } from "@/services/transaction-service";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  formatCurrency,
  formatThaiDate,
  getCurrentDateStr,
} from "@/lib/utils";
import {
  PieChart,
  PlusCircle,
  AlertTriangle,
  Trash2,
  Calendar,
  CalendarDays,
  Sparkles,
  Layers,
  Clock,
  X,
  Tag,
  CheckCircle2,
  Search,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function BudgetsPage() {
  const { uid, categories } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayStr, setTodayStr] = useState<string>("");

  // Filters & Tabs
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "expired">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form modal & Inline Validation state
  const [showModal, setShowModal] = useState(false);
  const [nameInput, setNameInput] = useState<string>("");
  const [startDateInput, setStartDateInput] = useState<string>("");
  const [endDateInput, setEndDateInput] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [amountInput, setAmountInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    startDate?: string;
    endDate?: string;
    general?: string;
  }>({});

  // Delete confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === "expense" && !c.isArchived);

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [allBudgetsList, allTxList] = await Promise.all([
        getAllBudgets(uid).catch((err) => {
          console.error("Failed to load budgets:", err);
          return [];
        }),
        getTransactions(uid).catch((err) => {
          console.error("Failed to load transactions for budgets:", err);
          return [];
        }),
      ]);

      setBudgets(allBudgetsList);
      setTransactions(allTxList);
    } catch (err) {
      console.error("Failed to load budgets page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTodayStr(getCurrentDateStr());
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

  const handleOpenModal = () => {
    const current = todayStr || getCurrentDateStr();
    setNameInput("");
    setStartDateInput(current);

    // Default +30 days
    const d = new Date(current);
    d.setDate(d.getDate() + 30);
    const endStr = d.toISOString().split("T")[0];
    setEndDateInput(endStr);

    setSelectedCategory("all");
    setAmountInput("");
    setFieldErrors({});
    setShowModal(true);
  };

  const applyPresetDays = (days: number) => {
    const start = startDateInput || todayStr || getCurrentDateStr();
    const d = new Date(start);
    d.setDate(d.getDate() + days);
    setEndDateInput(d.toISOString().split("T")[0]);
  };

  const applyThisMonthPreset = () => {
    const current = todayStr || getCurrentDateStr();
    const [year, month] = current.split("-").map(Number);
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;
    setStartDateInput(firstDay);
    setEndDateInput(lastDay);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    const errors: typeof fieldErrors = {};

    const num = parseFloat(amountInput);
    if (isNaN(num) || num <= 0) {
      errors.amount = "กรุณากรอกงบประมาณเป็นจำนวนเงินที่มากกว่า 0";
    }

    if (!startDateInput) {
      errors.startDate = "กรุณาระบุวันเริ่มต้น";
    }
    if (!endDateInput) {
      errors.endDate = "กรุณาระบุวันสิ้นสุด";
    }
    if (startDateInput && endDateInput && startDateInput > endDateInput) {
      errors.endDate = "วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      await saveBudget(uid, {
        name: nameInput.trim() || undefined,
        categoryId: selectedCategory,
        startDate: startDateInput,
        endDate: endDateInput,
        amount: num,
      });

      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error("Save budget error:", err);
      setFieldErrors({ general: "เกิดข้อผิดพลาดในการบันทึกงบประมาณ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, label: string) => {
    setDeleteTarget({ id, label });
  };

  const handleConfirmDelete = async () => {
    if (!uid || !deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBudget(uid, deleteTarget.id);
      setBudgets((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete budget error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute all budget statuses
  const allStatuses = computeBudgetStatuses(budgets, transactions, categories, todayStr);

  // Active budgets
  const activeStatuses = allStatuses.filter((item) => item.status === "active");
  const upcomingStatuses = allStatuses.filter((item) => item.status === "upcoming");
  const expiredStatuses = allStatuses.filter((item) => item.status === "expired");

  // Top summary calculations based on active budgets (or all if none active)
  const targetSummaryList = activeStatuses.length > 0 ? activeStatuses : allStatuses;
  const totalAllocated = targetSummaryList.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = targetSummaryList.reduce((s, b) => s + b.spent, 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);

  // Filtered list for display
  const displayedStatuses = allStatuses.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all") {
      if (categoryFilter === "all_cats" && !item.isAllCategories) return false;
      if (categoryFilter !== "all_cats" && item.budget.categoryId !== categoryFilter) return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = item.budget.name?.toLowerCase().includes(q);
      const matchCat = item.category?.name?.toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">จัดการงบประมาณ</h1>
          <p className="text-xs text-slate-500 mt-1">
            กำหนดวงเงินตามช่วงวันและกิจกรรมที่ต้องการ คุมค่าใช้จ่ายได้ยืดหยุ่นตามใจคุณ
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ ตั้งงบประมาณใหม่</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {activeStatuses.length > 0 ? "งบที่กำลังใช้งาน" : "งบประมาณทั้งหมด"}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {activeStatuses.length} รายการกำลังใช้งาน
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatCurrency(totalAllocated)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            คำนวณจากงบประมาณที่มีผลในปัจจุบัน
          </p>
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

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              กำลังใช้งาน ({activeStatuses.length})
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-blue-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ทั้งหมด ({allStatuses.length})
            </button>
            <button
              onClick={() => setStatusFilter("upcoming")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "upcoming"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              เร็ว ๆ นี้ ({upcomingStatuses.length})
            </button>
            <button
              onClick={() => setStatusFilter("expired")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "expired"
                  ? "bg-white text-slate-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              สิ้นสุดแล้ว ({expiredStatuses.length})
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหางบประมาณ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 hover:bg-white focus:outline-hidden w-40 sm:w-52"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white focus:outline-hidden"
            >
              <option value="all">ทุกหมวดหมู่</option>
              <option value="all_cats">รวมทุกหมวด (All)</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budgets List */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">กำลังโหลดงบประมาณ...</div>
        ) : displayedStatuses.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">
                {statusFilter === "active"
                  ? "ไม่มีงบประมาณที่กำลังใช้งานอยู่ในขณะนี้"
                  : "ไม่พบงบประมาณที่ค้นหา"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                กำหนดงบประมาณระบุวันเริ่มต้นถึงวันสิ้นสุด เช่น ทริปเที่ยว คุมอาหารประจำสัปดาห์ หรือคุมใช้จ่าย 1 เดือน
              </p>
            </div>
            <button
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างงบประมาณใหม่</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {displayedStatuses.map((item) => {
              const statusBadge =
                item.status === "active" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>กำลังใช้งาน</span>
                  </span>
                ) : item.status === "upcoming" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    <Clock className="w-3 h-3" />
                    <span>เร็ว ๆ นี้</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                    <span>สิ้นสุดแล้ว</span>
                  </span>
                );

              return (
                <div
                  key={item.budget.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-3.5 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {item.isAllCategories ? (
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Layers className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="shrink-0 mt-0.5">
                          <CategoryIcon
                            name={item.category?.icon || "CircleDot"}
                            color={item.category?.color || "#3B82F6"}
                            size={20}
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">
                            {item.budget.name || (item.isAllCategories ? "งบรวมทุกหมวดหมู่" : item.category?.name)}
                          </h4>
                          {statusBadge}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {item.budget.startDate ? formatThaiDate(item.budget.startDate) : ""}{" "}
                              –{" "}
                              {item.budget.endDate ? formatThaiDate(item.budget.endDate) : ""}
                            </span>
                          </span>

                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>{item.isAllCategories ? "รวมทุกหมวดหมู่" : item.category?.name}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleDelete(
                          item.budget.id,
                          item.budget.name || item.category?.name || "งบประมาณ"
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ลบงบประมาณ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">
                        ใช้ไปแล้ว <strong className="text-slate-900">{formatCurrency(item.spent)}</strong> / วงเงิน {formatCurrency(item.allocated)}
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

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
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

                  {/* Remaining / Over-budget Alert */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      คงเหลือ {formatCurrency(item.remaining)}
                    </span>
                    {item.isOverBudget && (
                      <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        เกินงบ {formatCurrency(item.spent - item.allocated)}
                      </span>
                    )}
                    {item.isWarning && !item.isOverBudget && (
                      <span className="text-amber-600 font-semibold text-[11px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ใกล้เต็มงบแล้ว ({">"}80%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Budget (Custom Date Range) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">ตั้งงบประมาณใหม่</h3>
                  <p className="text-xs text-slate-400">กำหนดช่วงวัน หมวดหมู่ และวงเงินที่ต้องการคุม</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              {/* Budget Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อเป้าหมาย / งบประมาณ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ค่ากินสัปดาห์นี้, ทริปเที่ยว, งบประจำเดือน"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมวดหมู่ค่าใช้จ่าย
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">🌟 รวมทุกหมวดหมู่ (All - หักทุกค่าใช้จ่าย)</option>
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  แนะนำเลือก &quot;รวมทุกหมวดหมู่&quot; หากต้องการคุมยอดใช้จ่ายโดยรวมทั้งหมด
                </p>
              </div>

              {/* Date Range with Quick Preset Chips */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  ช่วงวันที่ต้องการคุมงบ (เริ่มต้น – สิ้นสุด)
                </label>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <span className="text-[11px] text-slate-400 mr-1">ปุ่มลัด:</span>
                  <button
                    type="button"
                    onClick={() => applyPresetDays(7)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    +7 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDays(15)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    +15 วัน
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDays(30)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    +30 วัน
                  </button>
                  <button
                    type="button"
                    onClick={applyThisMonthPreset}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    เดือนนี้
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 mb-1 block">วันเริ่มต้น</span>
                    <input
                      type="date"
                      value={startDateInput}
                      onChange={(e) => {
                        setStartDateInput(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, startDate: undefined, endDate: undefined }));
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium text-slate-900 focus:outline-hidden ${
                        fieldErrors.startDate
                          ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                          : "border-slate-200 focus:border-blue-500"
                      }`}
                    />
                    {fieldErrors.startDate && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">
                        {fieldErrors.startDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 mb-1 block">วันสิ้นสุด</span>
                    <input
                      type="date"
                      value={endDateInput}
                      onChange={(e) => {
                        setEndDateInput(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium text-slate-900 focus:outline-hidden ${
                        fieldErrors.endDate
                          ? "border-rose-400 bg-rose-50/30 focus:border-rose-500"
                          : "border-slate-200 focus:border-blue-500"
                      }`}
                    />
                    {fieldErrors.endDate && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">
                        {fieldErrors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วงเงินงบประมาณ (บาท)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ฿
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, amount: undefined }));
                    }}
                    className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-1 ${
                      fieldErrors.amount
                        ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-400"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                  />
                </div>
                {fieldErrors.amount && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    {fieldErrors.amount}
                  </p>
                )}
              </div>

              {/* General error message if any */}
              {fieldErrors.general && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.general}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกงบประมาณ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ยืนยันการลบงบประมาณ"
        description={`คุณต้องการลบงบประมาณ "${deleteTarget?.label}" ใช่หรือไม่? ข้อมูลนี้จะถูกลบถาวร`}
        confirmText="ลบงบประมาณ"
        cancelText="ยกเลิก"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
