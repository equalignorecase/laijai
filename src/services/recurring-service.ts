import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { RecurringTransaction, Transaction } from "@/types";
import { createTransaction } from "./transaction-service";
import { addWeeks, addMonths, addYears, format, parseISO } from "date-fns";

export async function getRecurringTransactions(uid: string): Promise<RecurringTransaction[]> {
  if (!uid) return [];
  const colRef = collection(firestore, `users/${uid}/recurringTransactions`);
  const q = query(colRef, orderBy("nextDueDate", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RecurringTransaction, "id">),
  }));
}

export function computeNextDate(
  currentDueDate: string,
  frequency: "weekly" | "monthly" | "yearly"
): string {
  const date = parseISO(currentDueDate);
  let nextDate: Date;

  if (frequency === "weekly") {
    nextDate = addWeeks(date, 1);
  } else if (frequency === "yearly") {
    nextDate = addYears(date, 1);
  } else {
    nextDate = addMonths(date, 1);
  }

  return format(nextDate, "yyyy-MM-dd");
}

export async function addRecurringTransaction(
  uid: string,
  data: Omit<RecurringTransaction, "id" | "createdAt" | "updatedAt">
): Promise<RecurringTransaction> {
  const now = new Date().toISOString();
  const colRef = collection(firestore, `users/${uid}/recurringTransactions`);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateRecurringTransaction(
  uid: string,
  id: string,
  updates: Partial<Omit<RecurringTransaction, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/recurringTransactions/${id}`);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRecurringTransaction(uid: string, id: string): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/recurringTransactions/${id}`);
  await deleteDoc(docRef);
}

/**
 * Confirm and generate a real Transaction from a due recurring item,
 * then advance nextDueDate to next cycle.
 */
export async function executeRecurringTransaction(
  uid: string,
  item: RecurringTransaction
): Promise<Transaction> {
  const now = new Date();
  const timeStr = format(now, "HH:mm");

  // 1. Create real transaction
  const newTx = await createTransaction(uid, {
    type: item.type,
    amount: item.amount,
    currency: "THB",
    title: item.title,
    description: `สร้างอัตโนมัติจากรายการประจำ: ${item.title}`,
    categoryId: item.categoryId,
    transactionDate: item.nextDueDate,
    transactionTime: timeStr,
    timezone: "Asia/Bangkok",
    source: "manual",
    recurringTransactionId: item.id,
  });

  // 2. Advance recurring nextDueDate
  const nextDate = computeNextDate(item.nextDueDate, item.frequency);
  const isExpired = item.endDate ? nextDate > item.endDate : false;

  await updateRecurringTransaction(uid, item.id, {
    nextDueDate: nextDate,
    isActive: !isExpired && item.isActive,
  });

  return newTx;
}
