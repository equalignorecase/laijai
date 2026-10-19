export interface DefaultCategoryTemplate {
  name: string;
  type: "expense";
  icon: string;
  color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategoryTemplate[] = [
  { name: "อาหารและเครื่องดื่ม", type: "expense", icon: "Utensils", color: "#EF4444" },
  { name: "เดินทาง", type: "expense", icon: "Car", color: "#F97316" },
  { name: "ที่พัก", type: "expense", icon: "Home", color: "#F59E0B" },
  { name: "ซื้อของ", type: "expense", icon: "ShoppingBag", color: "#10B981" },
  { name: "ค่าใช้จ่ายในบ้าน", type: "expense", icon: "Sparkles", color: "#06B6D4" },
  { name: "ค่าน้ำและค่าไฟ", type: "expense", icon: "Zap", color: "#3B82F6" },
  { name: "อินเทอร์เน็ตและโทรศัพท์", type: "expense", icon: "Wifi", color: "#6366F1" },
  { name: "สุขภาพ", type: "expense", icon: "HeartPulse", color: "#EC4899" },
  { name: "บันเทิง", type: "expense", icon: "Film", color: "#8B5CF6" },
  { name: "การศึกษา", type: "expense", icon: "GraduationCap", color: "#14B8A6" },
  { name: "ค่าสมาชิก", type: "expense", icon: "CreditCard", color: "#A855F7" },
  { name: "อื่น ๆ", type: "expense", icon: "MoreHorizontal", color: "#64748B" },
];

export const ALL_DEFAULT_CATEGORIES = [...DEFAULT_EXPENSE_CATEGORIES];
