import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { Transaction } from "@/types";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  type: "exact_reference" | "possible_match" | "none";
  matchedTransaction?: Transaction;
  message?: string;
}

export async function checkDuplicateTransaction(
  uid: string,
  candidate: {
    referenceNumber?: string;
    amount: number;
    transactionDate: string;
    recipientName?: string;
    bankName?: string;
  }
): Promise<DuplicateCheckResult> {
  if (!uid) return { isDuplicate: false, type: "none" };

  const txCol = collection(firestore, `users/${uid}/transactions`);

  // 1. Check exact reference number if provided
  if (candidate.referenceNumber && candidate.referenceNumber.trim() !== "") {
    const qRef = query(txCol, where("referenceNumber", "==", candidate.referenceNumber.trim()));
    const snapRef = await getDocs(qRef);
    if (!snapRef.empty) {
      const matchDoc = snapRef.docs[0];
      return {
        isDuplicate: true,
        type: "exact_reference",
        matchedTransaction: { id: matchDoc.id, ...(matchDoc.data() as Omit<Transaction, "id">) },
        message: `พบเลขอ้างอิง (${candidate.referenceNumber}) ตรงกับรายการที่เคยบันทึกไว้แล้ว`,
      };
    }
  }

  // 2. Check candidate on same date and amount
  if (candidate.amount && candidate.transactionDate) {
    const qFuzzy = query(
      txCol,
      where("transactionDate", "==", candidate.transactionDate),
      where("amount", "==", candidate.amount)
    );
    const snapFuzzy = await getDocs(qFuzzy);
    if (!snapFuzzy.empty) {
      // Check recipient or bank match for higher likelihood
      for (const d of snapFuzzy.docs) {
        const item = d.data() as Transaction;
        const recipientMatch =
          candidate.recipientName &&
          item.recipientName &&
          candidate.recipientName.trim().toLowerCase() === item.recipientName.trim().toLowerCase();

        if (recipientMatch) {
          return {
            isDuplicate: true,
            type: "possible_match",
            matchedTransaction: { id: d.id, ...(item as Omit<Transaction, "id">) },
            message: `พบรายการในวันเดียวกัน จำนวนเงิน ${candidate.amount.toLocaleString()} บาท และผู้รับ "${candidate.recipientName}" ตรงกัน`,
          };
        }
      }
    }
  }

  return { isDuplicate: false, type: "none" };
}

export async function getTransactions(
  uid: string,
  options?: {
    month?: string; // YYYY-MM
    startDate?: string;
    endDate?: string;
    type?: "income" | "expense";
    categoryId?: string;
    limitCount?: number;
  }
): Promise<Transaction[]> {
  if (!uid) return [];

  const txCol = collection(firestore, `users/${uid}/transactions`);
  let q = query(txCol, orderBy("transactionDate", "desc"));

  if (options?.limitCount) {
    q = query(q, limit(options.limitCount));
  }

  const snapshot = await getDocs(q);
  let list = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Transaction, "id">),
  }));

  // In-memory filter for flexible multi-criteria without requiring 10+ composite indexes
  if (options?.month) {
    list = list.filter((tx) => tx.transactionDate.startsWith(options.month!));
  }
  if (options?.startDate) {
    list = list.filter((tx) => tx.transactionDate >= options.startDate!);
  }
  if (options?.endDate) {
    list = list.filter((tx) => tx.transactionDate <= options.endDate!);
  }
  if (options?.type) {
    list = list.filter((tx) => tx.type === options.type);
  }
  if (options?.categoryId && options.categoryId !== "all") {
    list = list.filter((tx) => tx.categoryId === options.categoryId);
  }

  return list;
}

export async function getTransactionById(uid: string, id: string): Promise<Transaction | null> {
  const docRef = doc(firestore, `users/${uid}/transactions/${id}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Transaction, "id">) };
}

export async function createTransaction(
  uid: string,
  data: Omit<Transaction, "id" | "createdAt" | "updatedAt">
): Promise<Transaction> {
  const now = new Date().toISOString();
  const txCol = collection(firestore, `users/${uid}/transactions`);
  const docRef = await addDoc(txCol, {
    ...data,
    currency: "THB",
    timezone: "Asia/Bangkok",
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    ...data,
    currency: "THB",
    timezone: "Asia/Bangkok",
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTransaction(
  uid: string,
  id: string,
  updates: Partial<Omit<Transaction, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/transactions/${id}`);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTransaction(uid: string, id: string): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/transactions/${id}`);
  await deleteDoc(docRef);
}
