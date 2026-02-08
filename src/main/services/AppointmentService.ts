import { DatabaseManager } from '../../database/DatabaseManager';
import { Appointment, AppointmentStatus, DateRange } from '../../shared/types';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export interface AppointmentInput {
  patientId: string;
  dentistId: string;
  startTime: Date;
  duration: number; // minutes
  appointmentType: string;
  notes?: string;
}

export interface AppointmentSearchQuery {
  patientId?: string;
  dentistId?: string;
  status?: AppointmentStatus;
  dateRange?: DateRange;
  page?: number;
  pageSize?: number;
}

export interface AppointmentReminder {
  appointmentId: string;
  patientId: string;
  dentistId: string;
  startTime: Date;
  appointmentType: string;
}

export class AppointmentService {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new appointment
   * Validates required fields and checks for conflicts
   * Requirements: 3.1, 3.2, 3.3, 3.6
   */
  createAppointment(data: AppointmentInput, createdBy: string): Appointment {
    // Validate required fields
    if (!data.patientId || data.patientId.trim() === '') {
      throw new Error('Patient ID is required');
    }
    if (!data.dentistId || data.dentistId.trim() === '') {
      throw new Error('Dentist ID is required');
    }
    if (!data.startTime) {
      throw new Error('Start time is required');
    }
    if (!data.duration || data.duration <= 0) {
      throw new Error('Duration is required and must be positive');
    }
    if (!data.appointmentType || data.appointmentType.trim() === '') {
      throw new Error('Appointment type is required');
    }

    // Check for conflicts
    const hasConflict = this.checkConflict(
      data.dentistId.trim(),
      data.startTime,
      data.duration
    );
    if (hasConflict) {
      throw new Error('Appointment conflict detected: The dentist already has an appointment during this time');
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const status: AppointmentStatus = 'Scheduled';

    try {
      this.db.executeUpdate(
        `INSERT INTO appointments (
          id, patient_id, dentist_id, start_time, duration, appointment_type,
          status, notes, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.patientId.trim(),
          data.dentistId.trim(),
          data.startTime.toISOString(),
          data.duration,
          data.appointmentType.trim(),
          status,
          data.notes?.trim() || null,
          createdBy,
          now,
          now,
        ]
      );

      const appointment = this.getAppointment(id);
      if (!appointment) {
        throw new Error('Failed to retrieve created appointment');
      }

      logger.info('Appointment created', { appointmentId: id });
      return appointment;
    } catch (error) {
      logger.error('Failed to create appointment', { error, data });
      throw error;
    }
  }

  /**
   * Retrieve an appointment by ID
   * Requirements: 3.3
   */
  getAppointment(id: string): Appointment | null {
    try {
      const row = this.db.executeQueryOne<any>(
        'SELECT * FROM appointments WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToAppointment(row);
    } catch (error) {
      logger.error('Failed to retrieve appointment', { error, id });
      throw error;
    }
  }

  /**
   * Update an appointment
   * Requirements: 3.3, 3.9
   */
  updateAppointment(id: string, data: Partial<AppointmentInput>): Appointment {
    // Check if appointment exists
    const existing = this.getAppointment(id);
    if (!existing) {
      throw new Error('Appointment not found');
    }

    // Validate fields if they are being updated
    if (data.duration !== undefined && data.duration <= 0) {
      throw new Error('Duration must be positive');
    }
    if (data.appointmentType !== undefined && data.appointmentType.trim() === '') {
      throw new Error('Appointment type cannot be empty');
    }

    // Check for conflicts if rescheduling (dentist, startTime, or duration changed)
    const dentistId = data.dentistId !== undefined ? data.dentistId.trim() : existing.dentistId;
    const startTime = data.startTime !== undefined ? data.startTime : existing.startTime;
    const duration = data.duration !== undefined ? data.duration : existing.duration;

    // Only check conflict if time-related fields are being changed
    if (data.dentistId !== undefined || data.startTime !== undefined || data.duration !== undefined) {
      const hasConflict = this.checkConflict(dentistId, startTime, duration, id);
      if (hasConflict) {
        throw new Error('Appointment conflict detected: The dentist already has an appointment during this time');
      }
    }

    const now = new Date().toISOString();

    try {
      // Build update query dynamically based on provided fields
      const updates: string[] = [];
      const params: any[] = [];

      if (data.patientId !== undefined) {
        updates.push('patient_id = ?');
        params.push(data.patientId.trim());
      }
      if (data.dentistId !== undefined) {
        updates.push('dentist_id = ?');
        params.push(data.dentistId.trim());
      }
      if (data.startTime !== undefined) {
        updates.push('start_time = ?');
        params.push(data.startTime.toISOString());
      }
      if (data.duration !== undefined) {
        updates.push('duration = ?');
        params.push(data.duration);
      }
      if (data.appointmentType !== undefined) {
        updates.push('appointment_type = ?');
        params.push(data.appointmentType.trim());
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        params.push(data.notes?.trim() || null);
      }

      updates.push('updated_at = ?');
      params.push(now);

      params.push(id);

      this.db.executeUpdate(
        `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const appointment = this.getAppointment(id);
      if (!appointment) {
        throw new Error('Failed to retrieve updated appointment');
      }

      logger.info('Appointment updated', { appointmentId: id });
      return appointment;
    } catch (error) {
      logger.error('Failed to update appointment', { error, id, data });
      throw error;
    }
  }

  /**
   * Cancel an appointment
   * Updates status to 'Cancelled' and retains the record
   * Requirements: 3.7
   */
  cancelAppointment(id: string, reason: string): Appointment {
    // Check if appointment exists
    const existing = this.getAppointment(id);
    if (!existing) {
      throw new Error('Appointment not found');
    }

    const now = new Date().toISOString();

    try {
      this.db.executeUpdate(
        `UPDATE appointments 
         SET status = ?, cancellation_reason = ?, updated_at = ? 
         WHERE id = ?`,
        ['Cancelled', reason, now, id]
      );

      const appointment = this.getAppointment(id);
      if (!appointment) {
        throw new Error('Failed to retrieve cancelled appointment');
      }

      logger.info('Appointment cancelled', { appointmentId: id, reason });
      return appointment;
    } catch (error) {
      logger.error('Failed to cancel appointment', { error, id, reason });
      throw error;
    }
  }

  /**
   * Get appointments by date range
   * Requirements: 3.4
   */
  getAppointmentsByDateRange(start: Date, end: Date): Appointment[] {
    try {
      const rows = this.db.executeQuery<any>(
        `SELECT * FROM appointments 
         WHERE start_time >= ? AND start_time <= ?
         ORDER BY start_time`,
        [start.toISOString(), end.toISOString()]
      );

      return rows.map((row) => this.mapRowToAppointment(row));
    } catch (error) {
      logger.error('Failed to get appointments by date range', { error, start, end });
      throw error;
    }
  }

  /**
   * Check for appointment conflicts
   * Returns true if there is a conflict, false otherwise
   * Requirements: 3.2, 3.6, 3.9
   */
  checkConflict(
    dentistId: string,
    startTime: Date,
    duration: number,
    excludeAppointmentId?: string
  ): boolean {
    try {
      const endTime = new Date(startTime.getTime() + duration * 60000);

      // Find overlapping appointments for the same dentist
      // Two appointments overlap if:
      // (start1 < end2) AND (end1 > start2)
      let sql = `
        SELECT COUNT(*) as count FROM appointments
        WHERE dentist_id = ?
        AND status != 'Cancelled'
        AND (
          (start_time < ? AND datetime(start_time, '+' || duration || ' minutes') > ?)
        )
      `;
      const params: any[] = [
        dentistId,
        endTime.toISOString(),
        startTime.toISOString(),
      ];

      // Exclude the current appointment if updating
      if (excludeAppointmentId) {
        sql += ' AND id != ?';
        params.push(excludeAppointmentId);
      }

      const result = this.db.executeQueryOne<any>(sql, params);
      return result && result.count > 0;
    } catch (error) {
      logger.error('Failed to check appointment conflict', {
        error,
        dentistId,
        startTime,
        duration,
      });
      throw error;
    }
  }

  /**
   * Search appointments with filters
   * Requirements: 12.2
   */
  searchAppointments(searchQuery: AppointmentSearchQuery): Appointment[] {
    try {
      const {
        patientId,
        dentistId,
        status,
        dateRange,
        page = 1,
        pageSize = 100,
      } = searchQuery;

      let sql = 'SELECT * FROM appointments WHERE 1=1';
      const params: any[] = [];

      if (patientId) {
        sql += ' AND patient_id = ?';
        params.push(patientId);
      }

      if (dentistId) {
        sql += ' AND dentist_id = ?';
        params.push(dentistId);
      }

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      if (dateRange) {
        sql += ' AND start_time >= ? AND start_time <= ?';
        params.push(dateRange.start.toISOString(), dateRange.end.toISOString());
      }

      sql += ' ORDER BY start_time DESC';

      // Add pagination
      const offset = (page - 1) * pageSize;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);

      const rows = this.db.executeQuery<any>(sql, params);
      return rows.map((row) => this.mapRowToAppointment(row));
    } catch (error) {
      logger.error('Failed to search appointments', { error, searchQuery });
      throw error;
    }
  }

  /**
   * Generate appointment reminders for appointments 24 hours in the future
   * Requirements: 3.8
   */
  generateReminders(): AppointmentReminder[] {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      const reminderWindowStart = new Date(reminderTime.getTime() - 5 * 60 * 1000); // 5 minutes before
      const reminderWindowEnd = new Date(reminderTime.getTime() + 5 * 60 * 1000); // 5 minutes after

      const rows = this.db.executeQuery<any>(
        `SELECT id, patient_id, dentist_id, start_time, appointment_type
         FROM appointments
         WHERE status IN ('Scheduled', 'Confirmed')
         AND start_time >= ? AND start_time <= ?`,
        [reminderWindowStart.toISOString(), reminderWindowEnd.toISOString()]
      );

      return rows.map((row) => ({
        appointmentId: row.id,
        patientId: row.patient_id,
        dentistId: row.dentist_id,
        startTime: new Date(row.start_time),
        appointmentType: row.appointment_type,
      }));
    } catch (error) {
      logger.error('Failed to generate reminders', { error });
      throw error;
    }
  }

  /**
   * Get all appointments (for testing purposes)
   */
  getAllAppointments(): Appointment[] {
    try {
      const rows = this.db.executeQuery<any>(
        'SELECT * FROM appointments ORDER BY start_time DESC'
      );
      return rows.map((row) => this.mapRowToAppointment(row));
    } catch (error) {
      logger.error('Failed to get all appointments', { error });
      throw error;
    }
  }

  /**
   * Map database row to Appointment object
   */
  private mapRowToAppointment(row: any): Appointment {
    return {
      id: row.id,
      patientId: row.patient_id,
      dentistId: row.dentist_id,
      startTime: new Date(row.start_time),
      duration: row.duration,
      appointmentType: row.appointment_type,
      status: row.status as AppointmentStatus,
      notes: row.notes || undefined,
      cancellationReason: row.cancellation_reason || undefined,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
