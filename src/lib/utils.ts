import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency to Thai Baht standard e.g. ฿1,250.00
 */
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return formatted;
}

/**
 * Format date string (YYYY-MM-DD) to Thai display format e.g. 19 ต.ค. 2026
 */
export function formatThaiDate(dateStr: string, pattern: string = "d MMM yyyy"): string {
  try {
    if (!dateStr) return "-";
    const date = typeof dateStr === "string" && dateStr.includes("T") 
      ? parseISO(dateStr) 
      : new Date(dateStr);
    return format(date, pattern, { locale: th });
  } catch {
    return dateStr;
  }
}

/**
 * Format date string to Month Year e.g. "ตุลาคม 2026"
 */
export function formatThaiMonth(yearMonth: string): string {
  try {
    if (!yearMonth) return "-";
    const [year, month] = yearMonth.split("-");
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return format(date, "MMMM yyyy", { locale: th });
  } catch {
    return yearMonth;
  }
}

/**
 * Get current month string in YYYY-MM format (Asia/Bangkok)
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get current date string in YYYY-MM-DD format (Asia/Bangkok)
 */
export function getCurrentDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
