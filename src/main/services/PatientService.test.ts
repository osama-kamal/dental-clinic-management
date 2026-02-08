import { PatientService, PatientInput } from './PatientService';
import { DatabaseManager } from '../../database/DatabaseManager';

// Mock DatabaseManager
jest.mock('../../database/DatabaseManager');

describe('PatientService Unit Tests', () => {
  let patientService: PatientService;
  let mockDb: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockDb = new DatabaseManager('test.db') as jest.Mocked<DatabaseManager>;
    patientService = new PatientService(mockDb);
  });

  describe('createPatient', () => {
    it('should reject patient creation with empty firstName', () => {
      const invalidData: PatientInput = {
        firstName: '',
        lastName: 'Doe',
        dateOfBirth: new Date('1980-01-01'),
        phone: '555-0123',
      };

      expect(() => {
        patientService.createPatient(invalidData);
      }).toThrow('First name is required');
    });

    it('should reject patient creation with empty lastName', () => {
      const invalidData: PatientInput = {
        firstName: 'John',
        lastName: '',
        dateOfBirth: new Date('1980-01-01'),
        phone: '555-0123',
      };

      expect(() => {
        patientService.createPatient(invalidData);
      }).toThrow('Last name is required');
    });

    it('should reject patient creation with missing dateOfBirth', () => {
      const invalidData: PatientInput = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: null as any,
        phone: '555-0123',
      };

      expect(() => {
        patientService.createPatient(invalidData);
      }).toThrow('Date of birth is required');
    });

    it('should reject patient creation with empty phone', () => {
      const invalidData: PatientInput = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1980-01-01'),
        phone: '',
      };

      expect(() => {
        patientService.createPatient(invalidData);
      }).toThrow('Phone is required');
    });

    it('should create patient with valid data', () => {
      const validData: PatientInput = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1980-01-01'),
        phone: '555-0123',
        email: 'john.doe@example.com',
      };

      const mockPatient = {
        id: 'test-id',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1980-01-01'),
        phone: '555-0123',
        email: 'john.doe@example.com',
        allergies: [],
        medicalConditions: [],
        currentMedications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.executeUpdate = jest.fn();
      mockDb.executeQueryOne = jest.fn().mockReturnValue({
        id: 'test-id',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1980-01-01T00:00:00.000Z',
        phone: '555-0123',
        email: 'john.doe@example.com',
        allergies: '[]',
        medical_conditions: '[]',
        current_medications: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const patient = patientService.createPatient(validData);

      expect(patient).toBeDefined();
      expect(patient.firstName).toBe('John');
      expect(patient.lastName).toBe('Doe');
      expect(patient.phone).toBe('555-0123');
      expect(mockDb.executeUpdate).toHaveBeenCalled();
    });
  });

  describe('updatePatient', () => {
    it('should reject update with empty firstName', () => {
      mockDb.executeQueryOne = jest.fn().mockReturnValue({
        id: 'test-id',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1980-01-01T00:00:00.000Z',
        phone: '555-0123',
        allergies: '[]',
        medical_conditions: '[]',
        current_medications: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(() => {
        patientService.updatePatient('test-id', { firstName: '' });
      }).toThrow('First name cannot be empty');
    });

    it('should reject update with empty lastName', () => {
      mockDb.executeQueryOne = jest.fn().mockReturnValue({
        id: 'test-id',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1980-01-01T00:00:00.000Z',
        phone: '555-0123',
        allergies: '[]',
        medical_conditions: '[]',
        current_medications: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(() => {
        patientService.updatePatient('test-id', { lastName: '' });
      }).toThrow('Last name cannot be empty');
    });

    it('should reject update with empty phone', () => {
      mockDb.executeQueryOne = jest.fn().mockReturnValue({
        id: 'test-id',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1980-01-01T00:00:00.000Z',
        phone: '555-0123',
        allergies: '[]',
        medical_conditions: '[]',
        current_medications: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(() => {
        patientService.updatePatient('test-id', { phone: '' });
      }).toThrow('Phone cannot be empty');
    });

    it('should throw error when patient not found', () => {
      mockDb.executeQueryOne = jest.fn().mockReturnValue(null);

      expect(() => {
        patientService.updatePatient('non-existent-id', { firstName: 'Jane' });
      }).toThrow('Patient not found');
    });
  });

  describe('deletePatient', () => {
    it('should prevent deletion of patient with appointments', () => {
      mockDb.executeQueryOne = jest.fn().mockReturnValue({
        id: 'test-id',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1980-01-01T00:00:00.000Z',
        phone: '555-0123',
        allergies: '[]',
        medical_conditions: '[]',
        current_medications: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.executeQuery = jest.fn().mockReturnValue([{ count: 1 }]);

      expect(() => {
        patientService.deletePatient('test-id');
      }).toThrow('Cannot delete patient with associated appointments');
    });

    it('should prevent deletion of patient with treatment plans', () => {
      mockDb.executeQueryOne = jest.fn().mockReturnValue({
        id: 'test-id',
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1980-01-01T00:00:00.000Z',
        phone: '555-0123',
        allergies: '[]',
        medical_conditions: '[]',
        current_medications: '[]',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockDb.executeQuery = jest
        .fn()
        .mockReturnValueOnce([{ count: 0 }]) // No appointments
        .mockReturnValueOnce([{ count: 1 }]); // Has treatment plans

      expect(() => {
        patientService.deletePatient('test-id');
      }).toThrow('Cannot delete patient with associated treatment plans');
    });

    it('should throw error when patient not found', () => {
      mockDb.executeQueryOne = jest.fn().mockReturnValue(null);

      expect(() => {
        patientService.deletePatient('non-existent-id');
      }).toThrow('Patient not found');
    });
  });

  describe('searchPatients', () => {
    it('should search patients by query', () => {
      const mockRows = [
        {
          id: 'test-id-1',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1980-01-01T00:00:00.000Z',
          phone: '555-0123',
          email: 'john@example.com',
          allergies: '[]',
          medical_conditions: '[]',
          current_medications: '[]',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockDb.executeQuery = jest.fn().mockReturnValue(mockRows);

      const results = patientService.searchPatients({ query: 'John' });

      expect(results).toHaveLength(1);
      expect(results[0].firstName).toBe('John');
      expect(mockDb.executeQuery).toHaveBeenCalled();
    });

    it('should return all patients when no query provided', () => {
      const mockRows = [
        {
          id: 'test-id-1',
          first_name: 'John',
          last_name: 'Doe',
          date_of_birth: '1980-01-01T00:00:00.000Z',
          phone: '555-0123',
          allergies: '[]',
          medical_conditions: '[]',
          current_medications: '[]',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-id-2',
          first_name: 'Jane',
          last_name: 'Smith',
          date_of_birth: '1985-05-15T00:00:00.000Z',
          phone: '555-0456',
          allergies: '[]',
          medical_conditions: '[]',
          current_medications: '[]',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockDb.executeQuery = jest.fn().mockReturnValue(mockRows);

      const results = patientService.searchPatients({});

      expect(results).toHaveLength(2);
      expect(mockDb.executeQuery).toHaveBeenCalled();
    });
  });
});
