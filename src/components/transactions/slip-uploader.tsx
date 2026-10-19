"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw, X, Sparkles, Cpu, Bot } from "lucide-react";
import { Category, SlipParseResult } from "@/types";
import { recognizeSlipWithTesseract } from "@/lib/ocr/thai-slip-parser";

interface SlipUploaderProps {
  categories: Category[];
  onParsed: (result: SlipParseResult, engine: "tesseract" | "gemini") => void;
  disabled?: boolean;
}

export function SlipUploader({ categories, onParsed, disabled }: SlipUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingEngine, setAnalyzingEngine] = useState<"tesseract" | "gemini">("tesseract");
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [lastEngineUsed, setLastEngineUsed] = useState<"tesseract" | "gemini" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้น");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("ขนาดไฟล์เกินกำหนด (สูงสุด 8MB)");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Default: Run Tesseract.js (Client-side, Fast & Free)
    await runTesseract(file);
  };

  // Engine 1: Tesseract.js OCR (Client-side in browser)
  const runTesseract = async (file: File) => {
    setIsAnalyzing(true);
    setAnalyzingEngine("tesseract");
    setErrorMsg(null);
    setProgressPercent(10);
    setProgressStatus("กำลังเริ่มระบบ Tesseract OCR ในเครื่อง...");

    try {
      const result = await recognizeSlipWithTesseract(
        file,
        categories,
        (percent, status) => {
          setProgressPercent(percent);
          setProgressStatus(status);
        }
      );

      setLastEngineUsed("tesseract");
      setSuccessMsg("Tesseract OCR อ่านข้อมูลสลิปสำเร็จ (ประมวลผลในเครื่อง 100%)");
      onParsed(result, "tesseract");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tesseract OCR เกิดข้อผิดพลาด";
      setErrorMsg(`Tesseract อ่านสลิปไม่สำเร็จ: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Engine 2: Gemini AI (Server-side Fallback)
  const runGemini = async (file: File) => {
    setIsAnalyzing(true);
    setAnalyzingEngine("gemini");
    setErrorMsg(null);
    setProgressPercent(50);
    setProgressStatus("กำลังส่งไปวิเคราะห์ด้วย Google Gemini AI...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const expenseCatNames = categories
        .filter((c) => c.type === "expense" && !c.isArchived)
        .map((c) => c.name);
      formData.append("categories", JSON.stringify(expenseCatNames));

      const res = await fetch("/api/ai/parse-slip", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการเรียกใช้ Gemini AI");
      }

      setLastEngineUsed("gemini");
      setSuccessMsg("Gemini AI อ่านข้อมูลสำเร็จ!");
      onParsed(json as SlipParseResult, "gemini");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gemini AI เกิดข้อผิดพลาด";
      setErrorMsg(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLastEngineUsed(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800">อ่านสลิปด้วย Tesseract OCR</h3>
            <p className="text-xs text-slate-400">ประมวลผลในเบราว์เซอร์ของคุณ 100% ฟรีและเป็นส่วนตัว</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 font-medium">
          <Cpu className="w-3.5 h-3.5" />
          <span>Tesseract.js Engine (หลัก)</span>
        </div>
      </div>

      {!previewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-50/50"
              : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
            disabled={disabled || isAnalyzing}
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-medium text-blue-600 hover:underline">
                คลิกเพื่อเลือกรูปสลิป
              </span>{" "}
              <span className="text-sm text-slate-500">หรือลากไฟล์มาวาง</span>
            </div>
            <p className="text-xs text-slate-400">รองรับไฟล์สลิปธนาคาร JPG, PNG, WebP</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="สลิปที่อัปโหลด"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 text-xs">
              <p className="font-medium text-slate-800 truncate">{selectedFile?.name}</p>

              {isAnalyzing ? (
                <div className="space-y-1.5 mt-1.5">
                  <div className="flex items-center justify-between text-[11px] text-blue-700 font-medium">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{progressStatus || "กำลังประมวลผล..."}</span>
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : successMsg ? (
                <div className="flex items-center gap-1.5 text-emerald-600 font-medium mt-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {lastEngineUsed === "tesseract"
                      ? "Tesseract OCR อ่านสำเร็จ"
                      : "Gemini AI อ่านสำเร็จ"}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedFile && !isAnalyzing && (
                <div className="flex items-center gap-1.5">
                  {/* Re-run Tesseract */}
                  <button
                    type="button"
                    onClick={() => runTesseract(selectedFile)}
                    className="px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200 rounded-lg font-medium flex items-center gap-1 border border-slate-200"
                    title="อ่านใหม่ด้วย Tesseract"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">OCR ใหม่</span>
                  </button>

                  {/* Gemini AI Fallback Button */}
                  <button
                    type="button"
                    onClick={() => runGemini(selectedFile)}
                    className="px-2.5 py-1.5 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg font-medium flex items-center gap-1 border border-purple-200 shadow-2xs"
                    title="ลองอ่านด้วย Gemini AI สำรอง"
                  >
                    <Bot className="w-3.5 h-3.5 text-purple-600" />
                    <span>ใช้ Gemini สำรอง</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleClear}
                disabled={isAnalyzing}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="ลบรูป"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">อ่านข้อมูลไม่สำเร็จ</p>
                <p className="mt-0.5">{errorMsg}</p>
                {selectedFile && !isAnalyzing && (
                  <button
                    type="button"
                    onClick={() => runGemini(selectedFile)}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ลองวิเคราะห์ด้วย Gemini AI สำรอง</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
