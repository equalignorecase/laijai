"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase/client";
import { Category } from "@/types";
import { getCategories, seedDefaultCategoriesIfEmpty } from "@/services/category-service";

export const ADMIN_EMAIL = "azzzx30089@gmail.com";

interface AuthContextType {
  user: User | null;
  uid: string | null;
  loading: boolean;
  error: string | null;
  categories: Category[];
  refreshCategories: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAnonymous: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  uid: null,
  loading: true,
  error: null,
  categories: [],
  refreshCategories: async () => {},
  signInWithGoogle: async () => {},
  logout: async () => {},
  isAnonymous: true,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadUserCategories = async (userId: string, currentUser?: User | null) => {
    try {
      const userData: Record<string, any> = {
        uid: userId,
        lastActive: new Date().toISOString(),
        appName: "Laijai - Expense Tracker",
      };
      if (currentUser?.email) userData.email = currentUser.email;
      if (currentUser?.displayName) userData.displayName = currentUser.displayName;
      if (currentUser?.photoURL) userData.photoURL = currentUser.photoURL;

      // Ensure real document exists at users/${userId}
      await setDoc(doc(firestore, "users", userId), userData, { merge: true });

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

  const signInWithGoogle = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        // Try to link current anonymous session with Google to keep existing data
        try {
          const result = await linkWithPopup(auth.currentUser, provider);
          setUser(result.user);
          await loadUserCategories(result.user.uid, result.user);
          return;
        } catch (linkError: any) {
          // If Google account already exists on another user, sign in directly
          if (
            linkError?.code === "auth/credential-already-in-use" ||
            linkError?.code === "auth/email-already-in-use"
          ) {
            const result = await signInWithPopup(auth, provider);
            setUser(result.user);
            await loadUserCategories(result.user.uid, result.user);
            return;
          }
          throw linkError;
        }
      } else {
        const result = await signInWithPopup(auth, provider);
        setUser(result.user);
        await loadUserCategories(result.user.uid, result.user);
      }
    } catch (err: unknown) {
      console.error("Google sign in failed:", err);
      const code = (err as any)?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        let msg = err instanceof Error ? err.message : "เข้าสู่ระบบด้วย Google ไม่สำเร็จ";
        if (code === "auth/operation-not-allowed") {
          msg = "ยังไม่ได้เปิดใช้งาน Google Provider ใน Firebase Console: เข้าไปที่ Firebase Console > Authentication > Sign-in method > Google แล้วกด Enable";
        }
        setError(msg);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle signing back in as anonymous
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          await loadUserCategories(currentUser.uid, currentUser);
          setLoading(false);
        } else {
          try {
            const credential = await signInAnonymously(auth);
            setUser(credential.user);
            await loadUserCategories(credential.user.uid, credential.user);
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
        signInWithGoogle,
        logout,
        isAnonymous: user?.isAnonymous ?? true,
        isAdmin: (user?.email?.toLowerCase() ?? "") === ADMIN_EMAIL.toLowerCase(),
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
