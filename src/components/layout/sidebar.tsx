"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  PieChart,
  Tags,
  CalendarSync,
  FileSpreadsheet,
  Wallet,
  ShieldCheck,
  Server,
  FlaskConical,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const navItems = [
  { href: "/dashboard", label: "แดชบอร์ดภาพรวม", icon: LayoutDashboard },
  { href: "/transactions", label: "ประวัติธุรกรรม", icon: Receipt },
  { href: "/", label: "บันทึกรายจ่าย", icon: PlusCircle, isHighlight: true },
  { href: "/reports", label: "รายงานสรุป", icon: FileSpreadsheet },
];

export function Sidebar() {
  const pathname = usePathname();
  const { uid, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

  const handleCopyUid = () => {
    if (uid) {
      navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white h-screen sticky top-0 p-5 shadow-xs select-none">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight leading-none">
              รายจ่าย - Laijai
            </h1>
            <p className="text-xs text-slate-500 mt-1">Expense Tracker AI</p>
          </div>
        </div>

        {/* Quick Add Button */}
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center gap-2 w-full py-2.5 px-4 mb-6 rounded-xl font-medium text-sm transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99]",
            pathname === "/"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-500/20"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:shadow-md"
          )}
        >
          <PlusCircle className="w-4 h-4" />
          <span>บันทึกรายจ่าย</span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            if (item.isHighlight) return null; // We already have the top CTA button

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer / Auth & Connection info */}
        <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-500" />
                <span>ฐานข้อมูล:</span>
              </div>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full font-medium text-[11px]",
                  isEmulator
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                )}
              >
                {isEmulator ? "Local Emulator" : "Firebase Cloud"}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-mono truncate">
                  {loading ? "กำลังโหลด..." : uid ? `${uid.slice(0, 8)}...` : "ยังไม่ระบุ"}
                </span>
              </div>
              {uid && (
                <button
                  type="button"
                  onClick={handleCopyUid}
                  title="คลิกเพื่อคัดลอก UID ไปค้นหาใน Firestore"
                  className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>คัดลอก UID</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {uid && (
              <p className="text-[10px] text-slate-400 font-mono break-all leading-tight">
                ที่อยู่: users/{uid.slice(0, 6)}.../transactions
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            if (item.isHighlight) {
              const isHighlightActive = pathname === "/";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg transition-transform",
                      isHighlightActive
                        ? "bg-blue-700 shadow-blue-700/40 ring-4 ring-blue-100 scale-105"
                        : "bg-blue-600 shadow-blue-600/30 hover:scale-105"
                    )}
                  >
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] mt-0.5",
                      isHighlightActive ? "font-bold text-blue-600" : "font-medium text-slate-600"
                    )}
                  >
                    บันทึก
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors",
                  isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400")} />
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </>
  );
}
