import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import {
  generateToken,
  hashPassword,
  sessionExpiry,
  verifyPassword,
} from "./auth.js";
import type {
  ChecklistItem,
  ChecklistStatus,
  EducationLevel,
  Program,
  Requirement,
  StudentProfile,
} from "./types.js";

interface ProgramRow {
  id: string;
  name: string;
  degree_type: string;
  application_deadline: string;
}

interface RequirementRow {
  id: string;
  program_id: string;
  type: string;
  title: string;
  description: string;
  due_offset_days: number;
  required: number;
  evidence_type: string;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  education_level: string;
  gpa: number | null;
  test_scores: string | null;
  target_term: string;
}

interface ChecklistRow {
  id: string;
  profile_id: string;
  program_id: string;
  created_at: string;
}

interface ChecklistItemRow {
  id: string;
  checklist_id: string;
  requirement_id: string;
  status: string;
  notes: string | null;
  counselor_notes: string | null;
  updated_at: string;
}

function rowToProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    degreeType: row.degree_type as Program["degreeType"],
    applicationDeadline: row.application_deadline,
  };
}

function rowToRequirement(row: RequirementRow): Requirement {
  return {
    id: row.id,
    programId: row.program_id,
    type: row.type as Requirement["type"],
    title: row.title,
    description: row.description,
    dueOffsetDays: row.due_offset_days,
    required: row.required === 1,
    evidenceType: row.evidence_type as Requirement["evidenceType"],
  };
}

function rowToProfile(row: ProfileRow): StudentProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    educationLevel: row.education_level as EducationLevel,
    gpa: row.gpa,
    testScores:
      row.test_scores === null
        ? null
        : (JSON.parse(row.test_scores) as Record<string, number>),
    targetTerm: row.target_term,
  };
}

function rowToItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    requirementId: row.requirement_id,
    status: row.status as ChecklistStatus,
    notes: row.notes,
    counselorNotes: row.counselor_notes,
    updatedAt: row.updated_at,
  };
}

export interface ListProgramsArgs {
  degreeType?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export interface ListProgramsResult {
  items: Program[];
  total: number;
  page: number;
  pageSize: number;
}

export class Repo {
  constructor(private db: Database.Database) {}

  listPrograms(args: ListProgramsArgs): ListProgramsResult {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (args.degreeType !== undefined) {
      where.push("degree_type = ?");
      params.push(args.degreeType);
    }
    if (args.q !== undefined && args.q.length > 0) {
      where.push("name LIKE ?");
      params.push(`%${args.q}%`);
    }
    const whereSql = where.length === 0 ? "" : `WHERE ${where.join(" AND ")}`;
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) as n FROM programs ${whereSql}`)
        .get(...params) as { n: number }
    ).n;
    const offset = (args.page - 1) * args.pageSize;
    const rows = this.db
      .prepare(
        `SELECT * FROM programs ${whereSql} ORDER BY application_deadline ASC LIMIT ? OFFSET ?`
      )
      .all(...params, args.pageSize, offset) as ProgramRow[];
    return {
      items: rows.map(rowToProgram),
      total,
      page: args.page,
      pageSize: args.pageSize,
    };
  }

  getProgram(id: string): Program | null {
    const row = this.db
      .prepare("SELECT * FROM programs WHERE id = ?")
      .get(id) as ProgramRow | undefined;
    return row === undefined ? null : rowToProgram(row);
  }

  getRequirementsByProgram(programId: string): Requirement[] {
    // Larger dueOffsetDays = earlier due date; DESC keeps a sensible default order
    // before readiness.ts re-sorts by computed calendar date.
    const rows = this.db
      .prepare(
        "SELECT * FROM requirements WHERE program_id = ? ORDER BY due_offset_days DESC, title ASC"
      )
      .all(programId) as RequirementRow[];
    return rows.map(rowToRequirement);
  }

  getProfile(id: string): StudentProfile | null {
    const row = this.db
      .prepare("SELECT * FROM profiles WHERE id = ?")
      .get(id) as ProfileRow | undefined;
    return row === undefined ? null : rowToProfile(row);
  }

  getProfileByEmail(email: string): StudentProfile | null {
    const row = this.db
      .prepare("SELECT * FROM profiles WHERE email = ?")
      .get(email) as ProfileRow | undefined;
    return row === undefined ? null : rowToProfile(row);
  }

  registerProfile(input: {
    name: string;
    email: string;
    educationLevel: string;
    gpa?: number | null;
    testScores?: Record<string, number> | null;
    targetTerm: string;
    password: string;
  }): { profile: StudentProfile; token: string } {
    const id = `prof-${randomUUID()}`;
    const passwordHash = hashPassword(input.password);
    this.db
      .prepare(
        `INSERT INTO profiles
           (id, name, email, education_level, gpa, test_scores, target_term, password_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.name,
        input.email,
        input.educationLevel,
        input.gpa ?? null,
        input.testScores === null || input.testScores === undefined
          ? null
          : JSON.stringify(input.testScores),
        input.targetTerm,
        passwordHash
      );
    const created = this.getProfile(id);
    if (created === null) {
      throw new Error("Failed to create profile");
    }
    const token = this.createSession(id);
    return { profile: created, token };
  }

