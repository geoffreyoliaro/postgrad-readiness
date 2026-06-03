import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedIfEmpty } from "./seed.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createDb(filename: string): Database.Database {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = resolve(__dirname, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(db: Database.Database): void {
  const itemCols = db.prepare("PRAGMA table_info(checklist_items)").all() as {
    name: string;
  }[];
  if (!itemCols.some((c) => c.name === "counselor_notes")) {
    db.exec("ALTER TABLE checklist_items ADD COLUMN counselor_notes TEXT");
  }

  // Auth migration: profiles created before login existed have no password_hash
  // and cannot be authenticated, so we drop them (and their dependent rows)
  // when the column is added.
  const profileCols = db.prepare("PRAGMA table_info(profiles)").all() as {
    name: string;
  }[];
  if (!profileCols.some((c) => c.name === "password_hash")) {
    db.exec("ALTER TABLE profiles ADD COLUMN password_hash TEXT");
  }
  db.exec(`
    DELETE FROM checklist_items WHERE checklist_id IN (
      SELECT id FROM checklists WHERE profile_id IN (
        SELECT id FROM profiles WHERE password_hash IS NULL
      )
    );
    DELETE FROM checklists WHERE profile_id IN (
      SELECT id FROM profiles WHERE password_hash IS NULL
    );
    DELETE FROM profiles WHERE password_hash IS NULL;
  `);
}
