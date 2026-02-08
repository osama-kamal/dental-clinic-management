import fc from 'fast-check';
import { DatabaseManager } from '../../database/DatabaseManager';
import { AppointmentService, AppointmentInput } from './AppointmentService';
import { PatientService } from './PatientService';
import { AuthService } from './AuthService';
import path from 'path';
import fs from 'fs';

describe('AppointmentService Property Tests', () => {
  let db: DatabaseManager;
  let appointmentService: AppointmentService;
  let patientService: PatientService;
  let authService: AuthService;
  let testDbPath: string;
  let testUserId: string;
  let testPatientId: string;
  let testDentistId: string;

  beforeEach(async () => {
    // Create a unique test database for each test
    testDbPath = path.join(__dirname, `../../test-db-${Date.now()}-${Math.random()}.db`);
    db = new DatabaseManager(testDbPath);
    await db.initialize();

    appointmentService = new AppointmentService(db);
    patientService = new PatientService(db);
    authService = new AuthService(db);

    // Create test users
    const adminUser = authService.createUser({
      username: 'admin',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'Administrator',
    });
    testUserId = adminUser.id;

    const dentist = authService.createUser({
      username: 'dentist',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Dentist',
      role: 'Dentist',
    });
    testDentistId = dentist.id;

    // Create test patient
    const patient = patientService.createPatient({
      firstName: 'Test',
      lastName: 'Patient',
      dateOfBirth: new Date('1990-01-01'),
      phone: '555-0100',
    });
    testPatientId = patient.id;
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Clean up WAL and SHM files
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  // Feature: dental-clinic-management, Property 14: Appointment creation validation
  // **Validates: Requirements 3.1**
  describe('Property 14: Appointment creation validation', () => {
    it('should reject appointment creation with missing patientId', () => {
      fc.assert(
        fc.property(
          fc.record({
            dentistId: fc.constant(testDentistId),
            startTime: fc.date({ min: new Date() }),
            duration: fc.integer({ min: 15, max: 240 }),
            appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Consultation', 'Treatment'),
          }),
          (data) => {
            const invalidData = { ...data, patientId: '' };
            expect(() => {
              appointmentService.createAppointment(invalidData as AppointmentInput, testUserId);
            }).toThrow('Patient ID is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject appointment creation with missing dentistId', () => {
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.constant(testPatientId),
            startTime: fc.date({ min: new Date() }),
            duration: fc.integer({ min: 15, max: 240 }),
            appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Consultation', 'Treatment'),
          }),
          (data) => {
            const invalidData = { ...data, dentistId: '' };
            expect(() => {
              appointmentService.createAppointment(invalidData as AppointmentInput, testUserId);
            }).toThrow('Dentist ID is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject appointment creation with missing startTime', () => {
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.constant(testPatientId),
            dentistId: fc.constant(testDentistId),
            duration: fc.integer({ min: 15, max: 240 }),
            appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Consultation', 'Treatment'),
          }),
          (data) => {
            const invalidData = { ...data, startTime: null as any };
            expect(() => {
              appointmentService.createAppointment(invalidData, testUserId);
            }).toThrow('Start time is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject appointment creation with missing or invalid duration', () => {
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.constant(testPatientId),
            dentistId: fc.constant(testDentistId),
            startTime: fc.date({ min: new Date() }),
            appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Consultation', 'Treatment'),
          }),
          fc.integer({ min: -100, max: 0 }),
          (data, invalidDuration) => {
            const invalidData = { ...data, duration: invalidDuration };
            expect(() => {
              appointmentService.createAppointment(invalidData, testUserId);
            }).toThrow('Duration is required and must be positive');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject appointment creation with missing appointmentType', () => {
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.constant(testPatientId),
            dentistId: fc.constant(testDentistId),
            startTime: fc.date({ min: new Date() }),
            duration: fc.integer({ min: 15, max: 240 }),
          }),
          (data) => {
            const invalidData = { ...data, appointmentType: '' };
            expect(() => {
              appointmentService.createAppointment(invalidData as AppointmentInput, testUserId);
            }).toThrow('Appointment type is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept appointment creation with all required fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.constant(testPatientId),
            dentistId: fc.constant(testDentistId),
            startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
            duration: fc.integer({ min: 15, max: 240 }),
            appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Consultation', 'Treatment'),
            notes: fc.option(fc.string({ maxLength: 500 })),
          }),
          (data) => {
            const appointment = appointmentService.createAppointment(data, testUserId);
            expect(appointment).toBeDefined();
            expect(appointment.id).toBeDefined();
            expect(appointment.patientId).toBe(data.patientId);
            expect(appointment.dentistId).toBe(data.dentistId);
            expect(appointment.duration).toBe(data.duration);
            expect(appointment.appointmentType).toBe(data.appointmentType);
            expect(appointment.status).toBe('Scheduled');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 16: Appointment persistence round-trip
  // **Validates: Requirements 3.3**
  describe('Property 16: Appointment persistence round-trip', () => {
    it('should persist and retrieve appointment data correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            patientId: fc.constant(testPatientId),
            dentistId: fc.constant(testDentistId),
            startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
            duration: fc.integer({ min: 15, max: 240 }),
            appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Consultation', 'Treatment', 'Emergency'),
            notes: fc.option(fc.string({ maxLength: 500 })),
          }),
          (data) => {
            // Create appointment
            const created = appointmentService.createAppointment(data, testUserId);

            // Retrieve appointment
            const retrieved = appointmentService.getAppointment(created.id);

            // Verify equivalence
            expect(retrieved).toBeDefined();
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.patientId).toBe(data.patientId);
            expect(retrieved!.dentistId).toBe(data.dentistId);
            expect(retrieved!.startTime.getTime()).toBe(data.startTime.getTime());
            expect(retrieved!.duration).toBe(data.duration);
            expect(retrieved!.appointmentType).toBe(data.appointmentType);
            expect(retrieved!.status).toBe('Scheduled');
            if (data.notes) {
              expect(retrieved!.notes).toBe(data.notes);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 15: Appointment conflict detection
  // **Validates: Requirements 3.2, 3.6, 3.9**
  describe('Property 15: Appointment conflict detection', () => {
    it('should detect conflicts when appointments overlap for the same dentist', () => {
      fc.assert(
        fc.property(
          fc.record({
            startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
            duration1: fc.integer({ min: 30, max: 120 }),
            duration2: fc.integer({ min: 30, max: 120 }),
            offsetMinutes: fc.integer({ min: -60, max: 60 }), // Offset for second appointment
          }),
          (data) => {
            // Create first appointment
            const appointment1 = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: data.startTime,
                duration: data.duration1,
                appointmentType: 'Checkup',
              },
              testUserId
            );

            // Try to create overlapping appointment
            const overlappingStartTime = new Date(
              data.startTime.getTime() + data.offsetMinutes * 60000
            );

            // Calculate if appointments would overlap
            const end1 = data.startTime.getTime() + data.duration1 * 60000;
            const start2 = overlappingStartTime.getTime();
            const end2 = start2 + data.duration2 * 60000;
            const wouldOverlap = start2 < end1 && end2 > data.startTime.getTime();

            if (wouldOverlap) {
              // Should throw conflict error
              expect(() => {
                appointmentService.createAppointment(
                  {
                    patientId: testPatientId,
                    dentistId: testDentistId, // Same dentist
                    startTime: overlappingStartTime,
                    duration: data.duration2,
                    appointmentType: 'Cleaning',
                  },
                  testUserId
                );
              }).toThrow('Appointment conflict detected');
            } else {
              // Should succeed
              const appointment2 = appointmentService.createAppointment(
                {
                  patientId: testPatientId,
                  dentistId: testDentistId,
                  startTime: overlappingStartTime,
                  duration: data.duration2,
                  appointmentType: 'Cleaning',
                },
                testUserId
              );
              expect(appointment2).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow appointments at the same time for different dentists', () => {
      fc.assert(
        fc.property(
          fc.record({
            startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
            duration: fc.integer({ min: 30, max: 120 }),
          }),
          (data) => {
            // Create second dentist
            const dentist2 = authService.createUser({
              username: `dentist-${Date.now()}-${Math.random()}`,
              password: 'password123',
              firstName: 'Another',
              lastName: 'Dentist',
              role: 'Dentist',
            });

            // Create appointment for first dentist
            const appointment1 = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: data.startTime,
                duration: data.duration,
                appointmentType: 'Checkup',
              },
              testUserId
            );

            // Create appointment for second dentist at the same time - should succeed
            const appointment2 = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: dentist2.id,
                startTime: data.startTime,
                duration: data.duration,
                appointmentType: 'Cleaning',
              },
              testUserId
            );

            expect(appointment1).toBeDefined();
            expect(appointment2).toBeDefined();
            expect(appointment1.dentistId).not.toBe(appointment2.dentistId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow rescheduling without conflict when time slot is free', () => {
      fc.assert(
        fc.property(
          fc.record({
            startTime1: fc.date({ min: new Date(), max: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
            startTime2: fc.date({ min: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), max: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }),
            duration: fc.integer({ min: 30, max: 120 }),
          }),
          (data) => {
            // Create appointment
            const appointment = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: data.startTime1,
                duration: data.duration,
                appointmentType: 'Checkup',
              },
              testUserId
            );

            // Reschedule to a non-conflicting time
            const updated = appointmentService.updateAppointment(appointment.id, {
              startTime: data.startTime2,
            });

            expect(updated.startTime.getTime()).toBe(data.startTime2.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 19: Appointment reminder generation
  // **Validates: Requirements 3.8**
  describe('Property 19: Appointment reminder generation', () => {
    it('should generate reminders for appointments 24 hours in the future', () => {
      fc.assert(
        fc.property(
          fc.record({
            // Generate times around 24 hours from now (within a 10-minute window)
            minutesOffset: fc.integer({ min: -5, max: 5 }),
            duration: fc.integer({ min: 30, max: 120 }),
          }),
          (data) => {
            const now = new Date();
            const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000 + data.minutesOffset * 60 * 1000);

            // Create appointment scheduled for ~24 hours from now
            const appointment = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: reminderTime,
                duration: data.duration,
                appointmentType: 'Checkup',
              },
              testUserId
            );

            // Generate reminders
            const reminders = appointmentService.generateReminders();

            // Check if this appointment is in the reminders
            const foundReminder = reminders.find(r => r.appointmentId === appointment.id);

            if (Math.abs(data.minutesOffset) <= 5) {
              // Should be included in reminders (within 5-minute window)
              expect(foundReminder).toBeDefined();
              expect(foundReminder!.patientId).toBe(testPatientId);
              expect(foundReminder!.dentistId).toBe(testDentistId);
              expect(foundReminder!.appointmentType).toBe('Checkup');
            } else {
              // Might not be included if outside the window
              // This is acceptable as the window is narrow
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not generate reminders for cancelled appointments', () => {
      fc.assert(
        fc.property(
          fc.record({
            duration: fc.integer({ min: 30, max: 120 }),
          }),
          (data) => {
            const now = new Date();
            const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Create appointment
            const appointment = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: reminderTime,
                duration: data.duration,
                appointmentType: 'Checkup',
              },
              testUserId
            );

            // Cancel the appointment
            appointmentService.cancelAppointment(appointment.id, 'Patient cancelled');

            // Generate reminders
            const reminders = appointmentService.generateReminders();

            // Cancelled appointment should not be in reminders
            const foundReminder = reminders.find(r => r.appointmentId === appointment.id);
            expect(foundReminder).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not generate reminders for appointments not scheduled 24 hours ahead', () => {
      fc.assert(
        fc.property(
          fc.record({
            hoursAhead: fc.integer({ min: 1, max: 23 }).chain(h => fc.constant(h))
              .chain(h => fc.oneof(fc.constant(h), fc.integer({ min: 25, max: 72 }))),
            duration: fc.integer({ min: 30, max: 120 }),
          }),
          (data) => {
            const now = new Date();
            const appointmentTime = new Date(now.getTime() + data.hoursAhead * 60 * 60 * 1000);

            // Create appointment
            const appointment = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: appointmentTime,
                duration: data.duration,
                appointmentType: 'Checkup',
              },
              testUserId
            );

            // Generate reminders
            const reminders = appointmentService.generateReminders();

            // Should not be in reminders if not ~24 hours ahead
            const foundReminder = reminders.find(r => r.appointmentId === appointment.id);
            
            if (data.hoursAhead >= 23.9 && data.hoursAhead <= 24.1) {
              // Might be included if very close to 24 hours
            } else {
              // Should not be included
              expect(foundReminder).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 18: Appointment cancellation preservation
  // **Validates: Requirements 3.7**
  describe('Property 18: Appointment cancellation preservation', () => {
    it('should update status to Cancelled and preserve the record', () => {
      fc.assert(
        fc.property(
          fc.record({
            startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
            duration: fc.integer({ min: 30, max: 120 }),
            appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Consultation', 'Treatment'),
            cancellationReason: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          (data) => {
            // Create appointment
            const appointment = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: data.startTime,
                duration: data.duration,
                appointmentType: data.appointmentType,
              },
              testUserId
            );

            expect(appointment.status).toBe('Scheduled');

            // Cancel appointment
            const cancelled = appointmentService.cancelAppointment(
              appointment.id,
              data.cancellationReason
            );

            // Verify status is updated to Cancelled
            expect(cancelled.status).toBe('Cancelled');
            expect(cancelled.cancellationReason).toBe(data.cancellationReason);

            // Verify record is preserved (not deleted)
            const retrieved = appointmentService.getAppointment(appointment.id);
            expect(retrieved).toBeDefined();
            expect(retrieved!.id).toBe(appointment.id);
            expect(retrieved!.status).toBe('Cancelled');
            expect(retrieved!.cancellationReason).toBe(data.cancellationReason);

            // Verify all other fields are preserved
            expect(retrieved!.patientId).toBe(testPatientId);
            expect(retrieved!.dentistId).toBe(testDentistId);
            expect(retrieved!.startTime.getTime()).toBe(data.startTime.getTime());
            expect(retrieved!.duration).toBe(data.duration);
            expect(retrieved!.appointmentType).toBe(data.appointmentType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should keep cancelled appointments in the database', () => {
      fc.assert(
        fc.property(
          fc.record({
            startTime: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
            duration: fc.integer({ min: 30, max: 120 }),
            cancellationReason: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          (data) => {
            // Create appointment
            const appointment = appointmentService.createAppointment(
              {
                patientId: testPatientId,
                dentistId: testDentistId,
                startTime: data.startTime,
                duration: data.duration,
                appointmentType: 'Checkup',
              },
              testUserId
            );

            const appointmentId = appointment.id;

            // Cancel appointment
            appointmentService.cancelAppointment(appointmentId, data.cancellationReason);

            // Get all appointments - cancelled one should still be there
            const allAppointments = appointmentService.getAllAppointments();
            const found = allAppointments.find(a => a.id === appointmentId);

            expect(found).toBeDefined();
            expect(found!.status).toBe('Cancelled');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