  login(
    email: string,
    password: string
  ): { profile: StudentProfile; token: string } | null {
    const row = this.db
      .prepare(
        "SELECT id, password_hash FROM profiles WHERE email = ?"
      )
      .get(email) as { id: string; password_hash: string | null } | undefined;
    if (row === undefined || row.password_hash === null) {
      return null;
    }
    if (!verifyPassword(password, row.password_hash)) {
      return null;
    }
    const profile = this.getProfile(row.id);
    if (profile === null) {
      return null;
    }
    const token = this.createSession(profile.id);
    return { profile, token };
  }

  createSession(profileId: string): string {
    const token = generateToken();
    this.db
      .prepare(
        `INSERT INTO sessions (token, profile_id, created_at, expires_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(token, profileId, new Date().toISOString(), sessionExpiry());
    return token;
  }

  getProfileByToken(token: string): StudentProfile | null {
    const row = this.db
      .prepare(
        "SELECT profile_id, expires_at FROM sessions WHERE token = ?"
      )
      .get(token) as { profile_id: string; expires_at: string } | undefined;
    if (row === undefined) {
      return null;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return this.getProfile(row.profile_id);
  }

  deleteSession(token: string): void {
    this.db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }

  updateProfile(
    id: string,
    patch: Partial<{
      name: string;
      email: string;
      educationLevel: string;
      gpa: number | null;
      testScores: Record<string, number> | null;
      targetTerm: string;
    }>
  ): StudentProfile | null {
    const existing = this.getProfile(id);
    if (existing === null) {
      return null;
    }
    const merged = {
      name: patch.name ?? existing.name,
      email: patch.email ?? existing.email,
      educationLevel: patch.educationLevel ?? existing.educationLevel,
      gpa: patch.gpa === undefined ? existing.gpa : patch.gpa,
      testScores:
        patch.testScores === undefined ? existing.testScores : patch.testScores,
      targetTerm: patch.targetTerm ?? existing.targetTerm,
    };
    this.db
      .prepare(
        `UPDATE profiles
         SET name = ?, email = ?, education_level = ?, gpa = ?, test_scores = ?, target_term = ?
         WHERE id = ?`
      )
      .run(
        merged.name,
        merged.email,
        merged.educationLevel,
        merged.gpa,
        merged.testScores === null ? null : JSON.stringify(merged.testScores),
        merged.targetTerm,
        id
      );
    return this.getProfile(id);
  }

  getChecklist(
    profileId: string,
    programId: string
  ): { checklist: ChecklistRow; items: ChecklistItem[] } | null {
    const row = this.db
      .prepare(
        "SELECT * FROM checklists WHERE profile_id = ? AND program_id = ?"
      )
      .get(profileId, programId) as ChecklistRow | undefined;
    if (row === undefined) {
      return null;
    }
    const itemRows = this.db
      .prepare("SELECT * FROM checklist_items WHERE checklist_id = ?")
      .all(row.id) as ChecklistItemRow[];
    return { checklist: row, items: itemRows.map(rowToItem) };
  }

  createChecklist(
    profileId: string,
    programId: string
  ): { items: ChecklistItem[] } {
    // Idempotent: one checklist per (profile, program). UI can safely POST again.
    const existing = this.getChecklist(profileId, programId);
    if (existing !== null) {
      return { items: existing.items };
    }

    const profile = this.getProfile(profileId);
    if (profile === null) {
      throw new RepoError("NOT_FOUND", `Profile ${profileId} not found`);
    }
    const program = this.getProgram(programId);
    if (program === null) {
      throw new RepoError("NOT_FOUND", `Program ${programId} not found`);
    }
    const reqs = this.getRequirementsByProgram(programId);

    const checklistId = `cl-${randomUUID()}`;
    const now = new Date().toISOString();

    const insertChecklist = this.db.prepare(
      "INSERT INTO checklists (id, profile_id, program_id, created_at) VALUES (?, ?, ?, ?)"
    );
    const insertItem = this.db.prepare(
      `INSERT INTO checklist_items
         (id, checklist_id, requirement_id, status, notes, counselor_notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const tx = this.db.transaction(() => {
      insertChecklist.run(checklistId, profileId, programId, now);
      for (const r of reqs) {
        insertItem.run(
          `item-${randomUUID()}`,
          checklistId,
          r.id,
          "NOT_STARTED",
          null,
          null,
          now
        );
      }
    });
    tx();

    const fresh = this.getChecklist(profileId, programId);
    if (fresh === null) {
      throw new Error("Failed to load checklist after creation");
    }
    return { items: fresh.items };
  }

  updateChecklistItem(
    profileId: string,
    programId: string,
    requirementId: string,
    patch: {
      status?: ChecklistStatus;
      notes?: string | null;
      counselorNotes?: string | null;
    }
  ): ChecklistItem | null {
    const cl = this.getChecklist(profileId, programId);
    if (cl === null) {
      return null;
    }
    const existing = cl.items.find((i) => i.requirementId === requirementId);
    if (existing === undefined) {
      return null;
    }
    const status = patch.status ?? existing.status;
    const notes = patch.notes === undefined ? existing.notes : patch.notes;
    const counselorNotes =
      patch.counselorNotes === undefined
        ? existing.counselorNotes
        : patch.counselorNotes;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE checklist_items
         SET status = ?, notes = ?, counselor_notes = ?, updated_at = ?
         WHERE checklist_id = ? AND requirement_id = ?`
      )
      .run(status, notes, counselorNotes, now, cl.checklist.id, requirementId);
    return {
      ...existing,
      status,
      notes,
      counselorNotes,
      updatedAt: now,
    };
  }

  listProfileChecklists(profileId: string): {
    programId: string;
    items: ChecklistItem[];
  }[] {
    const rows = this.db
      .prepare(
        `SELECT id, program_id FROM checklists WHERE profile_id = ? ORDER BY created_at ASC`
      )
      .all(profileId) as { id: string; program_id: string }[];
    return rows.map((r) => {
      const itemRows = this.db
        .prepare("SELECT * FROM checklist_items WHERE checklist_id = ?")
        .all(r.id) as ChecklistItemRow[];
      return { programId: r.program_id, items: itemRows.map(rowToItem) };
    });
  }
}

export class RepoError extends Error {
  constructor(
    public code: "NOT_FOUND" | "CONFLICT",
    message: string
  ) {
    super(message);
    this.name = "RepoError";
  }
}
