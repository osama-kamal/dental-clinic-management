import fc from 'fast-check';
import { ClinicalNotesService } from './ClinicalNotesService';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PatientService } from './PatientService';
import { AuthService } from './AuthService';
import { randomUUID } from 'crypto';

describe('ClinicalNotesService Property Tests', () => {
  let db: DatabaseManager;
  let clinicalNotesService: ClinicalNotesService;
  let patientService: PatientService;
  let authService: AuthService;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.initialize();
    clinicalNotesService = new ClinicalNotesService(db);
    patientService = new PatientService(db);
    authService = new AuthService(db);
  });

  afterEach(() => {
    db.close();
  });

  // Helper function to create test user
  const createTestUser = (role: 'Administrator' | 'Dentist' | 'Receptionist' = 'Dentist') => {
    return authService.createUser({
      username: `user_${randomUUID()}`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role,
    });
  };

  // Helper function to create test patient
  const createTestPatient = () => {
    return patientService.createPatient({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      phone: '555-0100',
    });
  };

  /**
   * Property 70: Clinical note metadata
   * For any clinical note created, it should have a timestamp (createdAt)
   * and be associated with the logged-in user (createdBy).
   * Validates: Requirements 13.2
   */
  describe('Property 70: Clinical note metadata', () => {
    it('should have timestamp and user association', () => {
      fc.assert(
        fc.property(
          fc.record({
            noteText: fc.string({ minLength: 10, maxLength: 500 }),
            noteType: fc.constantFrom('General', 'Treatment', 'Consultation'),
          }),
          (data) => {
            const user = createTestUser();
            const patient = createTestPatient();

            const beforeCreate = new Date();

            const note = clinicalNotesService.createClinicalNote(
              {
                patientId: patient.id,
                noteText: data.noteText,
                noteType: data.noteType as 'General' | 'Treatment' | 'Consultation',
              },
              user.id
            );

            const afterCreate = new Date();

            // Verify metadata
            expect(note.id).toBeDefined();
            expect(note.patientId).toBe(patient.id);
            expect(note.createdBy).toBe(user.id);
            expect(note.createdAt).toBeDefined();
            expect(note.updatedAt).toBeDefined();

            // Verify timestamp is within reasonable range
            expect(note.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
            expect(note.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 72: Clinical note history
   * For any clinical note modification, the modification should be tracked
   * in the history with timestamp and user ID.
   * Validates: Requirements 13.5
   */
  describe('Property 72: Clinical note history', () => {
    it('should track modification with updated timestamp', () => {
      fc.assert(
        fc.property(
          fc.record({
            originalText: fc.string({ minLength: 10, maxLength: 200 }),
            updatedText: fc.string({ minLength: 10, maxLength: 200 }),
            noteType: fc.constantFrom('General', 'Treatment', 'Consultation'),
          }),
          (data) => {
            const user = createTestUser();
            const patient = createTestPatient();

            // Create original note
            const note = clinicalNotesService.createClinicalNote(
              {
                patientId: patient.id,
                noteText: data.originalText,
                noteType: data.noteType as 'General' | 'Treatment' | 'Consultation',
              },
              user.id
            );

            const originalCreatedAt = note.createdAt;
            const originalUpdatedAt = note.updatedAt;

            // Wait a bit to ensure timestamp difference
            const waitTime = 10;
            const start = Date.now();
            while (Date.now() - start < waitTime) {
              // Busy wait
            }

            // Update note
            const beforeUpdate = new Date();
            const updatedNote = clinicalNotesService.updateClinicalNote(
              note.id,
              data.updatedText,
              user.id
            );
            const afterUpdate = new Date();

            // Verify modification tracking
            expect(updatedNote.noteText).toBe(data.updatedText);
            expect(updatedNote.createdAt.getTime()).toBe(originalCreatedAt.getTime());
            expect(updatedNote.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            expect(updatedNote.updatedAt.getTime()).toBeGreaterThanOrEqual(
              beforeUpdate.getTime() - 1000
            );
            expect(updatedNote.updatedAt.getTime()).toBeLessThanOrEqual(
              afterUpdate.getTime() + 1000
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 73: Attachment storage
   * For any document or image attached to a patient record, it should be stored
   * in the database as a BLOB with metadata (fileName, fileType, fileSize).
   * Validates: Requirements 13.6
   */
  describe('Property 73: Attachment storage', () => {
    it('should store attachment with complete metadata', () => {
      fc.assert(
        fc.property(
          fc.record({
            fileName: fc.string({ minLength: 5, maxLength: 50 }),
            fileType: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
            fileSize: fc.integer({ min: 100, max: 10000 }),
          }),
          (data) => {
            const user = createTestUser();
            const patient = createTestPatient();

            // Create file data buffer
            const fileData = Buffer.alloc(data.fileSize);
            for (let i = 0; i < data.fileSize; i++) {
              fileData[i] = i % 256;
            }

            const attachment = clinicalNotesService.uploadAttachment(
              {
                patientId: patient.id,
                fileName: data.fileName,
                fileType: data.fileType,
                fileData,
              },
              user.id
            );

            // Verify metadata
            expect(attachment.id).toBeDefined();
            expect(attachment.patientId).toBe(patient.id);
            expect(attachment.fileName).toBe(data.fileName);
            expect(attachment.fileType).toBe(data.fileType);
            expect(attachment.fileSize).toBe(data.fileSize);
            expect(attachment.uploadedBy).toBe(user.id);
            expect(attachment.createdAt).toBeDefined();

            // Verify file data is stored correctly
            expect(attachment.fileData).toBeDefined();
            expect(attachment.fileData.length).toBe(data.fileSize);
            expect(Buffer.compare(attachment.fileData, fileData)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 74: Attachment format support
   * For any file with extension .jpg, .jpeg, .png, or .pdf,
   * the system should accept it as a valid attachment.
   * Validates: Requirements 13.7
   */
  describe('Property 74: Attachment format support', () => {
    it('should accept valid file formats', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
          (fileType) => {
            const user = createTestUser();
            const patient = createTestPatient();

            const fileData = Buffer.from('test file content');

            // Should not throw error for valid formats
            expect(() => {
              clinicalNotesService.uploadAttachment(
                {
                  patientId: patient.id,
                  fileName: 'test-file',
                  fileType,
                  fileData,
                },
                user.id
              );
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid file formats', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('text/plain', 'application/zip', 'video/mp4', 'audio/mp3'),
          (fileType) => {
            const user = createTestUser();
            const patient = createTestPatient();

            const fileData = Buffer.from('test file content');

            // Should throw error for invalid formats
            expect(() => {
              clinicalNotesService.uploadAttachment(
                {
                  patientId: patient.id,
                  fileName: 'test-file',
                  fileType,
                  fileData,
                },
                user.id
              );
            }).toThrow('Invalid file type');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 75: Attachment inline viewing
   * For any attachment, it should be viewable within the application
   * without launching external applications.
   * Note: This property tests that attachments can be retrieved with their data,
   * which enables inline viewing in the UI.
   * Validates: Requirements 13.8
   */
  describe('Property 75: Attachment inline viewing', () => {
    it('should retrieve attachment with complete data for inline viewing', () => {
      fc.assert(
        fc.property(
          fc.record({
            fileName: fc.string({ minLength: 5, maxLength: 50 }),
            fileType: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
            fileSize: fc.integer({ min: 100, max: 5000 }),
          }),
          (data) => {
            const user = createTestUser();
            const patient = createTestPatient();

            // Create file data
            const fileData = Buffer.alloc(data.fileSize);
            for (let i = 0; i < data.fileSize; i++) {
              fileData[i] = (i * 7) % 256;
            }

            // Upload attachment
            const uploaded = clinicalNotesService.uploadAttachment(
              {
                patientId: patient.id,
                fileName: data.fileName,
                fileType: data.fileType,
                fileData,
              },
              user.id
            );

            // Retrieve attachment
            const retrieved = clinicalNotesService.getAttachment(uploaded.id);

            // Verify attachment can be retrieved with complete data
            expect(retrieved).toBeDefined();
            expect(retrieved!.fileData).toBeDefined();
            expect(retrieved!.fileData.length).toBe(data.fileSize);
            expect(retrieved!.fileType).toBe(data.fileType);

            // Verify data integrity (can be used for inline viewing)
            expect(Buffer.compare(retrieved!.fileData, fileData)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional test: Clinical notes completeness for patient
   */
  describe('Clinical notes completeness', () => {
    it('should retrieve all notes for a patient in chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              noteText: fc.string({ minLength: 10, maxLength: 200 }),
              noteType: fc.constantFrom('General', 'Treatment', 'Consultation'),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (notes) => {
            const user = createTestUser();
            const patient = createTestPatient();

            // Create notes
            const createdNotes = notes.map((note) =>
              clinicalNotesService.createClinicalNote(
                {
                  patientId: patient.id,
                  noteText: note.noteText,
                  noteType: note.noteType as 'General' | 'Treatment' | 'Consultation',
                },
                user.id
              )
            );

            // Retrieve all notes for patient
            const retrievedNotes = clinicalNotesService.getClinicalNotesByPatient(patient.id);

            // Verify all notes are retrieved
            expect(retrievedNotes.length).toBe(createdNotes.length);

            // Verify chronological order (most recent first)
            for (let i = 0; i < retrievedNotes.length - 1; i++) {
              expect(retrievedNotes[i].createdAt.getTime()).toBeGreaterThanOrEqual(
                retrievedNotes[i + 1].createdAt.getTime()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional test: Attachment metadata retrieval
   */
  describe('Attachment metadata retrieval', () => {
    it('should retrieve attachment metadata without file data', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              fileName: fc.string({ minLength: 5, maxLength: 30 }),
              fileType: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
              fileSize: fc.integer({ min: 100, max: 5000 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (attachments) => {
            const user = createTestUser();
            const patient = createTestPatient();

            // Upload attachments
            attachments.forEach((att) => {
              const fileData = Buffer.alloc(att.fileSize);
              clinicalNotesService.uploadAttachment(
                {
                  patientId: patient.id,
                  fileName: att.fileName,
                  fileType: att.fileType,
                  fileData,
                },
                user.id
              );
            });

            // Get metadata
            const metadata = clinicalNotesService.getAttachmentMetadata(patient.id);

            // Verify metadata is complete
            expect(metadata.length).toBe(attachments.length);
            metadata.forEach((meta) => {
              expect(meta.id).toBeDefined();
              expect(meta.fileName).toBeDefined();
              expect(meta.fileType).toBeDefined();
              expect(meta.fileSize).toBeGreaterThan(0);
              expect(meta.uploadedBy).toBe(user.id);
              expect(meta.createdAt).toBeDefined();
              // Verify fileData is not included in metadata
              expect((meta as any).fileData).toBeUndefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
