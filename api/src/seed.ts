import type Database from "better-sqlite3";

interface SeedProgram {
  id: string;
  name: string;
  degreeType: string;
  applicationDeadline: string;
  requirements: SeedRequirement[];
}

interface SeedRequirement {
  id: string;
  type: string;
  title: string;
  description: string;
  dueOffsetDays: number;
  required: boolean;
  evidenceType: string;
}

// Fixed seed date so the timeline stays reproducible across runs.
// Deadlines are 3-9 months out from this anchor.
const SEED_PROGRAMS: SeedProgram[] = [
  {
    id: "prog-stanford-cs-ms",
    name: "Stanford MS Computer Science",
    degreeType: "MS",
    applicationDeadline: "2027-12-01",
    requirements: [
      {
        id: "req-stanford-cs-ms-transcript",
        type: "TRANSCRIPT",
        title: "Undergraduate transcripts",
        description:
          "Official transcripts from all post-secondary institutions attended.",
        dueOffsetDays: 14,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-stanford-cs-ms-gre",
        type: "TEST_SCORE",
        title: "GRE General Test",
        description: "GRE scores sent directly from ETS.",
        dueOffsetDays: 21,
        required: false,
        evidenceType: "TEXT",
      },
      {
        id: "req-stanford-cs-ms-sop",
        type: "ESSAY",
        title: "Statement of Purpose",
        description: "1,000-word statement describing your research interests.",
        dueOffsetDays: 7,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-stanford-cs-ms-letters",
        type: "LETTER",
        title: "Three letters of recommendation",
        description: "Submitted by recommenders via the portal.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "NONE",
      },
      {
        id: "req-stanford-cs-ms-app",
        type: "FORM",
        title: "Online application form",
        description: "Submit completed application form with fee.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "LINK",
      },
      {
        id: "req-stanford-cs-ms-resume",
        type: "FORM",
        title: "Resume / CV",
        description: "Up-to-date academic and professional resume.",
        dueOffsetDays: 7,
        required: true,
        evidenceType: "FILE",
      },
    ],
  },
  {
    id: "prog-mit-bs-eecs",
    name: "MIT BS Electrical Engineering and CS",
    degreeType: "BS",
    applicationDeadline: "2027-01-05",
    requirements: [
      {
        id: "req-mit-bs-eecs-transcript",
        type: "TRANSCRIPT",
        title: "Secondary school transcripts",
        description: "Official transcripts from all high schools attended.",
        dueOffsetDays: 21,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-mit-bs-eecs-sat",
        type: "TEST_SCORE",
        title: "SAT or ACT scores",
        description: "Either SAT or ACT, sent from the testing agency.",
        dueOffsetDays: 14,
        required: true,
        evidenceType: "TEXT",
      },
      {
        id: "req-mit-bs-eecs-essays",
        type: "ESSAY",
        title: "MIT short-answer essays",
        description: "Five short responses (200-250 words each).",
        dueOffsetDays: 14,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-mit-bs-eecs-letters",
        type: "LETTER",
        title: "Two teacher evaluations",
        description: "One math/science teacher, one humanities teacher.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "NONE",
      },
      {
        id: "req-mit-bs-eecs-app",
        type: "FORM",
        title: "MIT application",
        description: "MIT-specific application form.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "LINK",
      },
    ],
  },
  {
    id: "prog-berkeley-ms-data",
    name: "UC Berkeley MS Data Science",
    degreeType: "MS",
    applicationDeadline: "2027-09-15",
    requirements: [
      {
        id: "req-berkeley-ms-data-transcript",
        type: "TRANSCRIPT",
        title: "Undergraduate transcripts",
        description: "Official transcripts; minimum 3.0 GPA.",
        dueOffsetDays: 14,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-berkeley-ms-data-sop",
        type: "ESSAY",
        title: "Statement of Purpose",
        description: "Up to 1,500 words.",
        dueOffsetDays: 7,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-berkeley-ms-data-diversity",
        type: "ESSAY",
        title: "Personal history statement",
        description: "Optional 500-word personal history statement.",
        dueOffsetDays: 7,
        required: false,
        evidenceType: "FILE",
      },
      {
        id: "req-berkeley-ms-data-letters",
        type: "LETTER",
        title: "Three letters of recommendation",
        description: "At least one from an academic source.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "NONE",
      },
      {
        id: "req-berkeley-ms-data-app",
        type: "FORM",
        title: "Graduate application form",
        description: "UC Berkeley graduate admissions application.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "LINK",
      },
    ],
  },
  {
    id: "prog-harvard-ba-econ",
    name: "Harvard BA Economics",
    degreeType: "BA",
    applicationDeadline: "2027-01-01",
    requirements: [
      {
        id: "req-harvard-ba-econ-transcript",
        type: "TRANSCRIPT",
        title: "Secondary school report",
        description: "School counselor submits transcripts and report.",
        dueOffsetDays: 21,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-harvard-ba-econ-sat",
        type: "TEST_SCORE",
        title: "SAT or ACT (test-optional)",
        description: "Scores optional for the 2027 cycle.",
        dueOffsetDays: 14,
        required: false,
        evidenceType: "TEXT",
      },
      {
        id: "req-harvard-ba-econ-essay",
        type: "ESSAY",
        title: "Common App personal essay",
        description: "650-word personal essay via Common Application.",
        dueOffsetDays: 14,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-harvard-ba-econ-supp",
        type: "ESSAY",
        title: "Harvard supplemental essays",
        description: "Three short Harvard-specific prompts.",
        dueOffsetDays: 7,
        required: true,
        evidenceType: "FILE",
      },
      {
        id: "req-harvard-ba-econ-letters",
        type: "LETTER",
        title: "Two teacher recommendations",
        description: "Submitted via the Common App.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "NONE",
      },
      {
        id: "req-harvard-ba-econ-app",
        type: "FORM",
        title: "Common Application",
        description: "Complete Common App + Harvard supplement.",
        dueOffsetDays: 0,
        required: true,
        evidenceType: "LINK",
      },
    ],
  },
];

export function seedIfEmpty(db: Database.Database): void {
  const row = db.prepare("SELECT COUNT(*) as n FROM programs").get() as {
    n: number;
  };
  if (row.n > 0) {
    return;
  }

  const insertProgram = db.prepare(
    `INSERT INTO programs (id, name, degree_type, application_deadline)
     VALUES (?, ?, ?, ?)`
  );
  const insertReq = db.prepare(
    `INSERT INTO requirements
       (id, program_id, type, title, description, due_offset_days, required, evidence_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    for (const p of SEED_PROGRAMS) {
      insertProgram.run(p.id, p.name, p.degreeType, p.applicationDeadline);
      for (const r of p.requirements) {
        insertReq.run(
          r.id,
          p.id,
          r.type,
          r.title,
          r.description,
          r.dueOffsetDays,
          r.required ? 1 : 0,
          r.evidenceType
        );
      }
    }
  });
  tx();
}
