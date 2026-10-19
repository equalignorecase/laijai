"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FlaskConical,
  UploadCloud,
  Cpu,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Eye,
  FileText,
  Code2,
  CheckCircle,
  XCircle,
  Zap,
  ArrowRight,
  ClipboardPaste,
  Download,
  Table as TableIcon,
  FileCode,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  PreprocessOptions,
  preprocessImageDetails,
  recognizeSlipWithTesseractDiagnostics,
  SlipDiagnosticResult,
} from "@/lib/ocr/thai-slip-parser";
import { SlipParseResult } from "@/types";

interface SamplePreset {
  id: string;
  bank: string;
  bankColor: string;
  amount: string;
  date: string;
  time: string;
  recipient: string;
  ref: string;
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "kbank",
    bank: "กสิกรไทย (KBANK)",
    bankColor: "#057a55",
    amount: "350.50",
    date: "19 ต.ค. 2569",
    time: "14:30",
    recipient: "ร้านกาแฟสุขใจ Cafe",
    ref: "202610190001KBANK89234",
  },
  {
    id: "scb",
    bank: "ไทยพาณิชย์ (SCB)",
    bankColor: "#4c1d95",
    amount: "1,250.00",
    date: "25/12/2569",
    time: "09:15",
    recipient: "ปั๊มน้ำมัน ปตท PTT Station",
    ref: "20261225SCB102938475",
  },
  {
    id: "ktb",
    bank: "กรุงไทย (KTB)",
    bankColor: "#0284c7",
    amount: "580.00",
    date: "10 พ.ย. 2569",
    time: "18:45",
    recipient: "7-Eleven เซเว่นอีเลฟเว่น",
    ref: "20261110KTB992837461",
  },
];

/**
 * Syntax highlighter for JSON code block
 */
