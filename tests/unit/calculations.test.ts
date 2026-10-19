import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/utils";
import { computeBudgetStatuses } from "@/services/budget-service";
import { Budget, Category, Transaction } from "@/types";

describe("Financial Calculations & Utilities (Expense Only)", () => {
  it("formats currency to Thai Baht standard", () => {
    expect(formatCurrency(1250)).toContain("1,250.00");
    expect(formatCurrency(0)).toContain("0.00");
  });

  it("calculates total expense and daily average accurately", () => {
    const transactions = [
      { type: "expense", amount: 12000 },
      { type: "expense", amount: 3500 },
      { type: "expense", amount: 4500 },
    ];

    const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);
    const days = 20;
    const dailyAverage = totalExpense / days;

    expect(totalExpense).toBe(20000);
    expect(dailyAverage).toBe(1000);
  });

  it("computes budget statuses and protects against division by zero", () => {
    const categories: Category[] = [
      {
        id: "cat-food",
        name: "อาหาร",
        type: "expense",
        icon: "Utensils",
        color: "#EF4444",
        isDefault: true,
        isArchived: false,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "cat-travel",
        name: "เดินทาง",
        type: "expense",
        icon: "Car",
        color: "#F97316",
        isDefault: true,
        isArchived: false,
        createdAt: "",
        updatedAt: "",
      },
    ];

    const budgets: Budget[] = [
      {
        id: "b1",
        categoryId: "cat-food",
        month: "2026-10",
        amount: 5000,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "b2",
        categoryId: "cat-travel",
        month: "2026-10",
        amount: 0, // zero budget test
        createdAt: "",
        updatedAt: "",
      },
    ];

    const transactions: Transaction[] = [
      {
        id: "tx1",
        type: "expense",
        amount: 4500,
        currency: "THB",
        title: "ข้าวเย็น",
        categoryId: "cat-food",
        transactionDate: "2026-10-15",
        timezone: "Asia/Bangkok",
        source: "manual",
        createdAt: "",
        updatedAt: "",
      },
    ];

    const statuses = computeBudgetStatuses(budgets, transactions, categories);

    expect(statuses).toHaveLength(2);

    const foodStatus = statuses.find((s) => s.budget.categoryId === "cat-food")!;
    expect(foodStatus.spent).toBe(4500);
    expect(foodStatus.remaining).toBe(500);
    expect(foodStatus.percentageUsed).toBe(90); // 4500 / 5000 * 100
    expect(foodStatus.isWarning).toBe(true); // >= 80%
    expect(foodStatus.isOverBudget).toBe(false);

    const travelStatus = statuses.find((s) => s.budget.categoryId === "cat-travel")!;
    expect(travelStatus.percentageUsed).toBe(0); // Protected against NaN/Infinity
  });
});
