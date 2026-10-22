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

  try {
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

    // 2. Check candidate on same date and amount using single-field query to avoid index requirement errors
    if (candidate.amount && candidate.transactionDate) {
      const qDate = query(txCol, where("transactionDate", "==", candidate.transactionDate));
      const snapDate = await getDocs(qDate);
      if (!snapDate.empty) {
        for (const d of snapDate.docs) {
          const item = d.data() as Transaction;
          if (Math.abs(item.amount - candidate.amount) < 0.001) {
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
    }

    return { isDuplicate: false, type: "none" };
  } catch (err) {
    console.warn("checkDuplicateTransaction warning (continuing save):", err);
    return { isDuplicate: false, type: "none" };
  }
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

  try {
    const txCol = collection(firestore, `users/${uid}/transactions`);
    const snapshot = await getDocs(txCol);
    let list: Transaction[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      // Normalize raw date field
      const rawDate = d.transactionDate || d.date || (d.createdAt ? String(d.createdAt).slice(0, 10) : "");
      let normalizedDate = String(rawDate || "").trim().replace(/\//g, "-");
      // Handle Buddhist Era if present (e.g. 2567 -> 2024, 2569 -> 2026)
      if (/^25\d{2}/.test(normalizedDate)) {
        const bYear = parseInt(normalizedDate.slice(0, 4), 10);
        normalizedDate = `${bYear - 543}${normalizedDate.slice(4)}`;
      }

      const numAmount = typeof d.amount === "number" ? d.amount : parseFloat(d.amount) || 0;

      return {
        id: docSnap.id,
        type: d.type === "income" ? "income" : "expense", // Default to expense
        amount: Math.abs(numAmount),
        currency: d.currency || "THB",
        title: d.title || d.description || d.merchantName || "รายจ่าย",
        description: d.description || undefined,
        categoryId: d.categoryId || "all",
        transactionDate: normalizedDate,
        transactionTime: d.transactionTime || undefined,
        timezone: d.timezone || "Asia/Bangkok",
        paymentMethod: d.paymentMethod || undefined,
        merchantName: d.merchantName || undefined,
        recipientName: d.recipientName || undefined,
        senderName: d.senderName || undefined,
        bankName: d.bankName || undefined,
        referenceNumber: d.referenceNumber || undefined,
        source: d.source || "manual",
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
      };
    });

    // Sort by date desc -> time desc -> createdAt desc in-memory
    list.sort((a, b) => {
      const dateA = a.transactionDate || "";
      const dateB = b.transactionDate || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);

      const timeA = a.transactionTime || "";
      const timeB = b.transactionTime || "";
      if (timeA !== timeB) return timeB.localeCompare(timeA);

      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    // In-memory filter for flexible multi-criteria without requiring 10+ composite indexes
    if (options?.month) {
      list = list.filter((tx) => tx.transactionDate && tx.transactionDate.startsWith(options.month!));
    }
    if (options?.startDate) {
      list = list.filter((tx) => tx.transactionDate && tx.transactionDate >= options.startDate!);
    }
    if (options?.endDate) {
      list = list.filter((tx) => tx.transactionDate && tx.transactionDate <= options.endDate!);
    }
    if (options?.type) {
      list = list.filter((tx) => tx.type === options.type);
    }
    if (options?.categoryId && options.categoryId !== "all") {
      list = list.filter((tx) => tx.categoryId === options.categoryId);
    }
    if (options?.limitCount) {
      list = list.slice(0, options.limitCount);
    }

    return list;
  } catch (err) {
    console.error("getTransactions error:", err);
    return [];
  }
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

  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  const docRef = await addDoc(txCol, {
    ...cleanData,
    categoryId: data.categoryId || "all",
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
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  await updateDoc(docRef, {
    ...cleanUpdates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTransaction(uid: string, id: string): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/transactions/${id}`);
  await deleteDoc(docRef);
}
