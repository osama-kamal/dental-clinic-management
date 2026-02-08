import { TreatmentService, TreatmentInput } from './TreatmentService';
import { DatabaseManager } from '../../database/DatabaseManager';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

describe('TreatmentService Unit Tests', () => {
  let treatmentService: TreatmentService;
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../test-data/treatment-unit-test.db');

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
        'John',
        'Doe',
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
        'dentist1',
        'hash',
        'Dr.',
        'Smith',
        'Dentist',
        1,
        now,
        now,
      ]
    );
    return userId;
  };

  describe('createTreatmentPlan', () => {
    it('should create a treatment plan with valid data', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const treatments: TreatmentInput[] = [
        {
          code: 'D0120',
          description: 'Periodic oral evaluation',
          estimatedCost: 75.0,
        },
        {
          code: 'D1110',
          description: 'Prophylaxis - adult',
          estimatedCost: 100.0,
        },
      ];

      const plan = treatmentService.createTreatmentPlan(patientId, treatments, userId);

      expect(plan.id).toBeDefined();
      expect(plan.patientId).toBe(patientId);
      expect(plan.treatments).toHaveLength(2);
      expect(plan.totalEstimatedCost).toBe(175.0);
      expect(plan.createdBy).toBe(userId);
    });

    it('should reject treatment plan with empty patient ID', () => {
      const userId = createTestUser();
      const treatments: TreatmentInput[] = [
        {
          code: 'D0120',
          description: 'Periodic oral evaluation',
          estimatedCost: 75.0,
        },
      ];

      expect(() => {
        treatmentService.createTreatmentPlan('', treatments, userId);
      }).toThrow('Patient ID is required');
    });

    it('should reject treatment plan with no treatments', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      expect(() => {
        treatmentService.createTreatmentPlan(patientId, [], userId);
      }).toThrow('At least one treatment is required');
    });

    it('should reject treatment with missing code', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const treatments: TreatmentInput[] = [
        {
          code: '',
          description: 'Periodic oral evaluation',
          estimatedCost: 75.0,
        },
      ];

      expect(() => {
        treatmentService.createTreatmentPlan(patientId, treatments, userId);
      }).toThrow('Treatment code is required');
    });

    it('should reject treatment with missing description', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const treatments: TreatmentInput[] = [
        {
          code: 'D0120',
          description: '',
          estimatedCost: 75.0,
        },
      ];

      expect(() => {
        treatmentService.createTreatmentPlan(patientId, treatments, userId);
      }).toThrow('Treatment description is required');
    });

    it('should reject treatment with negative cost', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const treatments: TreatmentInput[] = [
        {
          code: 'D0120',
          description: 'Periodic oral evaluation',
          estimatedCost: -10,
        },
      ];

      expect(() => {
        treatmentService.createTreatmentPlan(patientId, treatments, userId);
      }).toThrow('Treatment estimated cost is required and must be non-negative');
    });

    it('should reject treatment plan for non-existent patient', () => {
      const userId = createTestUser();
      const treatments: TreatmentInput[] = [
        {
          code: 'D0120',
          description: 'Periodic oral evaluation',
          estimatedCost: 75.0,
        },
      ];

      expect(() => {
        treatmentService.createTreatmentPlan('non-existent-id', treatments, userId);
      }).toThrow('Patient not found');
    });
  });

  describe('getTreatmentPlan', () => {
    it('should retrieve an existing treatment plan', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const treatments: TreatmentInput[] = [
        {
          code: 'D0120',
          description: 'Periodic oral evaluation',
          estimatedCost: 75.0,
        },
      ];

      const created = treatmentService.createTreatmentPlan(patientId, treatments, userId);
      const retrieved = treatmentService.getTreatmentPlan(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.patientId).toBe(patientId);
      expect(retrieved!.treatments).toHaveLength(1);
    });

    it('should return null for non-existent treatment plan', () => {
      const plan = treatmentService.getTreatmentPlan('non-existent-id');
      expect(plan).toBeNull();
    });
  });

  describe('getTreatmentsByPatient', () => {
    it('should retrieve all treatment plans for a patient', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      // Create two treatment plans
      treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D0120', description: 'Evaluation', estimatedCost: 75.0 }],
        userId
      );
      treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D1110', description: 'Cleaning', estimatedCost: 100.0 }],
        userId
      );

      const plans = treatmentService.getTreatmentsByPatient(patientId);

      expect(plans).toHaveLength(2);
      expect(plans[0].patientId).toBe(patientId);
      expect(plans[1].patientId).toBe(patientId);
    });

    it('should return empty array for patient with no treatment plans', () => {
      const patientId = createTestPatient();
      const plans = treatmentService.getTreatmentsByPatient(patientId);
      expect(plans).toHaveLength(0);
    });
  });

  describe('updateTreatmentStatus', () => {
    it('should update treatment status successfully', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const plan = treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D0120', description: 'Evaluation', estimatedCost: 75.0 }],
        userId
      );

      const treatmentId = plan.treatments[0].id;
      const updated = treatmentService.updateTreatmentStatus(treatmentId, 'In Progress');

      expect(updated.status).toBe('In Progress');
    });

    it('should reject invalid treatment status', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const plan = treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D0120', description: 'Evaluation', estimatedCost: 75.0 }],
        userId
      );

      const treatmentId = plan.treatments[0].id;

      expect(() => {
        treatmentService.updateTreatmentStatus(treatmentId, 'Invalid' as any);
      }).toThrow('Invalid treatment status');
    });
  });

  describe('completeTreatment', () => {
    it('should complete treatment with metadata', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const plan = treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D0120', description: 'Evaluation', estimatedCost: 75.0 }],
        userId
      );

      const treatmentId = plan.treatments[0].id;
      const completed = treatmentService.completeTreatment(treatmentId, {
        completedBy: userId,
        notes: 'Treatment completed successfully',
      });

      expect(completed.status).toBe('Completed');
      expect(completed.completedDate).toBeDefined();
      expect(completed.completedBy).toBe(userId);
      expect(completed.notes).toContain('Treatment completed successfully');
    });

    it('should reject completion without completedBy', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      const plan = treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D0120', description: 'Evaluation', estimatedCost: 75.0 }],
        userId
      );

      const treatmentId = plan.treatments[0].id;

      expect(() => {
        treatmentService.completeTreatment(treatmentId, {
          completedBy: '',
        });
      }).toThrow('Completed by user ID is required');
    });

    it('should deduct inventory when completing treatment with materials', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      // Create inventory item
      const itemId = randomUUID();
      const now = new Date().toISOString();
      db.executeUpdate(
        `INSERT INTO inventory_items (
          id, name, category, unit_of_measure, current_quantity,
          minimum_threshold, unit_cost, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, 'Dental Gloves', 'Supplies', 'boxes', 100, 10, 15.0, now, now]
      );

      // Create treatment plan
      const plan = treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D0120', description: 'Evaluation', estimatedCost: 75.0 }],
        userId
      );

      const treatmentId = plan.treatments[0].id;

      // Complete treatment with materials
      treatmentService.completeTreatment(treatmentId, {
        completedBy: userId,
        materialsUsed: [{ itemId, quantity: 5 }],
      });

      // Verify inventory was deducted
      const item = db.executeQueryOne<any>(
        'SELECT current_quantity FROM inventory_items WHERE id = ?',
        [itemId]
      );
      expect(item.current_quantity).toBe(95);
    });

    it('should reject completion with insufficient inventory', () => {
      const patientId = createTestPatient();
      const userId = createTestUser();

      // Create inventory item with low quantity
      const itemId = randomUUID();
      const now = new Date().toISOString();
      db.executeUpdate(
        `INSERT INTO inventory_items (
          id, name, category, unit_of_measure, current_quantity,
          minimum_threshold, unit_cost, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, 'Dental Gloves', 'Supplies', 'boxes', 3, 10, 15.0, now, now]
      );

      // Create treatment plan
      const plan = treatmentService.createTreatmentPlan(
        patientId,
        [{ code: 'D0120', description: 'Evaluation', estimatedCost: 75.0 }],
        userId
      );

      const treatmentId = plan.treatments[0].id;

      // Attempt to complete treatment with more materials than available
      expect(() => {
        treatmentService.completeTreatment(treatmentId, {
          completedBy: userId,
          materialsUsed: [{ itemId, quantity: 10 }],
        });
      }).toThrow('Insufficient inventory');
    });
  });

  describe('Treatment Template System', () => {
    describe('createTreatmentTemplate', () => {
      it('should create a treatment template with valid data', () => {
        const template = treatmentService.createTreatmentTemplate({
          code: 'D0120',
          description: 'Periodic oral evaluation',
          category: 'Diagnostic',
          defaultCost: 75.0,
          defaultDuration: 30,
        });

        expect(template.id).toBeDefined();
        expect(template.code).toBe('D0120');
        expect(template.description).toBe('Periodic oral evaluation');
        expect(template.category).toBe('Diagnostic');
        expect(template.defaultCost).toBe(75.0);
        expect(template.defaultDuration).toBe(30);
        expect(template.isActive).toBe(true);
      });

      it('should reject template with missing code', () => {
        expect(() => {
          treatmentService.createTreatmentTemplate({
            code: '',
            description: 'Periodic oral evaluation',
            category: 'Diagnostic',
            defaultCost: 75.0,
          });
        }).toThrow('Template code is required');
      });
    });

    describe('getTreatmentTemplate', () => {
      it('should retrieve an existing template', () => {
        const created = treatmentService.createTreatmentTemplate({
          code: 'D0120',
          description: 'Periodic oral evaluation',
          category: 'Diagnostic',
          defaultCost: 75.0,
        });

        const retrieved = treatmentService.getTreatmentTemplate(created.id);
        expect(retrieved).toBeDefined();
        expect(retrieved!.id).toBe(created.id);
        expect(retrieved!.code).toBe('D0120');
      });
    });

    describe('createTreatmentFromTemplate', () => {
      it('should create treatment input from template', () => {
        const template = treatmentService.createTreatmentTemplate({
          code: 'D0120',
          description: 'Periodic oral evaluation',
          category: 'Diagnostic',
          defaultCost: 75.0,
          defaultDuration: 30,
        });

        const treatmentInput = treatmentService.createTreatmentFromTemplate(template.id);

        expect(treatmentInput.code).toBe('D0120');
        expect(treatmentInput.description).toBe('Periodic oral evaluation');
        expect(treatmentInput.estimatedCost).toBe(75.0);
      });

      it('should not affect existing treatments when template is modified', () => {
        const patientId = createTestPatient();
        const userId = createTestUser();

        // Create template
        const template = treatmentService.createTreatmentTemplate({
          code: 'D0120',
          description: 'Evaluation',
          category: 'Diagnostic',
          defaultCost: 75.0,
        });

        // Create treatment from template
        const treatmentInput = treatmentService.createTreatmentFromTemplate(template.id);
        const plan = treatmentService.createTreatmentPlan(patientId, [treatmentInput], userId);

        // Modify template
        treatmentService.updateTreatmentTemplate(template.id, {
          defaultCost: 150.0,
        });

        // Verify existing treatment is unchanged
        const retrievedPlan = treatmentService.getTreatmentPlan(plan.id);
        expect(retrievedPlan!.treatments[0].estimatedCost).toBe(75.0);
      });
    });
  });
});
