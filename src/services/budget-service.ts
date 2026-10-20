import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { Budget, Category, Transaction, BudgetPeriodType } from "@/types";

export interface BudgetStatusItem {
  budget: Budget;
  category?: Category;
  isAllCategories: boolean;
  allocated: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  isWarning: boolean; // >= 80%
  status: "active" | "upcoming" | "expired";
  periodLabel: string;
}

export async function getAllBudgets(uid: string): Promise<Budget[]> {
  if (!uid) return [];
  const colRef = collection(firestore, `users/${uid}/budgets`);
  const snap = await getDocs(colRef);

  return snap.docs.map((d) => {
    const data = d.data();
    const periodType = (data.periodType as BudgetPeriodType) || "custom";
    // Backwards compatibility: populate startDate and endDate from month if missing
    const startDate = data.startDate || (data.month ? `${data.month}-01` : undefined);
    const endDate = data.endDate || (data.month ? `${data.month}-31` : undefined);

    return {
      id: d.id,
      periodType,
      name: data.name || undefined,
      categoryId: data.categoryId || "all",
      month: data.month || undefined,
      startDate,
      endDate,
      amount: typeof data.amount === "number" ? data.amount : 0,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  });
}

export async function getBudgetsByMonth(uid: string, month: string): Promise<Budget[]> {
  const all = await getAllBudgets(uid);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  return all.filter((b) => {
    if (b.startDate && b.endDate) {
      return b.startDate <= monthEnd && b.endDate >= monthStart;
    }
    return b.month === month;
  });
}

export async function getBudgetsByDateRange(
  uid: string,
  startDate: string,
  endDate: string
): Promise<Budget[]> {
  const all = await getAllBudgets(uid);
  return all.filter((b) => {
    if (b.startDate && b.endDate) {
      return b.startDate <= endDate && b.endDate >= startDate;
    }
    return true;
  });
}

export interface SaveBudgetPayload {
  id?: string;
  name?: string;
  periodType?: BudgetPeriodType;
  categoryId: string; // Specific category id OR "all"
  amount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  month?: string; // Optional legacy
}

export async function saveBudget(uid: string, payload: SaveBudgetPayload): Promise<Budget> {
  const now = new Date().toISOString();
  let docId = payload.id;

  if (!docId) {
    if (payload.startDate && payload.endDate) {
      docId = `budget_${payload.startDate}_${payload.endDate}_${payload.categoryId}`;
    } else {
      docId = `budget_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
  }

  const docRef = doc(firestore, `users/${uid}/budgets/${docId}`);

  const periodType = payload.periodType || "custom";
  const data: Record<string, any> = {
    periodType,
    categoryId: payload.categoryId,
    amount: Math.max(0, payload.amount),
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdAt: now,
    updatedAt: now,
  };

  if (payload.name && payload.name.trim() !== "") {
    data.name = payload.name.trim();
  }
  if (payload.month) {
    data.month = payload.month;
  }

  await setDoc(docRef, data, { merge: true });

  return {
    id: docId,
    periodType,
    categoryId: payload.categoryId,
    amount: Math.max(0, payload.amount),
    name: data.name,
    month: data.month,
    startDate: data.startDate,
    endDate: data.endDate,
    createdAt: now,
    updatedAt: now,
  };
}

// Backward compatible helper for existing callers
export async function upsertBudget(
  uid: string,
  categoryId: string,
  month: string,
  amount: number
): Promise<Budget> {
  return saveBudget(uid, {
    periodType: "monthly",
    categoryId,
    month,
    startDate: `${month}-01`,
    endDate: `${month}-31`,
    amount,
  });
}

export async function deleteBudget(uid: string, id: string): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/budgets/${id}`);
  await deleteDoc(docRef);
}

export function computeBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  categories: Category[],
  currentDateStr?: string
): BudgetStatusItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const today = currentDateStr || "";

  return budgets.map((b) => {
    const isCustom = b.periodType === "custom";
    const isAllCategories = b.categoryId === "all";

    // Determine date bounds
    const start = b.startDate || (b.month ? `${b.month}-01` : "");
    const end = b.endDate || (b.month ? `${b.month}-31` : "");
    const periodLabel = start && end ? `${start} ถึง ${end}` : "กำหนดเอง";

    const isSingleBudget = budgets.length === 1;
    const shouldMatchAnyCategory = isAllCategories || isSingleBudget;

    // Filter matched transactions
    const matchedTx = transactions.filter((tx) => {
      if (tx.type !== "expense") return false;
      const txDate = (tx.transactionDate || "").slice(0, 10);
      if (!txDate) return false;
      if (start && txDate < start) return false;
      if (end && txDate > end) return false;
      if (!shouldMatchAnyCategory && tx.categoryId !== b.categoryId) return false;
      return true;
    });

    const spent = matchedTx.reduce((sum, tx) => sum + tx.amount, 0);
    const remaining = Math.max(0, b.amount - spent);
    const percentageUsed = b.amount > 0 ? (spent / b.amount) * 100 : 0;

    // Status: active / upcoming / expired
    let status: "active" | "upcoming" | "expired" = "active";
    if (today) {
      if (end && today > end) {
        status = "expired";
      } else if (start && today < start) {
        status = "upcoming";
      }
    }

    return {
      budget: b,
      category: isAllCategories ? undefined : categoryMap.get(b.categoryId),
      isAllCategories,
      allocated: b.amount,
      spent,
      remaining,
      percentageUsed: Math.min(percentageUsed, 999),
      isOverBudget: spent > b.amount,
      isWarning: percentageUsed >= 80 && spent <= b.amount,
      status,
      periodLabel,
    };
  });
}
