export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: "THB";

  title: string;
  description?: string;
  categoryId?: string;

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

export type BudgetPeriodType = "monthly" | "custom";

export interface Budget {
  id: string;
  name?: string; // Optional custom label, e.g. "ทริปเชียงใหม่"
  periodType?: BudgetPeriodType; // defaults to "monthly" if omitted
  categoryId: string; // Specific category ID or "all" for all categories
  month?: string; // YYYY-MM (for monthly)
  startDate?: string; // YYYY-MM-DD (for custom)
  endDate?: string; // YYYY-MM-DD (for custom)
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

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role?: "admin" | "user" | "guest";
  status?: "active" | "suspended";
  lastActive?: string;
  createdAt?: string;
  updatedAt?: string;
  appName?: string;
  // Computed metrics
  transactionCount?: number;
  totalExpense?: number;
  hasBudget?: boolean;
}
