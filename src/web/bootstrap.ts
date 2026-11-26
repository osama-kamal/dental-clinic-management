import { Buffer } from 'buffer';
import bcrypt from 'bcryptjs';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { DatabaseManager } from '../database/DatabaseManager';
import { setupIpcHandlers } from '../main/ipc/ipcHandlers';
import { AuthService } from '../main/services/AuthService';
import { PatientService } from '../main/services/PatientService';
import { AppointmentService } from '../main/services/AppointmentService';
import { TreatmentService } from '../main/services/TreatmentService';
import { BillingService } from '../main/services/BillingService';
import { InventoryService } from '../main/services/InventoryService';
import { __preload, __setWriteListener } from './shims/fs';
import { loadFile, saveFileDebounced } from './persistence';

(globalThis as any).Buffer = Buffer;
(globalThis as any).__SQLJS_CONFIG__ = { locateFile: () => wasmUrl };

const DB_PATH = '/demo/clinic.db';

async function seed(db: DatabaseManager, auth: AuthService, demoPassword: string) {
  const patients = new PatientService(db);
  const appts = new AppointmentService(db);
  const treatments = new TreatmentService(db);
  const billing = new BillingService(db);
  const inventory = new InventoryService(db);

  const admin = (await auth.createUser({ username: 'demo', password: demoPassword, firstName: 'Demo', lastName: 'Admin', role: 'Administrator' })).data!;
  const dentist = (await auth.createUser({ username: 'dr.hassan', password: demoPassword + 'd', firstName: 'Hassan', lastName: 'Mahmoud', role: 'Dentist' })).data!;
  const dentist2 = (await auth.createUser({ username: 'dr.mona', password: demoPassword + 'm', firstName: 'Mona', lastName: 'Adel', role: 'Dentist' })).data!;

  const people: Array<[string, string, string, string, string[]]> = [
    ['Ahmed', 'Samir', '1988-03-14', '0100 000 0001', ['Penicillin']],
    ['Sara', 'Khaled', '1995-07-02', '0100 000 0002', []],
    ['Omar', 'Fathy', '1979-11-23', '0100 000 0003', ['Latex']],
    ['Nour', 'Ibrahim', '2001-01-30', '0100 000 0004', []],
    ['Laila', 'Mostafa', '1968-09-09', '0100 000 0005', []],
    ['Youssef', 'Adly', '2010-05-18', '0100 000 0006', []],
  ];
  const created = people.map(([firstName, lastName, dob, phone, allergies]) =>
    patients.createPatient({ firstName, lastName, dateOfBirth: new Date(dob), phone, allergies, email: `${firstName.toLowerCase()}@example.com` })
  );

  const today = new Date();
  const slot = (dayOffset: number, hour: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const types = ['Checkup', 'Cleaning', 'Filling', 'Consultation'];
  created.forEach((p, i) => {
    appts.createAppointment({ patientId: p.id, dentistId: i % 2 ? dentist2.id : dentist.id, startTime: slot(i % 3, 9 + i), duration: 30, appointmentType: types[i % 4] }, admin.id);
  });

  const plan = treatments.createTreatmentPlan(created[0].id, [
    { code: 'D2391', description: 'Composite filling', estimatedCost: 900 },
    { code: 'D1110', description: 'Scaling and polishing', estimatedCost: 450 },
  ], dentist.id);
  treatments.completeTreatment(plan.treatments[0].id, { completedBy: dentist.id });
  const inv = billing.createInvoice({ patientId: created[0].id, treatmentIds: [plan.treatments[0].id], taxRate: 0 }, admin.id);
  billing.recordPayment(inv.id, { amount: 500, method: 'Cash', date: new Date() }, admin.id);

  [
    ['Composite resin A2', 'Restorative', 'syringe', 14, 10, 120],
    ['Lidocaine 2%', 'Anesthetics', 'cartridge', 6, 20, 15],
    ['Nitrile gloves (M)', 'Consumables', 'box', 40, 12, 90],
    ['Dental floss', 'Consumables', 'pack', 3, 10, 25],
  ].forEach(([name, category, unitOfMeasure, currentQuantity, minimumThreshold, unitCost]) =>
    inventory.createItem({ name, category, unitOfMeasure, currentQuantity, minimumThreshold, unitCost } as any)
  );
}

export async function bootstrap(): Promise<void> {
  const saved = await loadFile(DB_PATH);
  if (saved) __preload(DB_PATH, saved);
  __setWriteListener((p, data) => { if (p === DB_PATH) saveFileDebounced(DB_PATH, data); });

  const db = new DatabaseManager(DB_PATH, '/demo/backups');
  await db.initialize();

  const handlers = new Map<string, (...a: any[]) => any>();
  setupIpcHandlers({ handle: (c: string, fn: any) => handlers.set(c, fn), on: () => {} } as any, db);

  // The visitor's private demo password lives only in memory for this page load.
  const auth = new AuthService(db);
  const demoPassword = 'demo-' + crypto.randomUUID();
  const isFresh = (db.executeQueryOne<any>('SELECT COUNT(*) as count FROM users')?.count ?? 0) === 0;
  if (isFresh) {
    await seed(db, auth, demoPassword);
  } else {
    // returning visitor: new in-memory demo password for this page load
    const hash = await bcrypt.hash(demoPassword, 10);
    db.executeUpdate("UPDATE users SET password_hash = ?, is_active = 1 WHERE username = 'demo'", [hash]);
  }
  (window as any).__DEMO__ = { username: 'demo', password: demoPassword };

  (window as any).api = {
    invoke: async (channel: string, ...args: any[]) => {
      const h = handlers.get(channel);
      if (!h) return { success: false, error: `Unknown channel ${channel}` };
      return h({}, ...args);
    },
    on: () => {},
    removeListener: () => {},
  };
}
