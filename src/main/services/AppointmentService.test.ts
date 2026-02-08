import { DatabaseManager } from '../../database/DatabaseManager';
import { AppointmentService } from './AppointmentService';
import { PatientService } from './PatientService';
import { AuthService } from './AuthService';
import path from 'path';
import fs from 'fs';

describe('AppointmentService Unit Tests', () => {
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

  describe('createAppointment', () => {
    it('should create a valid appointment with all required fields', () => {
      const startTime = new Date('2024-06-15T10:00:00');
      const appointment = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime,
          duration: 60,
          appointmentType: 'Checkup',
          notes: 'Regular checkup',
        },
        testUserId
      );

      expect(appointment).toBeDefined();
      expect(appointment.id).toBeDefined();
      expect(appointment.patientId).toBe(testPatientId);
      expect(appointment.dentistId).toBe(testDentistId);
      expect(appointment.startTime.getTime()).toBe(startTime.getTime());
      expect(appointment.duration).toBe(60);
      expect(appointment.appointmentType).toBe('Checkup');
      expect(appointment.status).toBe('Scheduled');
      expect(appointment.notes).toBe('Regular checkup');
      expect(appointment.createdBy).toBe(testUserId);
    });

    it('should reject appointment with missing patientId', () => {
      expect(() => {
        appointmentService.createAppointment(
          {
            patientId: '',
            dentistId: testDentistId,
            startTime: new Date(),
            duration: 60,
            appointmentType: 'Checkup',
          },
          testUserId
        );
      }).toThrow('Patient ID is required');
    });

    it('should reject appointment with missing dentistId', () => {
      expect(() => {
        appointmentService.createAppointment(
          {
            patientId: testPatientId,
            dentistId: '',
            startTime: new Date(),
            duration: 60,
            appointmentType: 'Checkup',
          },
          testUserId
        );
      }).toThrow('Dentist ID is required');
    });

    it('should reject appointment with zero duration', () => {
      expect(() => {
        appointmentService.createAppointment(
          {
            patientId: testPatientId,
            dentistId: testDentistId,
            startTime: new Date(),
            duration: 0,
            appointmentType: 'Checkup',
          },
          testUserId
        );
      }).toThrow('Duration is required and must be positive');
    });

    it('should reject appointment with negative duration', () => {
      expect(() => {
        appointmentService.createAppointment(
          {
            patientId: testPatientId,
            dentistId: testDentistId,
            startTime: new Date(),
            duration: -30,
            appointmentType: 'Checkup',
          },
          testUserId
        );
      }).toThrow('Duration is required and must be positive');
    });

    it('should detect conflict when appointments overlap', () => {
      const startTime = new Date('2024-06-15T10:00:00');

      // Create first appointment
      appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime,
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      // Try to create overlapping appointment (starts 30 minutes later, overlaps by 30 minutes)
      expect(() => {
        appointmentService.createAppointment(
          {
            patientId: testPatientId,
            dentistId: testDentistId,
            startTime: new Date('2024-06-15T10:30:00'),
            duration: 60,
            appointmentType: 'Cleaning',
          },
          testUserId
        );
      }).toThrow('Appointment conflict detected');
    });

    it('should allow appointments at the same time for different dentists', () => {
      const dentist2 = authService.createUser({
        username: 'dentist2',
        password: 'password123',
        firstName: 'Another',
        lastName: 'Dentist',
        role: 'Dentist',
      });

      const startTime = new Date('2024-06-15T10:00:00');

      // Create appointment for first dentist
      const appointment1 = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime,
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      // Create appointment for second dentist at the same time - should succeed
      const appointment2 = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: dentist2.id,
          startTime,
          duration: 60,
          appointmentType: 'Cleaning',
        },
        testUserId
      );

      expect(appointment1).toBeDefined();
      expect(appointment2).toBeDefined();
      expect(appointment1.dentistId).not.toBe(appointment2.dentistId);
    });
  });

  describe('getAppointment', () => {
    it('should retrieve an existing appointment', () => {
      const created = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T10:00:00'),
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      const retrieved = appointmentService.getAppointment(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.patientId).toBe(testPatientId);
    });

    it('should return null for non-existent appointment', () => {
      const retrieved = appointmentService.getAppointment('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment fields', () => {
      const appointment = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T10:00:00'),
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      const newStartTime = new Date('2024-06-15T14:00:00');
      const updated = appointmentService.updateAppointment(appointment.id, {
        startTime: newStartTime,
        duration: 90,
        notes: 'Updated notes',
      });

      expect(updated.startTime.getTime()).toBe(newStartTime.getTime());
      expect(updated.duration).toBe(90);
      expect(updated.notes).toBe('Updated notes');
    });

    it('should throw error when updating non-existent appointment', () => {
      expect(() => {
        appointmentService.updateAppointment('non-existent-id', {
          duration: 90,
        });
      }).toThrow('Appointment not found');
    });

    it('should detect conflict when rescheduling to an occupied time slot', () => {
      // Create two appointments
      const appointment1 = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T10:00:00'),
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      const appointment2 = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T14:00:00'),
          duration: 60,
          appointmentType: 'Cleaning',
        },
        testUserId
      );

      // Try to reschedule appointment2 to overlap with appointment1
      expect(() => {
        appointmentService.updateAppointment(appointment2.id, {
          startTime: new Date('2024-06-15T10:30:00'),
        });
      }).toThrow('Appointment conflict detected');
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel an appointment and preserve the record', () => {
      const appointment = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T10:00:00'),
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      const cancelled = appointmentService.cancelAppointment(
        appointment.id,
        'Patient requested cancellation'
      );

      expect(cancelled.status).toBe('Cancelled');
      expect(cancelled.cancellationReason).toBe('Patient requested cancellation');

      // Verify record still exists
      const retrieved = appointmentService.getAppointment(appointment.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.status).toBe('Cancelled');
    });

    it('should throw error when cancelling non-existent appointment', () => {
      expect(() => {
        appointmentService.cancelAppointment('non-existent-id', 'Test reason');
      }).toThrow('Appointment not found');
    });
  });

  describe('getAppointmentsByDateRange', () => {
    it('should return appointments within the date range', () => {
      // Create appointments on different dates
      appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T10:00:00'),
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-20T14:00:00'),
          duration: 60,
          appointmentType: 'Cleaning',
        },
        testUserId
      );

      appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-25T09:00:00'),
          duration: 60,
          appointmentType: 'Treatment',
        },
        testUserId
      );

      const appointments = appointmentService.getAppointmentsByDateRange(
        new Date('2024-06-18T00:00:00'),
        new Date('2024-06-22T23:59:59')
      );

      expect(appointments).toHaveLength(1);
      expect(appointments[0].appointmentType).toBe('Cleaning');
    });
  });

  describe('generateReminders', () => {
    it('should generate reminders for appointments 24 hours ahead', () => {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const appointment = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: reminderTime,
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      const reminders = appointmentService.generateReminders();

      const found = reminders.find(r => r.appointmentId === appointment.id);
      expect(found).toBeDefined();
      expect(found!.patientId).toBe(testPatientId);
      expect(found!.dentistId).toBe(testDentistId);
    });

    it('should not generate reminders for cancelled appointments', () => {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const appointment = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: reminderTime,
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      appointmentService.cancelAppointment(appointment.id, 'Test cancellation');

      const reminders = appointmentService.generateReminders();

      const found = reminders.find(r => r.appointmentId === appointment.id);
      expect(found).toBeUndefined();
    });
  });

  describe('searchAppointments', () => {
    it('should filter appointments by patient', () => {
      const patient2 = patientService.createPatient({
        firstName: 'Another',
        lastName: 'Patient',
        dateOfBirth: new Date('1985-05-05'),
        phone: '555-0200',
      });

      appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T10:00:00'),
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      appointmentService.createAppointment(
        {
          patientId: patient2.id,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T14:00:00'),
          duration: 60,
          appointmentType: 'Cleaning',
        },
        testUserId
      );

      const results = appointmentService.searchAppointments({
        patientId: testPatientId,
      });

      expect(results).toHaveLength(1);
      expect(results[0].patientId).toBe(testPatientId);
    });

    it('should filter appointments by status', () => {
      const appointment1 = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T10:00:00'),
          duration: 60,
          appointmentType: 'Checkup',
        },
        testUserId
      );

      const appointment2 = appointmentService.createAppointment(
        {
          patientId: testPatientId,
          dentistId: testDentistId,
          startTime: new Date('2024-06-15T14:00:00'),
          duration: 60,
          appointmentType: 'Cleaning',
        },
        testUserId
      );

      appointmentService.cancelAppointment(appointment2.id, 'Test');

      const results = appointmentService.searchAppointments({
        status: 'Cancelled',
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(appointment2.id);
      expect(results[0].status).toBe('Cancelled');
    });
  });
});
