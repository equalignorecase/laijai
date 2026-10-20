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
import { ConfirmModal } from "@/components/ui/confirm-modal";
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

  // Inline Validation & Feedback state
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    amount?: string;
    categoryId?: string;
    general?: string;
  }>({});
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // Modal targets for confirmation
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [executeTarget, setExecuteTarget] = useState<RecurringTransaction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

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

  const handleOpenModal = () => {
    setTitle("");
    setAmount("");
    const defaultCat = categories.find((c) => c.type === type && !c.isArchived);
    setCategoryId(defaultCat ? defaultCat.id : "");
    setFrequency("monthly");
    setStartDate(todayStr || getCurrentDateStr());
    setEndDate("");
    setFieldErrors({});
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    const errors: typeof fieldErrors = {};
    if (!title.trim()) {
      errors.title = "กรุณากรอกชื่อรายการประจำ";
    }

    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      errors.amount = "กรุณากรอกจำนวนเงินให้ถูกต้อง (มากกว่า 0)";
    }

    if (!categoryId) {
      errors.categoryId = "กรุณาเลือกหมวดหมู่";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

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
      setFeedbackNotice({
        type: "success",
        message: `สร้างรายการประจำ "${title.trim()}" สำเร็จ`,
      });
      await loadData();
    } catch (err) {
      console.error("Create recurring error:", err);
      setFieldErrors({ general: "เกิดข้อผิดพลาดในการสร้างรายการประจำ" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (item: RecurringTransaction) => {
    if (!uid) return;
    try {
      await updateRecurringTransaction(uid, item.id, { isActive: !item.isActive });
      await loadData();
      setFeedbackNotice({
        type: "success",
        message: item.isActive
          ? `หยุดรายการ "${item.title}" ชั่วคราวแล้ว`
          : `เปิดใช้งานรายการ "${item.title}" เรียบร้อยแล้ว`,
      });
    } catch (err) {
      console.error("Toggle recurring active error:", err);
      setFeedbackNotice({
        type: "error",
        message: "ไม่สามารถเปลี่ยนสถานะรายการได้",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !uid) return;
    setIsDeleting(true);
    try {
      await deleteRecurringTransaction(uid, deleteTarget.id);
      setRecurringList((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setFeedbackNotice({
        type: "success",
        message: `ลบรายการ "${deleteTarget.title}" สำเร็จ`,
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete recurring error:", err);
      setFeedbackNotice({
        type: "error",
        message: "เกิดข้อผิดพลาดในการลบรายการ",
      });
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmExecute = async () => {
    if (!executeTarget || !uid) return;
    setIsExecuting(true);
    try {
      await executeRecurringTransaction(uid, executeTarget);
      setFeedbackNotice({
        type: "success",
        message: `บันทึกรายการ "${executeTarget.title}" (${formatCurrency(executeTarget.amount)}) เป็นธุรกรรมจริงแล้ว!`,
      });
      setExecuteTarget(null);
      await loadData();
    } catch (err) {
      console.error("Execute recurring error:", err);
      setFeedbackNotice({
        type: "error",
        message: "เกิดข้อผิดพลาดในการบันทึกธุรกรรม",
      });
      setExecuteTarget(null);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackNotice && (
        <div
          className={`px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedbackNotice.type === "error"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackNotice.message}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายการประจำ (Recurring)</h1>
          <p className="text-xs text-slate-500 mt-1">
            ตั้งเตือนและบันทึกค่าใช้จ่ายหรือรายได้ที่เกิดขึ้นประจำ เช่น ค่าเช่า ค่าน้ำ ค่าเน็ต เงินเดือน
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
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
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
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
                          onClick={() => setExecuteTarget(item)}
                          className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          title="บันทึกเป็นธุรกรรมจริงทันที"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>บันทึกจริง</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleActive(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title={item.isActive ? "หยุดชั่วคราว" : "เปิดใช้งานต่อ"}
                      >
                        {item.isActive ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>

                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                  placeholder="เช่น ค่าเช่าห้อง, ค่าอินเทอร์เน็ต, Netflix, ค่าผ่อนรถ"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: undefined }));
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs text-slate-900 transition-colors focus:bg-white focus:outline-none ${
                    fieldErrors.title
                      ? "border-2 border-rose-400 bg-rose-50/30 focus:border-rose-500"
                      : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                  }`}
                />
                {fieldErrors.title && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fieldErrors.title}</span>
                  </p>
                )}
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
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: undefined }));
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-900 transition-colors focus:bg-white focus:outline-none ${
                      fieldErrors.amount
                        ? "border-2 border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                    }`}
                  />
                  {fieldErrors.amount && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{fieldErrors.amount}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      if (fieldErrors.categoryId) setFieldErrors((p) => ({ ...p, categoryId: undefined }));
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs text-slate-900 transition-colors focus:bg-white focus:outline-none ${
                      fieldErrors.categoryId
                        ? "border-2 border-rose-400 bg-rose-50/30 focus:border-rose-500"
                        : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                    }`}
                  >
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categories
                      .filter((c) => c.type === type && !c.isArchived)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  {fieldErrors.categoryId && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{fieldErrors.categoryId}</span>
                    </p>
                  )}
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {fieldErrors.general && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.general}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "สร้างรายการประจำ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ยืนยันการลบรายการประจำ"
        description={`คุณต้องการลบรายการประจำ "${deleteTarget?.title}" ใช่หรือไม่? ข้อมูลนี้จะถูกลบถาวร`}
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Execute Confirmation Modal */}
      <ConfirmModal
        isOpen={!!executeTarget}
        title="ยืนยันการบันทึกเป็นธุรกรรมจริง"
        description={`ยืนยันการบันทึก "${executeTarget?.title}" จำนวน ${executeTarget ? formatCurrency(executeTarget.amount) : "฿0.00"} เป็นธุรกรรมจริงของรอบวันที่ ${executeTarget?.nextDueDate ? formatThaiDate(executeTarget.nextDueDate) : ""} หรือไม่?`}
        confirmText="บันทึกธุรกรรม"
        cancelText="ยกเลิก"
        variant="primary"
        isLoading={isExecuting}
        onConfirm={handleConfirmExecute}
        onClose={() => setExecuteTarget(null)}
      />
    </div>
  );
}
