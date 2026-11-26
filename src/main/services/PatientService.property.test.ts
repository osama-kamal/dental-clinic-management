import fc from 'fast-check';
import { resetData } from '../../test/dataReset';
import { PatientService, PatientInput } from './PatientService';
import { DatabaseManager } from '../../database/DatabaseManager';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('PatientService Property Tests', () => {
  let db: DatabaseManager;
  let patientService: PatientService;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a temporary database for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-test-'));
    testDbPath = path.join(tempDir, 'test.db');
    db = new DatabaseManager(testDbPath);
    await db.initialize();
    patientService = new PatientService(db);
  });

  afterEach(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      fs.rmdirSync(path.dirname(testDbPath));
    }
  });

  // Feature: dental-clinic-management, Property 6: Patient creation validation
  describe('Property 6: Patient creation validation', () => {
    /**
     * **Validates: Requirements 2.1**
     * For any patient creation attempt missing required fields (firstName, lastName, 
     * dateOfBirth, or phone), the creation should be rejected with a validation error.
     */
    it('should reject patient creation with missing firstName', () => {
      fc.assert(
        fc.property(
          fc.record({
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          }),
          (data) => {
            const invalidData = {
              firstName: '', // Empty firstName
              lastName: data.lastName,
              dateOfBirth: data.dateOfBirth,
              phone: data.phone,
            };

            expect(() => {
              patientService.createPatient(invalidData);
            }).toThrow('First name is required');
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });

    it('should reject patient creation with missing lastName', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          }),
          (data) => {
            const invalidData = {
              firstName: data.firstName,
              lastName: '', // Empty lastName
              dateOfBirth: data.dateOfBirth,
              phone: data.phone,
            };

            expect(() => {
              patientService.createPatient(invalidData);
            }).toThrow('Last name is required');
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });

    it('should reject patient creation with missing dateOfBirth', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          }),
          (data) => {
            const invalidData = {
              firstName: data.firstName,
              lastName: data.lastName,
              dateOfBirth: null as any, // Missing dateOfBirth
              phone: data.phone,
            };

            expect(() => {
              patientService.createPatient(invalidData);
            }).toThrow('Date of birth is required');
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });

    it('should reject patient creation with missing phone', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
          }),
          (data) => {
            const invalidData = {
              firstName: data.firstName,
              lastName: data.lastName,
              dateOfBirth: data.dateOfBirth,
              phone: '', // Empty phone
            };

            expect(() => {
              patientService.createPatient(invalidData);
            }).toThrow('Phone is required');
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });

    it('should accept patient creation with all required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          }),
          (data) => {
            const patient = patientService.createPatient(data);
            expect(patient).toBeDefined();
            expect(patient.id).toBeDefined();
            expect(patient.firstName).toBe(data.firstName);
            expect(patient.lastName).toBe(data.lastName);
            expect(patient.phone).toBe(data.phone.trim());
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 7: Patient persistence round-trip
  describe('Property 7: Patient persistence round-trip', () => {
    /**
     * **Validates: Requirements 2.2**
     * For any valid patient record saved to the database, querying by the patient ID 
     * should return a patient with equivalent data.
     */
    it('should persist and retrieve patient data correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            email: fc.option(fc.emailAddress(), { nil: undefined }),
            address: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            allergies: fc.option(fc.array(fc.string({ maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
            medicalConditions: fc.option(fc.array(fc.string({ maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
            currentMedications: fc.option(fc.array(fc.string({ maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
          }),
          (patientData) => {
            // Create patient
            const created = patientService.createPatient({
              ...patientData,
              allergies: patientData.allergies || undefined,
              medicalConditions: patientData.medicalConditions || undefined,
              currentMedications: patientData.currentMedications || undefined,
            });

            // Retrieve patient
            const retrieved = patientService.getPatient(created.id);

            // Verify equivalence
            expect(retrieved).toBeDefined();
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.firstName).toBe(patientData.firstName);
            expect(retrieved!.lastName).toBe(patientData.lastName);
            expect(retrieved!.phone).toBe(patientData.phone.trim());
            expect(retrieved!.email).toBe(patientData.email?.trim() || undefined);
            expect(retrieved!.address).toBe(patientData.address?.trim() || undefined);
            
            // Compare dates (allowing for millisecond differences)
            expect(Math.abs(retrieved!.dateOfBirth.getTime() - patientData.dateOfBirth.getTime())).toBeLessThan(1000);
            
            // Compare arrays
            expect(retrieved!.allergies).toEqual(patientData.allergies || []);
            expect(retrieved!.medicalConditions).toEqual(patientData.medicalConditions || []);
            expect(retrieved!.currentMedications).toEqual(patientData.currentMedications || []);
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 9: Patient ID uniqueness
  describe('Property 9: Patient ID uniqueness', () => {
    /**
     * **Validates: Requirements 2.4**
     * For any set of patients in the database, all patient IDs should be unique.
     */
    it('should generate unique patient IDs for all patients', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
              lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
              dateOfBirth: fc.date({ max: new Date() }),
              phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (patientsData) => {
            // Create multiple patients
            const createdPatients = patientsData.map((data) =>
              patientService.createPatient(data)
            );

            // Extract all patient IDs
            const patientIds = createdPatients.map((p) => p.id);

            // Verify all IDs are unique
            const uniqueIds = new Set(patientIds);
            expect(uniqueIds.size).toBe(patientIds.length);
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 8: Patient search correctness
  describe('Property 8: Patient search correctness', () => {
    /**
     * **Validates: Requirements 2.3**
     * For any patient search query, all returned results should match the query on 
     * at least one of: name (partial), phone (partial), email (partial), or patient ID (exact).
     */
    it('should return only patients matching the search query', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
              lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
              dateOfBirth: fc.date({ max: new Date() }),
              phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
              email: fc.option(fc.emailAddress(), { nil: undefined }),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          (patientsData, searchQuery) => {
            // Create multiple patients
            const createdPatients = patientsData.map((data) =>
              patientService.createPatient(data)
            );

            // Search for patients
            const results = patientService.searchPatients({ query: searchQuery });

            // Verify all results match the search query
            results.forEach((patient) => {
              const query = searchQuery.trim().toLowerCase();
              const matchesFirstName = patient.firstName.toLowerCase().includes(query);
              const matchesLastName = patient.lastName.toLowerCase().includes(query);
              const matchesPhone = patient.phone.toLowerCase().includes(query);
              const matchesEmail = patient.email?.toLowerCase().includes(query) || false;
              const matchesId = patient.id.toLowerCase() === query;

              expect(
                matchesFirstName ||
                  matchesLastName ||
                  matchesPhone ||
                  matchesEmail ||
                  matchesId
              ).toBe(true);
            });
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 12: Patient deletion referential integrity
  describe('Property 12: Patient deletion referential integrity', () => {
    /**
     * **Validates: Requirements 2.7**
     * For any patient with associated appointments or treatments, deletion should be 
     * prevented and return an error.
     */
    it('should prevent deletion of patient with appointments', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          }),
          (patientData) => {
            // Create a patient
            const patient = patientService.createPatient(patientData);

            // A real user row is needed: foreign keys are enforced
            const refUserId = 'ref-user-' + Math.random().toString(36).slice(2);
            db.executeUpdate(
              `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
               VALUES (?, ?, 'hash', 'Ref', 'User', 'Dentist', 1, ?, ?)`,
              [refUserId, refUserId, new Date().toISOString(), new Date().toISOString()]
            );
            // Create an appointment for the patient (simulated by inserting directly)
            db.executeUpdate(
              `INSERT INTO appointments (
                id, patient_id, dentist_id, start_time, duration, 
                appointment_type, status, created_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'test-appointment-id',
                patient.id,
                refUserId,
                new Date().toISOString(),
                60,
                'Checkup',
                'Scheduled',
                refUserId,
                new Date().toISOString(),
                new Date().toISOString(),
              ]
            );

            // Attempt to delete the patient
            expect(() => {
              patientService.deletePatient(patient.id);
            }).toThrow('Cannot delete patient with associated appointments');
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });

    it('should prevent deletion of patient with treatment plans', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          }),
          (patientData) => {
            // Create a patient
            const patient = patientService.createPatient(patientData);

            // A real user row is needed: foreign keys are enforced
            const refUserId = 'ref-user-' + Math.random().toString(36).slice(2);
            db.executeUpdate(
              `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
               VALUES (?, ?, 'hash', 'Ref', 'User', 'Dentist', 1, ?, ?)`,
              [refUserId, refUserId, new Date().toISOString(), new Date().toISOString()]
            );
            // Create a treatment plan for the patient (simulated by inserting directly)
            db.executeUpdate(
              `INSERT INTO treatment_plans (
                id, patient_id, created_by, total_estimated_cost, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                'test-treatment-plan-id',
                patient.id,
                refUserId,
                100.0,
                new Date().toISOString(),
                new Date().toISOString(),
              ]
            );

            // Attempt to delete the patient
            expect(() => {
              patientService.deletePatient(patient.id);
            }).toThrow('Cannot delete patient with associated treatment plans');
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });

    it('should allow deletion of patient without appointments or treatments', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
            dateOfBirth: fc.date({ max: new Date() }),
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.trim()),
          }),
          (patientData) => {
            // Create a patient
            const patient = patientService.createPatient(patientData);

            // Delete the patient (should succeed)
            const result = patientService.deletePatient(patient.id);
            expect(result).toBe(true);

            // Verify patient is deleted
            const retrieved = patientService.getPatient(patient.id);
            expect(retrieved).toBeNull();
          }
        ).beforeEach(() => { resetData(db); }),
        { numRuns: 100 }
      );
    });
  });
});
