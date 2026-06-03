CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  degree_type TEXT NOT NULL,
  application_deadline TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_offset_days INTEGER NOT NULL,
  required INTEGER NOT NULL,
  evidence_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  education_level TEXT NOT NULL,
  gpa REAL,
  test_scores TEXT,
  target_term TEXT NOT NULL,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id);

CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  program_id TEXT NOT NULL REFERENCES programs(id),
  created_at TEXT NOT NULL,
  UNIQUE(profile_id, program_id)
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  checklist_id TEXT NOT NULL REFERENCES checklists(id),
  requirement_id TEXT NOT NULL REFERENCES requirements(id),
  status TEXT NOT NULL,
  notes TEXT,
  counselor_notes TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(checklist_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_requirements_program ON requirements(program_id);
CREATE INDEX IF NOT EXISTS idx_checklists_profile ON checklists(profile_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);
