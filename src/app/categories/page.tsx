"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CategoriesPage() {
  const router = useRouter();

  useEffect(() => {
    // In Simplified Mode, categories are eliminated
    router.replace("/");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-slate-400">
      กำลังนำทางไปยังแดชบอร์ด...
    </div>
  );
}
