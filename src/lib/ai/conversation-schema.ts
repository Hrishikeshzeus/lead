import { z } from "zod";

export const StudentEntitiesSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  courseInterest: z.string().nullable().optional(),
  targetExam: z.string().nullable().optional(),
  preferredBatch: z.string().nullable().optional(),
  joiningTimeline: z.string().nullable().optional(),
  budgetRange: z.string().nullable().optional(),
  counsellingPreference: z
    .enum(["phone", "whatsapp", "in_person", "video", "none"])
    .nullable()
    .optional(),
  consentGiven: z.boolean().nullable().optional(),
});

export const QualificationStateSchema = z.object({
  currentStage: z
    .enum(["greeting", "inquiry", "qualifying", "contact_capture", "handoff_ready", "completed"])
    .default("inquiry"),
  nextQualificationQuestion: z.string().nullable().optional(),
  readinessScore: z.number().min(0).max(1).default(0.5),
});

export const ObjectionSchema = z.object({
  category: z.enum(["fees", "schedule", "eligibility", "location", "scholarship", "other"]),
  description: z.string(),
  sentiment: z.enum(["mild", "strong", "blocking"]).default("mild"),
});

export const HandoffSchema = z.object({
  recommended: z.boolean().default(false),
  reason: z.string().nullable().optional(),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
});

export const CitationSchema = z.object({
  title: z.string(),
  sourceType: z.enum(["course", "knowledge_chunk", "faq"]),
  snippet: z.string(),
  id: z.string().nullable().optional(),
});

export const AIChatEngineResponseSchema = z.object({
  reply: z.string().min(1, "Reply text is required"),
  studentEntities: StudentEntitiesSchema.default({}),
  qualificationState: QualificationStateSchema.default({
    currentStage: "inquiry",
    nextQualificationQuestion: null,
    readinessScore: 0.5,
  }),
  objections: z.array(ObjectionSchema).default([]),
  summary: z.string().default("Prospective student inquiry in progress."),
  handoff: HandoffSchema.default({ recommended: false, reason: null, urgency: "medium" }),
  citations: z.array(CitationSchema).default([]),
});

export type AIChatEngineResponse = z.infer<typeof AIChatEngineResponseSchema>;

/**
 * Safely parse and validate structured AI response text.
 * Strips Markdown code blocks if present and validates against Zod schema.
 */
export function safeParseAIResponse(rawText: string): {
  success: boolean;
  data: AIChatEngineResponse;
  rawJson?: any;
  error?: string;
  isRecovered?: boolean;
} {
  let cleaned = rawText.trim();

  // Strip markdown code fences if output wrapped in ```json ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  // Attempt JSON parse
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    // If not JSON, construct safe fallback recovery
    return {
      success: false,
      error: `JSON parse error: ${err.message}`,
      isRecovered: true,
      data: {
        reply: rawText.replace(/[{}"\\]/g, " ").trim() || "Thank you for your question. A member of our admissions team will follow up with detailed information.",
        studentEntities: {},
        qualificationState: {
          currentStage: "inquiry",
          nextQualificationQuestion: null,
          readinessScore: 0.4,
        },
        objections: [],
        summary: "Student asked general questions about admissions and programs.",
        handoff: {
          recommended: false,
          reason: null,
          urgency: "medium",
        },
        citations: [],
      },
    };
  }

  // Zod validation
  const result = AIChatEngineResponseSchema.safeParse(parsed);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e: any) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      success: false,
      rawJson: parsed,
      error: `Zod validation error: ${errorDetails}`,
      isRecovered: true,
      data: {
        reply: typeof parsed.reply === "string" ? parsed.reply : "Thank you for reaching out to admissions. How may I help you today?",
        studentEntities: parsed.studentEntities || {},
        qualificationState: {
          currentStage: parsed.qualificationState?.currentStage || "inquiry",
          nextQualificationQuestion: parsed.qualificationState?.nextQualificationQuestion || null,
          readinessScore: 0.5,
        },
        objections: Array.isArray(parsed.objections) ? parsed.objections : [],
        summary: typeof parsed.summary === "string" ? parsed.summary : "Prospective student conversation in progress.",
        handoff: {
          recommended: Boolean(parsed.handoff?.recommended),
          reason: parsed.handoff?.reason || null,
          urgency: "medium",
        },
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      },
    };
  }

  return {
    success: true,
    data: result.data,
    rawJson: parsed,
  };
}
