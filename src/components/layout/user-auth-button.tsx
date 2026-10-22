"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import {
  LogOut,
  CheckCircle,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  X,
} from "lucide-react";

export function UserAuthButton({ compact = false }: { compact?: boolean }) {
  const { user, isAnonymous, isAdmin, loading, error, signInWithGoogle, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show error modal if error occurs
  useEffect(() => {
    if (error) {
      setShowErrorModal(true);
    }
  }, [error]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="h-8 w-24 bg-slate-100 rounded-xl animate-pulse" />
    );
  }

  return (
    <>
      {/* Not logged in (Anonymous) */}
      {isAnonymous || !user ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="เข้าสู่ระบบด้วย Google เพื่อบันทึกข้อมูลถาวร ข้อมูลไม่หายเมื่อเปลี่ยนเครื่อง"
          >
            {/* Google "G" Logo */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-medium">
              {isSigningIn ? "กำลังเชื่อมต่อ..." : compact ? "ซิงค์ Google" : "เข้าสู่ระบบ (Google)"}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="ยังไม่ได้ซิงค์ข้อมูลถาวร" />
          </button>
        </div>
      ) : (
        /* Logged in with Google */
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
          >
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName || "ผู้ใช้"}
                className="w-5 h-5 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex items-center gap-1.5 max-w-[110px] truncate text-left">
              <span className="text-xs font-semibold text-slate-800 truncate">
                {user.displayName || user.email?.split("@")[0] || "ผู้ใช้"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="ซิงค์ข้อมูล Google เรียบร้อย" />
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900 truncate">{user.displayName || "ผู้ใช้ Google"}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>ซิงค์ข้อมูลลงคลาวด์ถาวรแล้ว</span>
                </div>
              </div>

              {isAdmin && (
                <div className="p-1 border-b border-slate-100">
                  <Link
                    href="/admin/users"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-purple-700 hover:bg-purple-50 font-semibold transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                    <span>👑 จัดการผู้ใช้ (Admin)</span>
                  </Link>
                </div>
              )}

              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Info Modal for operation-not-allowed */}
      {showErrorModal && error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-4">
            <button
              onClick={() => setShowErrorModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900">ยังไม่ได้เปิดใช้งาน Google Sign-In</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                ใน Firebase Project <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">laijai-e7649</code> ยังไม่ได้กดเปิดสวิตช์ <strong>Google Provider</strong> ใน Firebase Console
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-800">วิธีเปิดใช้งานใน 3 คลิก:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                <li>กดปุ่มลิงก์ด้านล่างเพื่อไปที่หน้า Authentication Providers</li>
                <li>คลิกเลือก <strong>Google</strong> ภายใต้ Sign-in providers</li>
                <li>กดสวิตช์ <strong>Enable</strong> ใส่ชื่อและอีเมล แล้วกด <strong>Save</strong></li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ปิด
              </button>
              <a
                href="https://console.firebase.google.com/project/laijai-e7649/authentication/providers"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span>เปิด Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
