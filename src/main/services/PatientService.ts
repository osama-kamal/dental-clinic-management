import { DatabaseManager } from '../../database/DatabaseManager';
import { Patient, EmergencyContact, ApiResponse } from '../../shared/types';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export interface PatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  allergies?: string[];
  medicalConditions?: string[];
  currentMedications?: string[];
}

export interface PatientSearchQuery {
  query?: string;
  page?: number;
  pageSize?: number;
}

export class PatientService {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new patient record
   * Validates required fields and generates unique patient ID
   * Requirements: 2.1, 2.2, 2.4
   */
  createPatient(data: PatientInput): Patient {
    // Validate required fields
    if (!data.firstName || data.firstName.trim() === '') {
      throw new Error('First name is required');
    }
    if (!data.lastName || data.lastName.trim() === '') {
      throw new Error('Last name is required');
    }
    if (!data.dateOfBirth) {
      throw new Error('Date of birth is required');
    }
    if (!data.phone || data.phone.trim() === '') {
      throw new Error('Phone is required');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    try {
      this.db.executeUpdate(
        `INSERT INTO patients (
          id, first_name, last_name, date_of_birth, phone, email, address,
          emergency_contact_name, emergency_contact_phone,
          allergies, medical_conditions, current_medications,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.firstName.trim(),
          data.lastName.trim(),
          data.dateOfBirth.toISOString(),
          data.phone.trim(),
          data.email?.trim() || null,
          data.address?.trim() || null,
          data.emergencyContact?.name || null,
          data.emergencyContact?.phone || null,
          JSON.stringify(data.allergies || []),
          JSON.stringify(data.medicalConditions || []),
          JSON.stringify(data.currentMedications || []),
          now,
          now,
        ]
      );

      const patient = this.getPatient(id);
      if (!patient) {
        throw new Error('Failed to retrieve created patient');
      }

      logger.info('Patient created', { patientId: id });
      return patient;
    } catch (error) {
      logger.error('Failed to create patient', { error, data });
      throw error;
    }
  }

  /**
   * Retrieve a patient by ID
   * Requirements: 2.2, 2.5
   */
  getPatient(id: string): Patient | null {
    try {
      const row = this.db.executeQueryOne<any>(
        'SELECT * FROM patients WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToPatient(row);
    } catch (error) {
      logger.error('Failed to retrieve patient', { error, id });
      throw error;
    }
  }

  /**
   * Update a patient record
   * Validates required fields before saving
   * Requirements: 2.6
   */
  updatePatient(id: string, data: Partial<PatientInput>): Patient {
    // Validate required fields if they are being updated
    if (data.firstName !== undefined && data.firstName.trim() === '') {
      throw new Error('First name cannot be empty');
    }
    if (data.lastName !== undefined && data.lastName.trim() === '') {
      throw new Error('Last name cannot be empty');
    }
    if (data.dateOfBirth !== undefined && !data.dateOfBirth) {
      throw new Error('Date of birth cannot be empty');
    }
    if (data.phone !== undefined && data.phone.trim() === '') {
      throw new Error('Phone cannot be empty');
    }

    // Check if patient exists
    const existing = this.getPatient(id);
    if (!existing) {
      throw new Error('Patient not found');
    }

    const now = new Date().toISOString();

    try {
      // Build update query dynamically based on provided fields
      const updates: string[] = [];
      const params: any[] = [];

      if (data.firstName !== undefined) {
        updates.push('first_name = ?');
        params.push(data.firstName.trim());
      }
      if (data.lastName !== undefined) {
        updates.push('last_name = ?');
        params.push(data.lastName.trim());
      }
      if (data.dateOfBirth !== undefined) {
        updates.push('date_of_birth = ?');
        params.push(data.dateOfBirth.toISOString());
      }
      if (data.phone !== undefined) {
        updates.push('phone = ?');
        params.push(data.phone.trim());
      }
      if (data.email !== undefined) {
        updates.push('email = ?');
        params.push(data.email?.trim() || null);
      }
      if (data.address !== undefined) {
        updates.push('address = ?');
        params.push(data.address?.trim() || null);
      }
      if (data.emergencyContact !== undefined) {
        updates.push('emergency_contact_name = ?');
        updates.push('emergency_contact_phone = ?');
        params.push(data.emergencyContact?.name || null);
        params.push(data.emergencyContact?.phone || null);
      }
      if (data.allergies !== undefined) {
        updates.push('allergies = ?');
        params.push(JSON.stringify(data.allergies));
      }
      if (data.medicalConditions !== undefined) {
        updates.push('medical_conditions = ?');
        params.push(JSON.stringify(data.medicalConditions));
      }
      if (data.currentMedications !== undefined) {
        updates.push('current_medications = ?');
        params.push(JSON.stringify(data.currentMedications));
      }

      updates.push('updated_at = ?');
      params.push(now);

      params.push(id);

      this.db.executeUpdate(
        `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const patient = this.getPatient(id);
      if (!patient) {
        throw new Error('Failed to retrieve updated patient');
      }

      logger.info('Patient updated', { patientId: id });
      return patient;
    } catch (error) {
      logger.error('Failed to update patient', { error, id, data });
      throw error;
    }
  }

  /**
   * Delete a patient record
   * Prevents deletion if patient has associated appointments or treatments
   * Requirements: 2.7
   */
  deletePatient(id: string): boolean {
    try {
      // Check if patient exists
      const patient = this.getPatient(id);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Check for associated appointments
      const appointments = this.db.executeQuery(
        'SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?',
        [id]
      );
      if (appointments[0] && (appointments[0] as any).count > 0) {
        throw new Error(
          'Cannot delete patient with associated appointments'
        );
      }

      // Check for associated treatment plans
      const treatmentPlans = this.db.executeQuery(
        'SELECT COUNT(*) as count FROM treatment_plans WHERE patient_id = ?',
        [id]
      );
      if (treatmentPlans[0] && (treatmentPlans[0] as any).count > 0) {
        throw new Error(
          'Cannot delete patient with associated treatment plans'
        );
      }

      // Delete patient
      this.db.executeUpdate('DELETE FROM patients WHERE id = ?', [id]);

      logger.info('Patient deleted', { patientId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete patient', { error, id });
      throw error;
    }
  }

  /**
   * Search for patients with partial matching
   * Searches by name, phone, email, or patient ID
   * Requirements: 2.3, 12.1
   */
  searchPatients(searchQuery: PatientSearchQuery): Patient[] {
    try {
      const { query, page = 1, pageSize = 100 } = searchQuery;

      let sql = 'SELECT * FROM patients';
      const params: any[] = [];

      if (query && query.trim() !== '') {
        const searchTerm = `%${query.trim().toLowerCase()}%`;
        sql += ` WHERE 
          LOWER(first_name) LIKE ? OR 
          LOWER(last_name) LIKE ? OR 
          LOWER(phone) LIKE ? OR 
          LOWER(email) LIKE ? OR 
          LOWER(id) = ?`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, query.trim().toLowerCase());
      }

      sql += ' ORDER BY last_name, first_name';

      // Add pagination
      const offset = (page - 1) * pageSize;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);

      const rows = this.db.executeQuery<any>(sql, params);
      return rows.map((row) => this.mapRowToPatient(row));
    } catch (error) {
      logger.error('Failed to search patients', { error, searchQuery });
      throw error;
    }
  }

  /**
   * Get all patients (for testing purposes)
   */
  getAllPatients(): Patient[] {
    try {
      const rows = this.db.executeQuery<any>(
        'SELECT * FROM patients ORDER BY last_name, first_name'
      );
      return rows.map((row) => this.mapRowToPatient(row));
    } catch (error) {
      logger.error('Failed to get all patients', { error });
      throw error;
    }
  }

  /**
   * Map database row to Patient object
   */
  private mapRowToPatient(row: any): Patient {
    const emergencyContact: EmergencyContact | undefined =
      row.emergency_contact_name && row.emergency_contact_phone
        ? {
            name: row.emergency_contact_name,
            phone: row.emergency_contact_phone,
          }
        : undefined;

    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: new Date(row.date_of_birth),
      phone: row.phone,
      email: row.email || undefined,
      address: row.address || undefined,
      emergencyContact,
      allergies: JSON.parse(row.allergies || '[]'),
      medicalConditions: JSON.parse(row.medical_conditions || '[]'),
      currentMedications: JSON.parse(row.current_medications || '[]'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
