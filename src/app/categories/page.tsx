"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Category } from "@/types";
import {
  addCategory,
  updateCategory,
  deleteCategory,
} from "@/services/category-service";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Tags,
  PlusCircle,
  Archive,
  RotateCcw,
  Trash2,
  X,
  Check,
} from "lucide-react";

const AVAILABLE_ICONS = [
  "Utensils",
  "Car",
  "Home",
  "ShoppingBag",
  "Sparkles",
  "Zap",
  "Wifi",
  "HeartPulse",
  "Film",
  "GraduationCap",
  "CreditCard",
  "Wallet",
  "TrendingUp",
  "Briefcase",
  "PiggyBank",
  "Coffee",
  "Music",
  "Gift",
  "Smile",
  "Phone",
  "Book",
  "Plane",
];

const AVAILABLE_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#64748B", // Slate
];

export default function CategoriesPage() {
  const { uid, categories, refreshCategories } = useAuth();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const type = "expense";
  const [icon, setIcon] = useState("ShoppingBag");
  const [color, setColor] = useState("#3B82F6");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayedCategories = categories.filter((c) => c.type === "expense");

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !name.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await addCategory(uid, {
        name: name.trim(),
        type,
        icon,
        color,
      });
      await refreshCategories();
      setShowModal(false);
      setName("");
    } catch (err) {
      console.error("Create category error:", err);
      setErrorMessage("เกิดข้อผิดพลาดในการสร้างหมวดหมู่");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (cat: Category) => {
    if (!uid) return;
    try {
      await updateCategory(uid, cat.id, { isArchived: !cat.isArchived });
      await refreshCategories();
    } catch (err) {
      console.error("Archive category error:", err);
      alert("ไม่สามารถเปลี่ยนสถานะหมวดหมู่ได้");
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`)) return;
    if (!uid) return;

    try {
      const res = await deleteCategory(uid, cat.id);
      if (!res.success) {
        alert(res.error);
        return;
      }
      await refreshCategories();
    } catch (err) {
      console.error("Delete category error:", err);
      alert("เกิดข้อผิดพลาดในการลบหมวดหมู่");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการหมวดหมู่รายจ่าย</h1>
          <p className="text-xs text-slate-500 mt-1">
            ปรับแต่ง เพิ่ม หรือซ่อนหมวดหมู่สำหรับจัดกลุ่มค่าใช้จ่ายของคุณ
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>เพิ่มหมวดหมู่ใหม่</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayedCategories.map((cat) => (
          <div
            key={cat.id}
            className={`p-4 rounded-2xl border transition-all ${
              cat.isArchived
                ? "bg-slate-50/60 border-slate-200 opacity-60"
                : "bg-white border-slate-200 shadow-xs hover:border-blue-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <CategoryIcon name={cat.icon} color={cat.color} size={20} />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleArchive(cat)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  title={cat.isArchived ? "เปิดใช้งานใหม่" : "ซ่อนหมวดหมู่"}
                >
                  {cat.isArchived ? (
                    <RotateCcw className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Archive className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  title="ลบหมวดหมู่"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3">
              <h4 className="font-semibold text-sm text-slate-900">{cat.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                {cat.isDefault && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium">
                    เริ่มต้น
                  </span>
                )}
                {cat.isArchived && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium">
                    ซ่อนอยู่
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
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

            <h3 className="font-bold text-lg text-slate-900 mb-1">เพิ่มหมวดหมู่ใหม่</h3>
            <p className="text-xs text-slate-500 mb-4">กำหนดชื่อ ไอคอน และสีของหมวดหมู่</p>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อหมวดหมู่รายจ่าย
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่ากาแฟ, ช้อปปิ้งออนไลน์, ของใช้สัตว์เลี้ยง"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกสีหมวดหมู่
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกไอคอน
                </label>
                <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                        icon === ic ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <CategoryIcon name={ic} color={icon === ic ? "#FFFFFF" : color} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  {isSubmitting ? "กำลังสร้าง..." : "สร้างหมวดหมู่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
