"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BudgetsPage() {
  const router = useRouter();

  useEffect(() => {
    // In Simplified Mode, budget is managed directly on the Dashboard
    router.replace("/");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-slate-400">
      กำลังนำทางไปยังแดชบอร์ดงบประมาณ...
    </div>
  );
}
