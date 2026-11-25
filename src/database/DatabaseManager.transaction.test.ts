import { DatabaseManager } from './DatabaseManager';
import fs from 'fs';
import path from 'path';

describe('DatabaseManager.executeTransaction regression', () => {
  const dbPath = path.join(__dirname, '../../test-data/transaction-regression.db');
  let db: DatabaseManager;

  beforeEach(async () => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    db = new DatabaseManager(dbPath);
    await db.initialize();
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  const insertPatient = (id: string) =>
    db.executeUpdate(
      `INSERT INTO patients (id, first_name, last_name, date_of_birth, phone, created_at, updated_at)
       VALUES (?, 'Demo', 'Patient', '1990-01-01', '0100000000', ?, ?)`,
      [id, new Date().toISOString(), new Date().toISOString()]
    );

  it('commits several writes made inside one transaction', () => {
    db.executeTransaction(() => {
      insertPatient('p1');
      insertPatient('p2');
    });
    const row = db.executeQueryOne<any>('SELECT COUNT(*) as c FROM patients');
    expect(row.c).toBe(2);
  });

  it('rolls back every write when the transaction throws', () => {
    expect(() =>
      db.executeTransaction(() => {
        insertPatient('p1');
        throw new Error('boom');
      })
    ).toThrow('boom');
    const row = db.executeQueryOne<any>('SELECT COUNT(*) as c FROM patients');
    expect(row.c).toBe(0);
  });

  it('keeps working after a failed transaction', () => {
    expect(() => db.executeTransaction(() => { throw new Error('x'); })).toThrow('x');
    db.executeTransaction(() => insertPatient('p3'));
    expect(db.executeQueryOne<any>('SELECT COUNT(*) as c FROM patients').c).toBe(1);
  });
});
