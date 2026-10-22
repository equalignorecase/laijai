"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, ADMIN_EMAIL } from "@/context/auth-context";
import { UserProfile } from "@/types";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "@/services/admin-user-service";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Mail,
  UserCheck,
  Receipt,
  ArrowLeft,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() && (request.auth.token.email == 'azzzx30089@gmail.com');
    }

    function isOwner(userId) {
      return isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }

    match /users/{userId} {
      // Admin can list all users; user or admin can get and modify docs
      allow list: if isAdmin();
      allow get, write: if isOwner(userId);

      match /{allChildren=**} {
        allow read, write: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading, signInWithGoogle } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");

  // Notification Banner
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  const handleCopyRules = async () => {
    try {
      await navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formEmail, setFormEmail] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formStatus, setFormStatus] = useState<"active" | "suspended">("active");
  const [formErrors, setFormErrors] = useState<{ email?: string; displayName?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await getAdminUsers();
      setUsers(list);
      setPermissionDenied(false);
    } catch (err: unknown) {
      console.error("Error fetching users:", err);
      const isPermErr =
        (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "permission-denied") ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes("permission") ||
            err.message.toLowerCase().includes("insufficient")));

      if (isPermErr) {
        setPermissionDenied(true);
      } else {
        setNotice({
          type: "error",
          message: "ไม่สามารถดึงข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUsers();
    }
  }, [authLoading, isAdmin]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        u.uid.toLowerCase().includes(q);

      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && u.role === "admin") ||
        (roleFilter === "user" && u.role !== "admin");

      return matchQuery && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Stats
  const totalUsers = users.length;
  const activeGoogleUsers = users.filter((u) => u.email).length;
  const totalTransactionsCount = users.reduce((sum, u) => sum + (u.transactionCount || 0), 0);

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormEmail("");
    setFormDisplayName("");
    setFormRole("user");
    setFormStatus("active");
    setFormErrors({});
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (target: UserProfile) => {
    setEditingUser(target);
    setFormEmail(target.email || "");
    setFormDisplayName(target.displayName || "");
    setFormRole(target.role === "admin" ? "admin" : "user");
    setFormStatus(target.status || "active");
    setFormErrors({});
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof formErrors = {};

    if (!formDisplayName.trim()) {
      errors.displayName = "กรุณากรอกชื่อผู้ใช้";
    }

    if (formEmail && !formEmail.includes("@")) {
      errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (editingUser) {
        // Update existing user
        await updateAdminUser(editingUser.uid, {
          email: formEmail,
          displayName: formDisplayName,
          role: formRole,
          status: formStatus,
        });
        setNotice({
          type: "success",
          message: `อัปเดตข้อมูลผู้ใช้ "${formDisplayName}" สำเร็จแล้ว`,
        });
      } else {
        // Create new user
        await createAdminUser({
          email: formEmail,
          displayName: formDisplayName,
          role: formRole,
          status: formStatus,
        });
        setNotice({
          type: "success",
          message: `สร้างผู้ใช้ "${formDisplayName}" สำเร็จแล้ว`,
        });
      }

      setModalOpen(false);
      await fetchUsers();
    } catch (err: unknown) {
      console.error("Save user error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      setNotice({
        type: "error",
        message: `บันทึกไม่สำเร็จ: ${msg}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User Confirm
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.uid);
      setNotice({
        type: "success",
        message: `ลบผู้ใช้ "${deleteTarget.displayName || deleteTarget.email || deleteTarget.uid}" เรียบร้อยแล้ว`,
      });
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err: unknown) {
      console.error("Delete user error:", err);
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบ";
      setNotice({
        type: "error",
        message: `ลบไม่สำเร็จ: ${msg}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-10 w-48 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-100 rounded-2xl" />
          <div className="h-24 bg-slate-100 rounded-2xl" />
          <div className="h-24 bg-slate-100 rounded-2xl" />
        </div>
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  // 2. Access Denied State (Not azzzx30089@gmail.com)
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            หน้าระบบจัดการผู้ใช้ (User Management) อนุญาตให้เข้าถึงได้เฉพาะบัญชี Super Admin:
          </p>
          <div className="inline-block px-3 py-1 bg-slate-100 rounded-xl font-mono text-xs font-bold text-slate-800">
            {ADMIN_EMAIL}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 text-left">
          <p className="font-semibold text-slate-700">บัญชีปัจจุบันของคุณ:</p>
          <p className="font-mono text-slate-500 truncate mt-0.5">
            {user?.email || "โหมดไม่ระบุตัวตน (ยังไม่ได้ล็อกอิน)"}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            เข้าสู่ระบบด้วย {ADMIN_EMAIL}
          </button>
          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // 3. Admin View
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Notice Banner */}
      {notice && (
        <div
          className={`px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            notice.type === "error"
              ? "bg-rose-50 text-rose-700 border border-rose-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Permission Denied / Firestore Rules Helper */}
      {permissionDenied && (
        <div className="p-5 rounded-3xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-3.5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900">
                  ต้องการการอนุญาตสิทธิ์ใน Firestore (Missing or insufficient permissions)
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  ฐานข้อมูล Firebase Firestore บนระบบคลาวด์ยังไม่ได้เปิดสิทธิ์ให้บัญชี{" "}
                  <span className="font-semibold">{ADMIN_EMAIL}</span> เข้าถึงคอลเลกชัน{" "}
                  <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-900">
                    /users
                  </code>
                  <br />
                  กรุณาคัดลอก Rules ด้านล่างนี้ไปวางที่ <strong>Firebase Console &gt; Firestore Database &gt; Rules</strong> แล้วกด <strong>Publish</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setPermissionDenied(false)}
              className="text-amber-500 hover:text-amber-700 p-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rules Code Snippet */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-56">
            <pre className="text-slate-200 leading-relaxed">{FIRESTORE_RULES_SNIPPET}</pre>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyRules}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              {copiedRules ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRules ? "คัดลอก Rules แล้ว!" : "คัดลอก Rules (Copy)"}</span>
            </button>

            <a
              href="https://console.firebase.google.com/project/laijai-e7649/firestore/rules"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
              <span>เปิด Firebase Rules Console ↗</span>
            </a>

            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>ลองใหม่อีกครั้ง (Retry)</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              จัดการผู้ใช้ (User Management)
            </h1>
            <span className="text-[11px] bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full border border-purple-200">
              👑 เฉพาะ {ADMIN_EMAIL}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหา ตรวจสอบ เพิ่ม แก้ไข และจัดการสิทธิ์ผู้ใช้งานทั้งหมดในฐานข้อมูล Firestore
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all shadow-blue-600/20 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ เพิ่มผู้ใช้ใหม่</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">ผู้ใช้ทั้งหมด</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalUsers}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">รวมทั้งโหมด Anonymous และ Google</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">บัญชี Google ที่ยืนยันแล้ว</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{activeGoogleUsers}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">เชื่อมต่อผ่าน Google Auth แล้ว</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">ธุรกรรมทั้งหมดในระบบ</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{totalTransactionsCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">รายการจากผู้ใช้ทุกบัญชีรวมกัน</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ, อีเมล หรือ UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-hidden transition-all"
            />
          </div>

          {/* Role Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 mr-1">สิทธิ์:</span>
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === "admin"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Admin ({users.filter((u) => u.role === "admin").length})
            </button>
            <button
              onClick={() => setRoleFilter("user")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                roleFilter === "user"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              User ทั่วไป ({users.filter((u) => u.role !== "admin").length})
            </button>
          </div>
        </div>
      </div>

      {/* User List Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
            <p>กำลังโหลดรายชื่อผู้ใช้จาก Firestore...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-3">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">ไม่พบข้อมูลผู้ใช้ที่ตรงกับเงื่อนไข</p>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {u.photoURL ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.photoURL}
                          alt={u.displayName || "Avatar"}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm text-slate-900 truncate">
                            {u.displayName || "ผู้ใช้ไม่ระบุชื่อ"}
                          </h4>
                          {u.email === ADMIN_EMAIL && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{u.email || "ไม่มีอีเมล (Anonymous)"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="แก้ไขข้อมูล"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {u.email !== ADMIN_EMAIL && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบผู้ใช้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span className="font-mono text-[10px] text-slate-400">UID: {u.uid.slice(0, 10)}...</span>
                    <span>{u.transactionCount || 0} รายการ</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">ผู้ใช้งาน</th>
                    <th className="py-3 px-4">อีเมล</th>
                    <th className="py-3 px-4">สิทธิ์ (Role)</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4 text-center">จำนวนรายการ</th>
                    <th className="py-3 px-4 text-right">ยอดใช้จ่ายรวม</th>
                    <th className="py-3 px-4">ใช้งานล่าสุด</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isOwner = u.email === ADMIN_EMAIL;
                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/60 transition-colors">
                        {/* User Display */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {u.photoURL ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={u.photoURL}
                                alt={u.displayName || "Avatar"}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{u.displayName || "ผู้ใช้ไม่ระบุชื่อ"}</span>
                                {isOwner && (
                                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                UID: {u.uid.slice(0, 12)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {u.email ? (
                            <div className="flex items-center gap-1 text-slate-700 font-medium">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Anonymous (ไม่มีอีเมล)</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              u.role === "admin"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {u.role === "admin" ? "Admin" : "User"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              u.status === "suspended"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === "suspended" ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                            />
                            <span>{u.status === "suspended" ? "ระงับใช้งาน" : "ปกติ"}</span>
                          </span>
                        </td>

                        {/* Transaction count */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                          {u.transactionCount || 0}
                        </td>

                        {/* Total Expense */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(u.totalExpense || 0)}
                        </td>

                        {/* Last Active */}
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                          {u.lastActive ? formatThaiDate(u.lastActive, "d MMM yyyy HH:mm") : "-"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อมูล"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {!isOwner && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="ลบผู้ใช้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {editingUser ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingUser
                  ? `แก้ไขข้อมูลสำหรับ UID: ${editingUser.uid.slice(0, 12)}...`
                  : "กรอกข้อมูลเพื่อสร้างโปรไฟล์ผู้ใช้ใหม่ในระบบ"}
              </p>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อผู้ใช้งาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย สดใส"
                  value={formDisplayName}
                  onChange={(e) => {
                    setFormDisplayName(e.target.value);
                    if (formErrors.displayName) {
                      setFormErrors((prev) => ({ ...prev, displayName: undefined }));
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm text-slate-900 transition-colors focus:bg-white focus:outline-hidden ${
                    formErrors.displayName
                      ? "border-2 border-rose-400 bg-rose-50/30"
                      : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                  }`}
                />
                {formErrors.displayName && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {formErrors.displayName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  อีเมล (Google Email)
                </label>
                <input
                  type="email"
                  placeholder="user@gmail.com"
                  value={formEmail}
                  onChange={(e) => {
                    setFormEmail(e.target.value);
                    if (formErrors.email) {
                      setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm text-slate-900 transition-colors focus:bg-white focus:outline-hidden ${
                    formErrors.email
                      ? "border-2 border-rose-400 bg-rose-50/30"
                      : "border border-slate-200 bg-slate-50 focus:border-blue-500"
                  }`}
                />
                {formErrors.email && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  สิทธิ์การใช้งาน (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormRole("user")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      formRole === "user"
                        ? "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    User (ผู้ใช้ทั่วไป)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRole("admin")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      formRole === "admin"
                        ? "bg-purple-50 text-purple-700 border-purple-300 ring-2 ring-purple-500/20"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Admin (ผู้ดูแลระบบ)
                  </button>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  สถานะบัญชี
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormStatus("active")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      formStatus === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Active (ปกติ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus("suspended")}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      formStatus === "suspended"
                        ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Suspended (ระงับ)
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? "บันทึกการแก้ไข" : "สร้างผู้ใช้"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ยืนยันการลบผู้ใช้"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${
          deleteTarget?.displayName || deleteTarget?.email || deleteTarget?.uid
        }" ออกจากระบบ? ข้อมูลโปรไฟล์จะถูกลบถาวร`}
        confirmText="ลบผู้ใช้"
        cancelText="ยกเลิก"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
