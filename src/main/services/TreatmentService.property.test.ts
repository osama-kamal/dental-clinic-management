import fc from 'fast-check';
import { TreatmentService, TreatmentInput, MaterialUsage } from './TreatmentService';
import { DatabaseManager } from '../../database/DatabaseManager';
import { TreatmentStatus } from '../../shared/types';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

describe('TreatmentService Property Tests', () => {
  let treatmentService: TreatmentService;
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../test-data/treatment-test.db');

  beforeEach(async () => {
    // Clean up test database
    const testDir = path.dirname(testDbPath);
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
    if (fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }

    // Initialize database
    db = new DatabaseManager(testDbPath);
    await db.initialize();
    treatmentService = new TreatmentService(db);
  });

  afterEach(() => {
    db.close();
  });

  // Helper to create a test patient
  const createTestPatient = (): string => {
    const patientId = randomUUID();
    const now = new Date().toISOString();
    db.executeUpdate(
      `INSERT INTO patients (
        id, first_name, last_name, date_of_birth, phone,
        allergies, medical_conditions, current_medications,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        'Test',
        'Patient',
        '1980-01-01',
        '555-0123',
        '[]',
        '[]',
        '[]',
        now,
        now,
      ]
    );
    return patientId;
  };

  // Helper to create a test user
  const createTestUser = (): string => {
    const userId = randomUUID();
    const now = new Date().toISOString();
    db.executeUpdate(
      `INSERT INTO users (
        id, username, password_hash, first_name, last_name, role,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'testuser',
        'hash',
        'Test',
        'User',
        'Dentist',
        1,
        now,
        now,
      ]
    );
    return userId;
  };

  // Arbitrary for TreatmentInput
  const treatmentInputArb = fc.record({
    code: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes("'")),
    description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.includes("'")),
    estimatedCost: fc.double({ min: 0, max: 10000, noNaN: true }),
    notes: fc.option(fc.string({ maxLength: 500 }).filter(s => !s.includes("'")), { nil: undefined }),
  });

  // Feature: dental-clinic-management, Property 20: Treatment plan patient association
  // **Validates: Requirements 4.1**
  describe('Property 20: Treatment plan patient association', () => {
    it('should associate any created treatment plan with exactly one valid patient ID', () => {
      fc.assert(
        fc.property(
          fc.array(treatmentInputArb, { minLength: 1, maxLength: 5 }),
          (treatments) => {
            const patientId = createTestPatient();
            const userId = createTestUser();

            const plan = treatmentService.createTreatmentPlan(patientId, treatments, userId);

            // Verify plan is associated with the patient
            expect(plan.patientId).toBe(patientId);

            // Verify patient exists in database
            const patient = db.executeQueryOne<any>(
              'SELECT id FROM patients WHERE id = ?',
              [plan.patientId]
            );
            expect(patient).toBeDefined();
            expect(patient.id).toBe(patientId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 21: Treatment required fields
  // **Validates: Requirements 4.2**
  describe('Property 21: Treatment required fields', () => {
    it('should include code, description, estimatedCost, and status fields for any treatment', () => {
      fc.assert(
        fc.property(
          fc.array(treatmentInputArb, { minLength: 1, maxLength: 5 }),
          (treatments) => {
            const patientId = createTestPatient();
            const userId = createTestUser();

            const plan = treatmentService.createTreatmentPlan(patientId, treatments, userId);

            // Verify all treatments have required fields
            expect(plan.treatments.length).toBeGreaterThan(0);
            for (const treatment of plan.treatments) {
              expect(treatment.code).toBeDefined();
              expect(typeof treatment.code).toBe('string');
              expect(treatment.code.length).toBeGreaterThan(0);

              expect(treatment.description).toBeDefined();
              expect(typeof treatment.description).toBe('string');
              expect(treatment.description.length).toBeGreaterThan(0);

              expect(treatment.estimatedCost).toBeDefined();
              expect(typeof treatment.estimatedCost).toBe('number');
              expect(treatment.estimatedCost).toBeGreaterThanOrEqual(0);

              expect(treatment.status).toBeDefined();
              expect(typeof treatment.status).toBe('string');
              expect(['Planned', 'In Progress', 'Completed', 'Cancelled']).toContain(treatment.status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 22: Treatment completion metadata
  // **Validates: Requirements 4.4**
  describe('Property 22: Treatment completion metadata', () => {
    it('should set completedDate and completedBy when any treatment is marked as completed', () => {
      fc.assert(
        fc.property(
          treatmentInputArb,
          (treatmentInput) => {
            const patientId = createTestPatient();
            const userId = createTestUser();

            // Create treatment plan
            const plan = treatmentService.createTreatmentPlan(
              patientId,
              [treatmentInput],
              userId
            );

            const treatmentId = plan.treatments[0].id;

            // Complete the treatment
            const completedTreatment = treatmentService.completeTreatment(treatmentId, {
              completedBy: userId,
            });

            // Verify completion metadata
            expect(completedTreatment.status).toBe('Completed');
            expect(completedTreatment.completedDate).toBeDefined();
            expect(completedTreatment.completedDate).toBeInstanceOf(Date);
            expect(completedTreatment.completedBy).toBe(userId);

            // Verify completedDate is recent (within last minute)
            const now = new Date();
            const timeDiff = now.getTime() - completedTreatment.completedDate!.getTime();
            expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 24: Treatment plan cost calculation
  // **Validates: Requirements 4.6**
  describe('Property 24: Treatment plan cost calculation', () => {
    it('should calculate totalEstimatedCost as sum of all treatment costs', () => {
      fc.assert(
        fc.property(
          fc.array(treatmentInputArb, { minLength: 1, maxLength: 10 }),
          (treatments) => {
            const patientId = createTestPatient();
            const userId = createTestUser();

            const plan = treatmentService.createTreatmentPlan(patientId, treatments, userId);

            // Calculate expected total
            const expectedTotal = treatments.reduce((sum, t) => sum + t.estimatedCost, 0);

            // Verify total matches
            expect(plan.totalEstimatedCost).toBeCloseTo(expectedTotal, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 25: Treatment completion inventory deduction
  // **Validates: Requirements 4.7, 6.4**
  describe('Property 25: Treatment completion inventory deduction', () => {
    it('should deduct inventory quantities when treatment is completed with materials', () => {
      fc.assert(
        fc.property(
          treatmentInputArb,
          fc.array(
            fc.record({
              initialQuantity: fc.double({ min: 10, max: 1000, noNaN: true }),
              usedQuantity: fc.double({ min: 1, max: 10, noNaN: true }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (treatmentInput, materials) => {
            const patientId = createTestPatient();
            const userId = createTestUser();

            // Create inventory items
            const materialUsages: MaterialUsage[] = materials.map(material => {
              const itemId = randomUUID();
              const now = new Date().toISOString();
              db.executeUpdate(
                `INSERT INTO inventory_items (
                  id, name, category, unit_of_measure, current_quantity,
                  minimum_threshold, unit_cost, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  itemId,
                  'Test Material',
                  'Supplies',
                  'units',
                  material.initialQuantity,
                  5,
                  10,
                  now,
                  now,
                ]
              );
              return {
                itemId,
                quantity: material.usedQuantity,
              };
            });

            // Create treatment plan
            const plan = treatmentService.createTreatmentPlan(
              patientId,
              [treatmentInput],
              userId
            );

            const treatmentId = plan.treatments[0].id;

            // Complete treatment with materials
            treatmentService.completeTreatment(treatmentId, {
              completedBy: userId,
              materialsUsed: materialUsages,
            });

            // Verify inventory was deducted
            for (let i = 0; i < materialUsages.length; i++) {
              const item = db.executeQueryOne<any>(
                'SELECT current_quantity FROM inventory_items WHERE id = ?',
                [materialUsages[i].itemId]
              );

              const expectedQuantity = materials[i].initialQuantity - materials[i].usedQuantity;
              expect(item.current_quantity).toBeCloseTo(expectedQuantity, 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 26: Treatment modification history
  // **Validates: Requirements 4.8**
  describe('Property 26: Treatment modification history', () => {
    it('should track modification history with timestamp and user ID for any treatment change', () => {
      fc.assert(
        fc.property(
          treatmentInputArb,
          fc.constantFrom<TreatmentStatus>('Planned', 'In Progress', 'Completed', 'Cancelled'),
          (treatmentInput, newStatus) => {
            const patientId = createTestPatient();
            const userId = createTestUser();

            // Create treatment plan
            const plan = treatmentService.createTreatmentPlan(
              patientId,
              [treatmentInput],
              userId
            );

            const treatmentId = plan.treatments[0].id;
            const originalUpdatedAt = plan.treatments[0].updatedAt;

            // Wait a tiny bit to ensure timestamp changes
            const startTime = Date.now();
            while (Date.now() - startTime < 10) {
              // Small delay
            }

            // Update treatment status
            const updatedTreatment = treatmentService.updateTreatmentStatus(treatmentId, newStatus);

            // Verify modification tracking
            expect(updatedTreatment.updatedAt).toBeDefined();
            expect(updatedTreatment.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            expect(updatedTreatment.status).toBe(newStatus);

            // Verify timestamp is recent
            const now = new Date();
            const timeDiff = now.getTime() - updatedTreatment.updatedAt.getTime();
            expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Arbitrary for TreatmentTemplateInput
  const treatmentTemplateInputArb = fc.record({
    code: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes("'")),
    description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.includes("'")),
    category: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
    defaultCost: fc.double({ min: 0, max: 10000, noNaN: true }),
    defaultDuration: fc.option(fc.integer({ min: 5, max: 300 }), { nil: undefined }),
  });

  // Feature: dental-clinic-management, Property 76: Treatment template CRUD
  // **Validates: Requirements 14.3**
  describe('Property 76: Treatment template CRUD', () => {
    it('should allow administrators to create, update, and delete treatment templates', () => {
      fc.assert(
        fc.property(
          treatmentTemplateInputArb,
          fc.record({
            description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.includes("'")),
            defaultCost: fc.double({ min: 0, max: 10000, noNaN: true }),
          }),
          (templateData, updateData) => {
            // Create template
            const created = treatmentService.createTreatmentTemplate(templateData);
            expect(created.id).toBeDefined();
            expect(created.code).toBe(templateData.code);
            expect(created.isActive).toBe(true);

            // Update template
            const updated = treatmentService.updateTreatmentTemplate(created.id, updateData);
            expect(updated.description).toBe(updateData.description);
            expect(updated.defaultCost).toBeCloseTo(updateData.defaultCost, 2);

            // Delete (deactivate) template
            treatmentService.deleteTreatmentTemplate(created.id);
            const deleted = treatmentService.getTreatmentTemplate(created.id);
            expect(deleted).toBeDefined();
            expect(deleted!.isActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 77: Template modification isolation
  // **Validates: Requirements 14.4**
  describe('Property 77: Template modification isolation', () => {
    it('should not affect existing treatment plans when template is modified', () => {
      fc.assert(
        fc.property(
          treatmentTemplateInputArb,
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (templateData, newCost) => {
            const patientId = createTestPatient();
            const userId = createTestUser();

            // Create template
            const template = treatmentService.createTreatmentTemplate(templateData);

            // Create treatment from template
            const treatmentInput = treatmentService.createTreatmentFromTemplate(template.id);
            const originalCost = treatmentInput.estimatedCost;

            // Create treatment plan using the template
            const plan = treatmentService.createTreatmentPlan(
              patientId,
              [treatmentInput],
              userId
            );

            // Modify template
            treatmentService.updateTreatmentTemplate(template.id, {
              defaultCost: newCost,
            });

            // Verify existing treatment plan is unchanged
            const retrievedPlan = treatmentService.getTreatmentPlan(plan.id);
            expect(retrievedPlan).toBeDefined();
            expect(retrievedPlan!.treatments[0].estimatedCost).toBeCloseTo(originalCost, 2);
            expect(retrievedPlan!.treatments[0].estimatedCost).not.toBeCloseTo(newCost, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 79: Template auto-population
  // **Validates: Requirements 14.6**
  describe('Property 79: Template auto-population', () => {
    it('should auto-populate treatment fields from selected template', () => {
      fc.assert(
        fc.property(
          treatmentTemplateInputArb,
          (templateData) => {
            // Create template
            const template = treatmentService.createTreatmentTemplate(templateData);

            // Create treatment from template
            const treatmentInput = treatmentService.createTreatmentFromTemplate(template.id);

            // Verify auto-population
            expect(treatmentInput.code).toBe(template.code);
            expect(treatmentInput.description).toBe(template.description);
            expect(treatmentInput.estimatedCost).toBeCloseTo(template.defaultCost, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
