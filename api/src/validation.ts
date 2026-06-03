import { z } from "zod";

export const educationLevel = z.enum([
  "HIGH_SCHOOL",
  "ASSOCIATE",
  "BACHELOR",
  "MASTER",
]);

export const checklistStatus = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
]);

export const degreeType = z.enum(["BA", "BS", "MA", "MS", "PHD"]);

export const targetTerm = z
  .string()
  .regex(
    /^(Fall|Spring|Summer|Winter) \d{4}$/,
    "Target term must look like 'Fall 2027'"
  );

export const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  educationLevel,
  gpa: z.number().min(0).max(4.5).nullable().optional(),
  testScores: z.record(z.string(), z.number()).nullable().optional(),
  targetTerm,
  password,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  educationLevel: educationLevel.optional(),
  gpa: z.number().min(0).max(4.5).nullable().optional(),
  testScores: z.record(z.string(), z.number()).nullable().optional(),
  targetTerm: targetTerm.optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const createChecklistSchema = z.object({
  programId: z.string().min(1),
});

export const updateChecklistItemSchema = z
  .object({
    status: checklistStatus.optional(),
    notes: z.string().max(2000).nullable().optional(),
    counselorNotes: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.notes !== undefined ||
      v.counselorNotes !== undefined,
    "At least one of status, notes, or counselorNotes is required"
  );

export const listProgramsQuerySchema = z.object({
  degreeType: degreeType.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
