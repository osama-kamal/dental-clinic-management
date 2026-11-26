import { DatabaseManager } from '../database/DatabaseManager';

/**
 * Property tests run many iterations against one database. Call this between
 * iterations so rows from earlier iterations cannot affect later ones.
 * Users are kept so the suite-level test users stay valid.
 */
export function resetData(db: DatabaseManager, keep: string[] = ['users']): void {
  const tables = db.executeQuery<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  // Use the raw sql.js handle: executeUpdate() saves (export) after each statement,
  // and export() turns foreign keys back ON.
  const raw = db.getDatabase();
  raw.run('PRAGMA foreign_keys = OFF');
  for (const t of tables) {
    if (!keep.includes(t.name)) raw.run(`DELETE FROM ${t.name}`);
  }
  raw.run('PRAGMA foreign_keys = ON');
}
