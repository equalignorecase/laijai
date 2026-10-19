import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default("dummy-api-key"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default("localhost"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default("demo-laijai"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().default("demo-laijai.appspot.com"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default("123456789"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default("1:123456789:web:demo"),
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: z.string().optional().default("true"),

  // Server-only
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default("gemini-1.5-flash"),
  USE_FIREBASE_EMULATOR: z.string().optional().default("true"),
});

export function getClientEnv() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-laijai",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-laijai.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo",
    useEmulator: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  };
}

export function getServerEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn("Environment variables validation warning:", result.error.format());
  }
  return {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    useEmulator: process.env.USE_FIREBASE_EMULATOR === "true",
  };
}
