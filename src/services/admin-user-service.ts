import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { UserProfile } from "@/types";
import { seedDefaultCategoriesIfEmpty } from "./category-service";

/**
 * Fetch all users from Firestore with transaction counts and metrics
 */
export async function getAdminUsers(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(firestore, "users");
    const snap = await getDocs(usersCol);

    const userPromises = snap.docs.map(async (d) => {
      const data = d.data();
      const userId = d.id;

      let transactionCount = 0;
      let totalExpense = 0;
      let hasBudget = false;

      // Safely fetch transaction metrics for this user
      try {
        const txCol = collection(firestore, `users/${userId}/transactions`);
        const countSnap = await getCountFromServer(txCol);
        transactionCount = countSnap.data().count;

        // Fetch recent transactions to calculate approximate total
        const txSnap = await getDocs(txCol);
        totalExpense = txSnap.docs.reduce((sum, doc) => {
          const val = doc.data();
          return val.type === "expense" ? sum + (Number(val.amount) || 0) : sum;
        }, 0);

        // Check if user set a budget
        const budgetCol = collection(firestore, `users/${userId}/budgets`);
        const bSnap = await getDocs(budgetCol);
        hasBudget = bSnap.size > 0;
      } catch (subErr) {
        // In case subcollection access fails, ignore metrics
        console.debug(`Could not load subcollection metrics for user ${userId}:`, subErr);
      }

      const role = data.email === "azzzx30089@gmail.com" ? "admin" : (data.role || "user");

      return {
        uid: userId,
        email: data.email || undefined,
        displayName: data.displayName || undefined,
        photoURL: data.photoURL || undefined,
        role,
        status: data.status || "active",
        lastActive: data.lastActive || undefined,
        createdAt: data.createdAt || data.lastActive || undefined,
        updatedAt: data.updatedAt || undefined,
        appName: data.appName || "Laijai",
        transactionCount,
        totalExpense,
        hasBudget,
      } as UserProfile;
    });

    const users = await Promise.all(userPromises);

    // Sort by last active (most recent first)
    return users.sort((a, b) => {
      const timeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
      const timeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error("Failed to get admin users:", err);
    throw err;
  }
}

export interface CreateAdminUserPayload {
  email: string;
  displayName: string;
  role?: "admin" | "user";
  status?: "active" | "suspended";
}

/**
 * Create a new user record in Firestore
 */
export async function createAdminUser(payload: CreateAdminUserPayload): Promise<UserProfile> {
  const newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const userData = {
    uid: newUid,
    email: payload.email.trim().toLowerCase(),
    displayName: payload.displayName.trim(),
    role: payload.role || "user",
    status: payload.status || "active",
    createdAt: now,
    lastActive: now,
    updatedAt: now,
    appName: "Laijai - Expense Tracker",
  };

  const userRef = doc(firestore, "users", newUid);
  await setDoc(userRef, userData);

  // Initialize default categories for the new user
  try {
    await seedDefaultCategoriesIfEmpty(newUid);
  } catch (seedErr) {
    console.debug("Failed to seed default categories:", seedErr);
  }

  return {
    ...userData,
    transactionCount: 0,
    totalExpense: 0,
    hasBudget: false,
  };
}

export interface UpdateAdminUserPayload {
  email?: string;
  displayName?: string;
  role?: "admin" | "user";
  status?: "active" | "suspended";
}

/**
 * Update an existing user in Firestore
 */
export async function updateAdminUser(
  uid: string,
  payload: UpdateAdminUserPayload
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  const updateData: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (payload.email !== undefined) updateData.email = payload.email.trim().toLowerCase();
  if (payload.displayName !== undefined) updateData.displayName = payload.displayName.trim();
  if (payload.role !== undefined) updateData.role = payload.role;
  if (payload.status !== undefined) updateData.status = payload.status;

  await updateDoc(userRef, updateData);
}

/**
 * Delete a user document from Firestore
 */
export async function deleteAdminUser(uid: string): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await deleteDoc(userRef);
}
