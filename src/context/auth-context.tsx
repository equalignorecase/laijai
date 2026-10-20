"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase/client";
import { Category } from "@/types";
import { getCategories, seedDefaultCategoriesIfEmpty } from "@/services/category-service";

interface AuthContextType {
  user: User | null;
  uid: string | null;
  loading: boolean;
  error: string | null;
  categories: Category[];
  refreshCategories: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  loading: true,
  error: null,
  categories: [],
  refreshCategories: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadUserCategories = async (userId: string) => {
    try {
      // Ensure real document exists at users/${userId} so it is visible as a real (non-italic) document in Firebase Console
      await setDoc(
        doc(firestore, "users", userId),
        {
          uid: userId,
          lastActive: new Date().toISOString(),
          appName: "Laijai - Expense Tracker",
        },
        { merge: true }
      );

      const cats = await seedDefaultCategoriesIfEmpty(userId);
      setCategories(cats);
    } catch (err: unknown) {
      console.error("Failed to load/seed categories:", err);
    }
  };

  const refreshCategories = async () => {
    if (user?.uid) {
      const cats = await getCategories(user.uid);
      setCategories(cats);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          await loadUserCategories(currentUser.uid);
          setLoading(false);
        } else {
          try {
            const credential = await signInAnonymously(auth);
            setUser(credential.user);
            await loadUserCategories(credential.user.uid);
          } catch (err: unknown) {
            console.error("Anonymous authentication failed:", err);
            setError("ไม่สามารถเชื่อมต่อระบบยืนยันตัวตน Anonymous Auth ได้ กรุณาตรวจสอบว่า Firebase Emulator ทำงานอยู่");
          } finally {
            setLoading(false);
          }
        }
      },
      (authError) => {
        console.error("Auth state change error:", authError);
        setError("เกิดข้อผิดพลาดในการตรวจสอบสถานะผู้ใช้");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        uid: user?.uid ?? null,
        loading,
        error,
        categories,
        refreshCategories,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
