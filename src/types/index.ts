export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: "THB";

  title: string;
  description?: string;
  categoryId: string;

  transactionDate: string; // YYYY-MM-DD
  transactionTime?: string; // HH:mm
  timezone: "Asia/Bangkok";

  paymentMethod?: string;
  merchantName?: string;
  senderName?: string;
  recipientName?: string;
  bankName?: string;
  referenceNumber?: string;

  receiptPath?: string;
  receiptFileName?: string;

  source: "manual" | "receipt_ai";
  duplicateStatus?: "unique" | "possible_duplicate";

  recurringTransactionId?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: string; // YYYY-MM
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  categoryId: string;

  frequency: "weekly" | "monthly" | "yearly";
  startDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD

  endDate?: string;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface SlipParseResult {
  success: boolean;
  data: {
    amount: number | null;
    date: string | null;
    time: string | null;
    recipient: string | null;
    sender: string | null;
    reference: string | null;
    bank: string | null;
    suggestedCategory?: string | null;
    suggestedTitle?: string | null;
  };
  confidence: {
    amount: number | null;
    date: number | null;
    time: number | null;
    recipient: number | null;
    sender: number | null;
    reference: number | null;
    bank: number | null;
  };
  warnings: string[];
  needsReview: boolean;
}

export interface UserPreferences {
  currency: "THB";
  theme: "light";
  dateFormat: "dd/MM/yyyy";
}
