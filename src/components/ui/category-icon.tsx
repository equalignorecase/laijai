"use client";

import React from "react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({ name, color = "#3B82F6", size = 18, className }: CategoryIconProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as any)[name] || Icons.CircleDot;

  return (
    <div
      className={cn("flex items-center justify-center rounded-xl p-2 shrink-0", className)}
      style={{
        backgroundColor: `${color}1A`, // 10% opacity background
        color: color,
      }}
    >
      <IconComponent size={size} />
    </div>
  );
}