function highlightJson(json: string): string {
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "text-amber-400"; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-sky-300 font-semibold"; // key
        } else {
          cls = "text-emerald-400"; // string
        }
      } else if (/true|false/.test(match)) {
        cls = "text-rose-400 font-bold"; // boolean
      } else if (/null/.test(match)) {
        cls = "text-slate-500 italic"; // null
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export default function OcrDebugPage() {
  const { categories } = useAuth();

  // Image source state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; size: string } | null>(null);

  // Preprocess Sliders
  const [options, setOptions] = useState<PreprocessOptions>({
    contrast: 35,
    brightness: 0,
    threshold: 0,
    grayscale: true,
    invert: false,
  });

  // OCR execution state
  const [isTesseractRunning, setIsTesseractRunning] = useState(false);
  const [tesseractProgress, setTesseractProgress] = useState({ percent: 0, status: "" });
  const [tesseractTimeMs, setTesseractTimeMs] = useState<number | null>(null);
  const [tesseractResult, setTesseractResult] = useState<SlipDiagnosticResult | null>(null);

  const [isGeminiRunning, setIsGeminiRunning] = useState(false);
  const [geminiTimeMs, setGeminiTimeMs] = useState<number | null>(null);
  const [geminiResult, setGeminiResult] = useState<SlipParseResult | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // UI View state
  const [viewMode, setViewMode] = useState<"raw_json" | "table">("raw_json");
  const [activeTab, setActiveTab] = useState<"traces" | "raw">("traces");
  const [copiedSide, setCopiedSide] = useState<"tesseract" | "gemini" | "raw" | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update Canvas preview whenever file or options change
  const updateCanvasPreview = useCallback(
    async (file: File, opts: PreprocessOptions) => {
      try {
        const details = await preprocessImageDetails(file, opts);
        setProcessedUrl(details.dataUrl);
        setProcessedBlob(details.blob);
      } catch (err) {
        console.error("Canvas preview failed", err);
      }
    },
    []
  );

  const handleSelectFile = (file: File) => {
    if (!file) return;
    if (originalUrl) URL.revokeObjectURL(originalUrl);

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    setImageMeta({
      width: 0,
      height: 0,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });

    // Reset results
    setTesseractResult(null);
    setTesseractTimeMs(null);
    setGeminiResult(null);
    setGeminiTimeMs(null);
    setGeminiError(null);

    updateCanvasPreview(file, options);
  };

  // Clipboard Paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleSelectFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [options]);

  // Re-run canvas update on options change
  useEffect(() => {
    if (selectedFile) {
      updateCanvasPreview(selectedFile, options);
    }
  }, [options, selectedFile, updateCanvasPreview]);

  // Generate Sample Slip via Canvas
  const loadSampleSlip = (sample: SamplePreset) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top Header Banner
    ctx.fillStyle = sample.bankColor;
    ctx.fillRect(0, 0, canvas.width, 160);

    // Header Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(sample.bank, canvas.width / 2, 75);
    ctx.font = "24px sans-serif";
    ctx.fillText("โอนเงินสำเร็จ", canvas.width / 2, 125);

    // Details Area
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "left";

    // Date & Time
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("วันที่ทำรายการ:", 60, 240);
    ctx.font = "26px sans-serif";
    ctx.fillText(`${sample.date}  ${sample.time} น.`, 260, 240);

    // Divider
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 290);
    ctx.lineTo(740, 290);
    ctx.stroke();

    // From
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("จาก:", 60, 360);
    ctx.font = "26px sans-serif";
    ctx.fillText("นายสมชาย ใจดี (XXX-X-X1234-X)", 200, 360);

    // To
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("ไปยัง:", 60, 440);
    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = sample.bankColor;
    ctx.fillText(sample.recipient, 200, 440);

    // Divider
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(60, 500);
    ctx.lineTo(740, 500);
    ctx.stroke();

    // Amount Box
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(60, 540, 680, 150);
    ctx.strokeStyle = "#cbd5e1";
    ctx.strokeRect(60, 540, 680, 150);

    ctx.fillStyle = "#64748b";
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("จำนวนเงิน", canvas.width / 2, 590);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText(`฿ ${sample.amount}`, canvas.width / 2, 655);

    // Reference Number
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.font = "22px sans-serif";
    ctx.fillText("รหัสอ้างอิง:", 60, 750);
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 22px monospace";
    ctx.fillText(sample.ref, 200, 750);

    // QR Code simulation placeholder
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(280, 810, 240, 240);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(280, 810, 240, 240);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QR ตรวจสอบสลิป", canvas.width / 2, 935);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `sample-${sample.id}.png`, { type: "image/png" });
        handleSelectFile(file);
      }
    }, "image/png");
  };

  // Run Tesseract.js
  const runTesseract = async () => {
    if (!processedBlob && !selectedFile) return;
    setIsTesseractRunning(true);
    setTesseractProgress({ percent: 10, status: "เริ่มต้น Tesseract.js..." });
    const startTime = performance.now();

    try {
      const source = processedBlob || selectedFile!;
      const result = await recognizeSlipWithTesseractDiagnostics(
        source,
        categories,
        (percent, status) => setTesseractProgress({ percent, status })
      );

      const endTime = performance.now();
      setTesseractTimeMs(Math.round(endTime - startTime));
      setTesseractResult(result);
    } catch (err: unknown) {
      console.error(err);
      alert(`Tesseract Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsTesseractRunning(false);
    }
  };

  // Run Gemini 2.5 Flash
  const runGemini = async () => {
    if (!selectedFile) return;
    setIsGeminiRunning(true);
    setGeminiError(null);
    const startTime = performance.now();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const catNames = categories
        .filter((c) => c.type === "expense" && !c.isArchived)
        .map((c) => c.name);
      formData.append("categories", JSON.stringify(catNames));

      const res = await fetch("/api/ai/parse-slip", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      const endTime = performance.now();
      setGeminiTimeMs(Math.round(endTime - startTime));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการเรียกใช้ Gemini API");
      }

      setGeminiResult(json as SlipParseResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGeminiError(msg);
    } finally {
      setIsGeminiRunning(false);
    }
  };

  // Run Both
  const runBoth = async () => {
    await Promise.all([runTesseract(), runGemini()]);
  };

  const copyJson = (data: unknown, side: "tesseract" | "gemini" | "raw") => {
    const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
  };

  const downloadJson = (data: unknown, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Structured Tesseract Payload for Raw JSON view
  const tesseractPayload = tesseractResult
    ? {
        engine: "tesseract.js",
        environment: "client-wasm-browser",
        executionTimeMs: tesseractTimeMs,
        success: tesseractResult.success,
        data: tesseractResult.data,
        confidence: tesseractResult.confidence,
        warnings: tesseractResult.warnings,
        needsReview: tesseractResult.needsReview,
        tracesSummary: {
          totalRulesChecked: tesseractResult.traces.length,
          matchedRules: tesseractResult.traces.filter((t) => t.matched).map((t) => t.rule),
        },
        rawTextLength: tesseractResult.rawText.length,
      }
    : null;

  // Structured Gemini Payload for Raw JSON view
  const geminiPayload = geminiResult
    ? {
        engine: "gemini-2.5-flash",
        environment: "server-api-route",
        executionTimeMs: geminiTimeMs,
        success: geminiResult.success,
        data: geminiResult.data,
        confidence: geminiResult.confidence,
        warnings: geminiResult.warnings,
        needsReview: geminiResult.needsReview,
      }
    : geminiError
    ? {
        engine: "gemini-2.5-flash",
        success: false,
        error: geminiError,
        executionTimeMs: geminiTimeMs,
      }
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>OCR Debug Lab</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                Raw JSON & Diagnostics
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              ปรับจูนค่า Canvas Preprocessing แบบสด และเปรียบเทียบผลลัพธ์ Raw JSON ของ Tesseract.js กับ Gemini 2.5 Flash
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Cpu className="w-3.5 h-3.5" />
            <span>Tesseract.js WASM</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini 2.5 Flash</span>
          </span>
        </div>
      </div>

      {/* Input Options: Upload / Paste / Sample Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Dropzone */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>นำเข้าภาพสลิป</span>
            </h3>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>กด Ctrl+V เพื่อวางรูปได้ทันที</span>
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.[0]) handleSelectFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-50/50"
                : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
              }}
            />
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-blue-600">คลิกเลือกรูปภาพ</span> หรือลากไฟล์มาวาง
              </p>
              <p className="text-[11px] text-slate-400">รองรับไฟล์ JPG, PNG, WebP ทุกขนาด</p>
            </div>
          </div>
        </div>

        {/* 1-Click Preset Samples */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm text-slate-800 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>สลิปตัวอย่างจำลอง (1-Click Test)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">สร้างสลิปจำลองบน Canvas เพื่อทดสอบทันที</p>

            <div className="space-y-2">
              {SAMPLE_PRESETS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSampleSlip(sample)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all flex items-center justify-between text-xs group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: sample.bankColor }}
                    />
                    <div>
                      <span className="font-medium text-slate-800 block">{sample.bank}</span>
                      <span className="text-[11px] text-slate-400">
                        {sample.amount} ฿ • {sample.recipient}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preprocessing Sliders Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-sm text-slate-800">
              ตัวปรับแต่ง Canvas Image Preprocessing (Live Controls)
            </h3>
          </div>
          <button
            type="button"
            onClick={() =>
              setOptions({
                contrast: 35,
                brightness: 0,
                threshold: 0,
                grayscale: true,
                invert: false,
              })
            }
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium px-2.5 py-1 rounded-lg hover:bg-slate-100"
          >
            <RotateCcw className="w-3 h-3" />
            <span>คืนค่าเริ่มต้น</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
          {/* Grayscale Toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">Grayscale (ขาวดำ)</span>
              <input
                type="checkbox"
                checked={options.grayscale}
                onChange={(e) => setOptions({ ...options, grayscale: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">แปลงโทนสีเพื่อลดความกวนของสีพื้นหลัง</p>
          </div>

          {/* Contrast Slider */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">Contrast (คอนทราสต์)</span>
              <span className="text-xs font-bold text-blue-600">{options.contrast}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.contrast ?? 35}
              onChange={(e) => setOptions({ ...options, contrast: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">แนะนำ: 30 ถึง 50</p>
          </div>

          {/* Brightness Slider */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">Brightness (ความสว่าง)</span>
              <span className="text-xs font-bold text-blue-600">{options.brightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={options.brightness ?? 0}
              onChange={(e) => setOptions({ ...options, brightness: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">ปรับชดเชยสลิปที่มืดเกินไป</p>
          </div>

          {/* Threshold Binarize Slider */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">Threshold (ตัดเส้นขาวดำ)</span>
              <span className="text-xs font-bold text-blue-600">
                {options.threshold === 0 ? "ปิด" : options.threshold}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="255"
              value={options.threshold ?? 0}
              onChange={(e) => setOptions({ ...options, threshold: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[10px] text-slate-400 mt-1">0 = ปิด, 120-160 = ตัดชัดเจน</p>
          </div>

          {/* Invert Colors */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">Invert (กลับสี)</span>
              <input
                type="checkbox"
                checked={options.invert}
                onChange={(e) => setOptions({ ...options, invert: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">สำหรับสลิปโหมดมืด (Dark Mode)</p>
          </div>
        </div>
      </div>

      {/* Visual Image Inspection: Original vs Processed Canvas */}
      {selectedFile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original View */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>ภาพต้นฉบับ (Original Image)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {selectedFile.name} ({imageMeta?.size})
              </span>
            </div>
            <div className="relative aspect-3/4 max-h-[380px] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              {originalUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={originalUrl}
                  alt="Original Slip"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>

          {/* Processed Canvas View */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>ภาพหลังปรับแต่งใน Canvas (ส่งเข้า Tesseract)</span>
              </span>
              <span className="text-[11px] text-blue-600 font-medium">PNG Cleaned</span>
            </div>
            <div className="relative aspect-3/4 max-h-[380px] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-300 flex items-center justify-center">
              {processedUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={processedUrl}
                  alt="Processed Canvas Slip"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions Execution Bar */}
      {selectedFile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Run Tesseract */}
            <button
              type="button"
              onClick={runTesseract}
              disabled={isTesseractRunning || isGeminiRunning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
            >
              {isTesseractRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cpu className="w-4 h-4" />
              )}
              <span>รัน Tesseract.js (ในเครื่อง)</span>
            </button>

            {/* Run Gemini */}
            <button
              type="button"
              onClick={runGemini}
              disabled={isTesseractRunning || isGeminiRunning}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
            >
              {isGeminiRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>รัน Gemini 2.5 Flash (API)</span>
            </button>

            {/* Run Both */}
            <button
              type="button"
              onClick={runBoth}
              disabled={isTesseractRunning || isGeminiRunning}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isTesseractRunning || isGeminiRunning ? "animate-spin" : ""}`} />
              <span>รันเปรียบเทียบทั้งคู่</span>
            </button>
          </div>

          {/* Progress / Status display */}
          {isTesseractRunning && (
            <div className="flex items-center gap-3 text-xs text-blue-700 font-medium">
              <span>{tesseractProgress.status}</span>
              <span className="font-bold">{tesseractProgress.percent}%</span>
            </div>
          )}
        </div>
      )}

      {/* Main Results Section: Raw JSON Side-by-Side (Primary) & Table Toggle */}
      {(tesseractResult || geminiResult || geminiError) && (
        <div className="space-y-4">
          {/* View Mode Toggle Header */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">โหมดแสดงผลการวิเคราะห์:</span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode("raw_json")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "raw_json"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Raw JSON Side-by-Side</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "table"
                      ? "bg-white text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>ตารางสรุป (Table View)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {tesseractTimeMs !== null && (
                <span className="text-blue-700 font-medium bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  Tesseract: {tesseractTimeMs} ms
                </span>
              )}
              {geminiTimeMs !== null && (
                <span className="text-purple-700 font-medium bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  Gemini: {geminiTimeMs} ms
                </span>
              )}
            </div>
          </div>

          {/* VIEW 1: Raw JSON Side-by-Side Viewer */}
          {viewMode === "raw_json" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel: Tesseract.js Raw JSON */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-bold text-blue-400">Tesseract.js WASM JSON</span>
                    {tesseractTimeMs !== null && (
                      <span className="text-[11px] text-slate-400">({tesseractTimeMs} ms)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {tesseractPayload && (
                      <>
                        <button
                          type="button"
                          onClick={() => copyJson(tesseractPayload, "tesseract")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="คัดลอก Tesseract JSON"
                        >
                          {copiedSide === "tesseract" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedSide === "tesseract" ? "คัดลอกแล้ว" : "Copy"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadJson(tesseractPayload, `tesseract-slip-${Date.now()}.json`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="ดาวน์โหลดไฟล์ .json"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.json</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Panel Content */}
                <div className="p-4 flex-1 overflow-x-auto max-h-[550px]">
                  {tesseractPayload ? (
                    <pre
                      className="font-mono text-xs leading-relaxed select-text"
                      dangerouslySetInnerHTML={{
                        __html: highlightJson(JSON.stringify(tesseractPayload, null, 2)),
                      }}
                    />
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                      <Cpu className="w-8 h-8 text-slate-700" />
                      <p>ยังไม่ได้รัน Tesseract.js</p>
                      <button
                        type="button"
                        onClick={runTesseract}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                      >
                        รัน Tesseract.js
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Gemini 2.5 Flash Raw JSON */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col">
                {/* Panel Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-xs font-bold text-purple-400">Gemini 2.5 Flash JSON</span>
                    {geminiTimeMs !== null && (
                      <span className="text-[11px] text-slate-400">({geminiTimeMs} ms)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {geminiPayload && (
                      <>
                        <button
                          type="button"
                          onClick={() => copyJson(geminiPayload, "gemini")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="คัดลอก Gemini JSON"
                        >
                          {copiedSide === "gemini" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedSide === "gemini" ? "คัดลอกแล้ว" : "Copy"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadJson(geminiPayload, `gemini-slip-${Date.now()}.json`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="ดาวน์โหลดไฟล์ .json"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.json</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Panel Content */}
                <div className="p-4 flex-1 overflow-x-auto max-h-[550px]">
                  {geminiPayload ? (
                    <pre
                      className="font-mono text-xs leading-relaxed select-text"
                      dangerouslySetInnerHTML={{
                        __html: highlightJson(JSON.stringify(geminiPayload, null, 2)),
                      }}
                    />
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                      <Sparkles className="w-8 h-8 text-slate-700" />
                      <p>ยังไม่ได้รัน Gemini 2.5 Flash</p>
                      <button
                        type="button"
                        onClick={runGemini}
                        className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium"
                      >
                        รัน Gemini AI
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: Comparison Matrix Table */}
          {viewMode === "table" && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800">ตารางสรุปเปรียบเทียบฟิลด์</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold w-1/4">ฟิลด์ข้อมูล</th>
                      <th className="py-2.5 px-4 font-semibold w-3/8 text-blue-700 bg-blue-50/50">
                        Tesseract.js (Client-side)
                      </th>
                      <th className="py-2.5 px-4 font-semibold w-3/8 text-purple-700 bg-purple-50/50">
                        Gemini 2.5 Flash (Server-side)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">จำนวนเงิน (Amount)</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 bg-blue-50/30">
                        {tesseractResult?.data.amount !== null && tesseractResult?.data.amount !== undefined
                          ? `฿ ${tesseractResult.data.amount.toLocaleString()}`
                          : <span className="text-slate-400 font-normal">ยังไม่ได้รัน / หาไม่พบ</span>}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 bg-purple-50/30">
                        {geminiResult?.data.amount !== null && geminiResult?.data.amount !== undefined
                          ? `฿ ${geminiResult.data.amount.toLocaleString()}`
                          : <span className="text-slate-400 font-normal">ยังไม่ได้รัน / หาไม่พบ</span>}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">วันที่ (Date)</td>
                      <td className="py-2.5 px-4 font-mono bg-blue-50/30">
                        {tesseractResult?.data.date || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-4 font-mono bg-purple-50/30">
                        {geminiResult?.data.date || <span className="text-slate-400">-</span>}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">เวลา (Time)</td>
                      <td className="py-2.5 px-4 font-mono bg-blue-50/30">
                        {tesseractResult?.data.time || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-4 font-mono bg-purple-50/30">
                        {geminiResult?.data.time || <span className="text-slate-400">-</span>}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">ธนาคาร (Bank)</td>
                      <td className="py-2.5 px-4 bg-blue-50/30">
                        {tesseractResult?.data.bank || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-4 bg-purple-50/30">
                        {geminiResult?.data.bank || <span className="text-slate-400">-</span>}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">ผู้รับเงิน / ร้านค้า</td>
                      <td className="py-2.5 px-4 bg-blue-50/30 font-medium">
                        {tesseractResult?.data.recipient || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-4 bg-purple-50/30 font-medium">
                        {geminiResult?.data.recipient || <span className="text-slate-400">-</span>}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">รหัสอ้างอิง (Ref No)</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] bg-blue-50/30">
                        {tesseractResult?.data.reference || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] bg-purple-50/30">
                        {geminiResult?.data.reference || <span className="text-slate-400">-</span>}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">หมวดหมู่ที่แนะนำ</td>
                      <td className="py-2.5 px-4 bg-blue-50/30">
                        {tesseractResult?.data.suggestedCategory ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                            {tesseractResult.data.suggestedCategory}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 bg-purple-50/30">
                        {geminiResult?.data.suggestedCategory ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                            {geminiResult.data.suggestedCategory}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">ความมั่นใจยอดเงิน</td>
                      <td className="py-2.5 px-4 bg-blue-50/30">
                        {tesseractResult?.confidence.amount ? (
                          <span className="font-bold text-slate-700">
                            {Math.round(tesseractResult.confidence.amount * 100)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 bg-purple-50/30">
                        {geminiResult?.confidence.amount ? (
                          <span className="font-bold text-slate-700">
                            {Math.round(geminiResult.confidence.amount * 100)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {geminiError && (
                <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Gemini API Error: {geminiError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deep-Dive Diagnostics Tabs */}
      {tesseractResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50">
            <div className="flex gap-1 py-2">
              <button
                type="button"
                onClick={() => setActiveTab("traces")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === "traces"
                    ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Regex Rule Diagnostics ({tesseractResult.traces.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("raw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === "raw"
                    ? "bg-white text-blue-700 shadow-2xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ข้อความดิบ (Raw Text จากภาพ)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => copyJson(tesseractResult.rawText, "raw")}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-200 font-medium"
            >
              {copiedSide === "raw" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedSide === "raw" ? "คัดลอกแล้ว" : "คัดลอกข้อความ"}</span>
            </button>
          </div>

          <div className="p-4">
            {/* Tab 1: Regex Diagnostics Table */}
            {activeTab === "traces" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">ฟิลด์เป้าหมาย</th>
                      <th className="py-2 px-3 font-semibold">ชื่อกฎ Regex</th>
                      <th className="py-2 px-3 font-semibold">รูปแบบ Pattern</th>
                      <th className="py-2 px-3 font-semibold text-center">สถานะ</th>
                      <th className="py-2 px-3 font-semibold">ข้อความที่ตรงกัน (Matched Text)</th>
                      <th className="py-2 px-3 font-semibold">ค่าที่สกัดได้</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tesseractResult.traces.map((trace, idx) => (
                      <tr key={idx} className={trace.matched ? "bg-emerald-50/40" : ""}>
                        <td className="py-2 px-3 font-semibold text-slate-700">{trace.field}</td>
                        <td className="py-2 px-3 text-slate-800">{trace.rule}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                          {trace.pattern}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {trace.matched ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle className="w-3 h-3" />
                              <span>พบ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">
                              <XCircle className="w-3 h-3" />
                              <span>ไม่พบ</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                          {trace.matchedText || "-"}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {trace.extractedValue !== null && trace.extractedValue !== undefined
                            ? String(trace.extractedValue)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Raw OCR Text */}
            {activeTab === "raw" && (
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed select-text">
                {tesseractResult.rawText || "ไม่มีข้อความ"}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
