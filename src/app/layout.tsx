import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata: Metadata = {
  title: "รายจ่าย - Laijai",
  description: "บันทึกและวิเคราะห์รายจ่ายส่วนบุคคล พร้อมระบบอ่านสลิปโอนเงินด้วย Tesseract OCR และ Gemini AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-slate-50 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
