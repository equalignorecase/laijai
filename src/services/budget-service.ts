import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { Budget, Category, Transaction } from "@/types";

export interface BudgetStatusItem {
  budget: Budget;
  category?: Category;
  allocated: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
  isWarning: boolean; // >= 80%
}

export async function getBudgetsByMonth(uid: string, month: string): Promise<Budget[]> {
  if (!uid) return [];
  const colRef = collection(firestore, `users/${uid}/budgets`);
  const q = query(colRef, where("month", "==", month));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Budget, "id">),
  }));
}

export async function upsertBudget(
  uid: string,
  categoryId: string,
  month: string,
  amount: number
): Promise<Budget> {
  const docId = `${month}_${categoryId}`;
  const docRef = doc(firestore, `users/${uid}/budgets/${docId}`);
  const now = new Date().toISOString();

  const data: Omit<Budget, "id"> = {
    categoryId,
    month,
    amount: Math.max(0, amount),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, data, { merge: true });

  return {
    id: docId,
    ...data,
  };
}

export async function deleteBudget(uid: string, id: string): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/budgets/${id}`);
  await deleteDoc(docRef);
}

export function computeBudgetStatuses(
  budgets: Budget[],
  monthTransactions: Transaction[],
  categories: Category[]
): BudgetStatusItem[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Sum expenses per category
  const expenseMap = new Map<string, number>();
  for (const tx of monthTransactions) {
    if (tx.type === "expense") {
      const current = expenseMap.get(tx.categoryId) || 0;
      expenseMap.set(tx.categoryId, current + tx.amount);
    }
  }

  return budgets.map((b) => {
    const spent = expenseMap.get(b.categoryId) || 0;
    const remaining = Math.max(0, b.amount - spent);
    const percentageUsed = b.amount > 0 ? (spent / b.amount) * 100 : 0;

    return {
      budget: b,
      category: categoryMap.get(b.categoryId),
      allocated: b.amount,
      spent,
      remaining,
      percentageUsed: Math.min(percentageUsed, 999),
      isOverBudget: spent > b.amount,
      isWarning: percentageUsed >= 80 && spent <= b.amount,
    };
  });
}
