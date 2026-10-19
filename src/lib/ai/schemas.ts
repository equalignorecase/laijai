import { z } from "zod";

export const SlipDataSchema = z.object({
  amount: z.number().nullable().default(null),
  date: z.string().nullable().default(null),
  time: z.string().nullable().default(null),
  recipient: z.string().nullable().default(null),
  sender: z.string().nullable().default(null),
  reference: z.string().nullable().default(null),
  bank: z.string().nullable().default(null),
  suggestedCategory: z.string().nullable().optional().default(null),
  suggestedTitle: z.string().nullable().optional().default(null),
});

export const ConfidenceScoreSchema = z.object({
  amount: z.number().min(0).max(1).nullable().default(null),
  date: z.number().min(0).max(1).nullable().default(null),
  time: z.number().min(0).max(1).nullable().default(null),
  recipient: z.number().min(0).max(1).nullable().default(null),
  sender: z.number().min(0).max(1).nullable().default(null),
  reference: z.number().min(0).max(1).nullable().default(null),
  bank: z.number().min(0).max(1).nullable().default(null),
});

export const SlipParseResultSchema = z.object({
  success: z.boolean(),
  data: SlipDataSchema,
  confidence: ConfidenceScoreSchema,
  warnings: z.array(z.string()).default([]),
  needsReview: z.boolean().default(true),
});

export type SlipParseResultDTO = z.infer<typeof SlipParseResultSchema>;
