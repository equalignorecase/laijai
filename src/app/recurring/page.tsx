"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { RecurringTransaction } from "@/types";
import {
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  executeRecurringTransaction,
} from "@/services/recurring-service";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  formatCurrency,
  formatThaiDate,
  getCurrentDateStr,
} from "@/lib/utils";
import {
  CalendarSync,
  PlusCircle,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
} from "lucide-react";

export default function RecurringPage() {
  const { uid, categories } = useAuth();
  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const type = "expense";
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayStr, setTodayStr] = useState("");

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await getRecurringTransactions(uid);
      setRecurringList(list);
    } catch (err) {
      console.error("Failed to load recurring:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate) {
      setStartDate(getCurrentDateStr());
    }
    setTodayStr(getCurrentDateStr());
    loadData();
  }, [uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !title.trim()) return;
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      alert("กรุณากรอกจำนวนเงินให้ถูกต้อง");
      return;
    }
    if (!categoryId) {
      alert("กรุณาเลือกหมวดหมู่");
      return;
    }

    setIsSubmitting(true);
    try {
      await addRecurringTransaction(uid, {
        title: title.trim(),
        type,
        amount: num,
        categoryId,
        frequency,
        startDate,
        nextDueDate: startDate,
        endDate: endDate ? endDate : undefined,
        isActive: true,
      });

      setShowModal(false);
      setTitle("");
      setAmount("");
      await loadData();
    } catch (err) {
      console.error("Create recurring error:", err);
      alert("เกิดข้อผิดพลาดในการสร้างรายการประจำ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    if (!uid) return;
    try {
      await updateRecurringTransaction(uid, item.id, { isActive: !item.isActive });
      await loadData();
    } catch (err) {
      console.error("Toggle recurring active error:", err);
    }
  };

  const handleDelete = async (item: RecurringTransaction) => {
    if (!confirm(`คุณต้องการลบรายการประจำ "${item.title}" ใช่หรือไม่?`)) return;
    if (!uid) return;
    try {
      await deleteRecurringTransaction(uid, item.id);
      setRecurringList((prev) => prev.filter((r) => r.id !== item.id));
    } catch (err) {
      console.error("Delete recurring error:", err);
    }
  };

  const handleExecuteNow = async (item: RecurringTransaction) => {
    if (!uid) return;
    if (
      !confirm(
        `ยืนยันการบันทึก "${item.title}" จำนวน ${formatCurrency(item.amount)} เป็นธุรกรรมจริงของรอบวันที่ ${formatThaiDate(item.nextDueDate)} หรือไม่?`
      )
    )
      return;

    try {
      await executeRecurringTransaction(uid, item);
      alert("บันทึกเป็นธุรกรรมจริงเรียบร้อยแล้ว!");
      await loadData();
    } catch (err) {
      console.error("Execute recurring error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกธุรกรรม");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายการประจำ (Recurring)</h1>
          <p className="text-xs text-slate-500 mt-1">
            ตั้งเตือนและบันทึกค่าใช้จ่ายหรือรายได้ที่เกิดขึ้นประจำ เช่น ค่าเช่า ค่าน้ำ ค่าเน็ต เงินเดือน
          </p>
        </div>

        <button
          onClick={() => {
            const firstCat = categories.find((c) => c.type === "expense");
            if (firstCat) setCategoryId(firstCat.id);
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>เพิ่มรายการประจำ</span>
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="font-bold text-base text-slate-900 mb-4">
          รายการประจำทั้งหมด ({recurringList.length})
        </h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">กำลังโหลด...</div>
        ) : recurringList.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <CalendarSync className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">ยังไม่มีรายการประจำ</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              สร้างรายการประจำเพื่อช่วยเตือนและบันทึกค่าบริการรายเดือนได้อย่างสะดวกและไม่ตกหล่น
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
            >
              <PlusCircle className="w-4 h-4" />
              <span>สร้างรายการประจำแรก</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurringList.map((item) => {
              const cat = categoryMap.get(item.categoryId);
              const isDue = item.isActive && item.nextDueDate <= todayStr;
              const freqLabel =
                item.frequency === "weekly"
                  ? "ทุกสัปดาห์"
                  : item.frequency === "yearly"
                  ? "ทุกปี"
                  : "ทุกเดือน";

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    !item.isActive
                      ? "bg-slate-50/60 border-slate-200 opacity-60"
                      : isDue
                      ? "bg-amber-50/50 border-amber-300"
                      : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        name={cat?.icon || "CircleDot"}
                        color={cat?.color || "#3B82F6"}
                        size={18}
                      />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{item.title}</h4>
                        <span className="text-xs text-slate-500">
                          {cat?.name} • {freqLabel}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-bold text-sm ${
                          item.type === "income" ? "text-emerald-600" : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-600">
                        รอบถัดไป: <strong>{formatThaiDate(item.nextDueDate)}</strong>
                      </span>
                      {isDue && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          ถึงกำหนดแล้ว
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.isActive && (
                        <button
                          onClick={() => handleExecuteNow(item)}
                          className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1"
                          title="บันทึกเป็นธุรกรรมจริงทันที"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>บันทึกจริง</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleActive(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                        title={item.isActive ? "หยุดชั่วคราว" : "เปิดใช้งานต่อ"}
                      >
                        {item.isActive ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-slate-900 mb-1">เพิ่มรายการประจำ</h3>
            <p className="text-xs text-slate-500 mb-4">ตั้งค่ารายรับหรือรายจ่ายที่เกิดขึ้นเป็นประจำ</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อรายการรายจ่ายประจำ
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าเช่าห้อง, ค่าอินเทอร์เน็ต, Netflix, ค่าผ่อนรถ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จำนวนเงิน (บาท)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                  >
                    {categories
                      .filter((c) => c.type === type && !c.isArchived)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ความถี่
                  </label>
                  <select
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    value={frequency}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500"
                  >
                    <option value="monthly">ทุกเดือน (Monthly)</option>
                    <option value="weekly">ทุกสัปดาห์ (Weekly)</option>
                    <option value="yearly">ทุกปี (Yearly)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เริ่มรอบแรกวันที่
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500"
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
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "สร้างรายการประจำ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
