export type DegreeType = "BA" | "BS" | "MA" | "MS" | "PHD";

export type RequirementType =
  | "TRANSCRIPT"
  | "TEST_SCORE"
  | "ESSAY"
  | "LETTER"
  | "FORM";

export type EvidenceType = "FILE" | "LINK" | "TEXT" | "NONE";

export type ChecklistStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";

export type EducationLevel =
  | "HIGH_SCHOOL"
  | "ASSOCIATE"
  | "BACHELOR"
  | "MASTER";

export interface Program {
  id: string;
  name: string;
  degreeType: DegreeType;
  applicationDeadline: string; // ISO date (YYYY-MM-DD)
}

export interface Requirement {
  id: string;
  programId: string;
  type: RequirementType;
  title: string;
  description: string;
  dueOffsetDays: number;
  required: boolean;
  evidenceType: EvidenceType;
}

export interface ProgramWithRequirements extends Program {
  requirements: Requirement[];
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  educationLevel: EducationLevel;
  gpa: number | null;
  testScores: Record<string, number> | null;
  targetTerm: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  requirementId: string;
  status: ChecklistStatus;
  notes: string | null;
  counselorNotes: string | null;
  updatedAt: string;
}

export interface ProfileProgramSummary {
  programId: string;
  programName: string;
  degreeType: DegreeType;
  applicationDeadline: string;
  readinessScore: number;
  completedRequired: number;
  totalRequired: number;
  nextDueDate: string | null;
}

export interface ChecklistItemView extends ChecklistItem {
  requirement: Requirement;
  dueDate: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string; // ISO date
  status: ChecklistStatus;
  relatedRequirementId: string;
}

export interface ReadinessResponse {
  readinessScore: number; // 0..1
  completedRequired: number;
  totalRequired: number;
  missingRequirements: Requirement[];
  nextMilestones: TimelineEvent[];
}
