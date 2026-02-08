import { DatabaseManager } from '../../database/DatabaseManager';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export interface ClinicalNote {
  id: string;
  patientId: string;
  noteText: string;
  noteType: 'General' | 'Treatment' | 'Consultation';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicalNoteInput {
  patientId: string;
  noteText: string;
  noteType: 'General' | 'Treatment' | 'Consultation';
}

export interface Attachment {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileData: Buffer;
  fileSize: number;
  uploadedBy: string;
  createdAt: Date;
}

export interface AttachmentInput {
  patientId: string;
  fileName: string;
  fileType: string;
  fileData: Buffer;
}

export class ClinicalNotesService {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new clinical note
   * Requirements: 13.2, 13.5
   */
  createClinicalNote(data: ClinicalNoteInput, createdBy: string): ClinicalNote {
    // Validate required fields
    if (!data.patientId || data.patientId.trim() === '') {
      throw new Error('Patient ID is required');
    }
    if (!data.noteText || data.noteText.trim() === '') {
      throw new Error('Note text is required');
    }
    if (!data.noteType) {
      throw new Error('Note type is required');
    }

    // Verify patient exists
    const patientExists = this.db.executeQueryOne<any>(
      'SELECT id FROM patients WHERE id = ?',
      [data.patientId]
    );
    if (!patientExists) {
      throw new Error('Patient not found');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    try {
      this.db.executeUpdate(
        `INSERT INTO clinical_notes (
          id, patient_id, note_text, note_type, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.patientId.trim(), data.noteText.trim(), data.noteType, createdBy, now, now]
      );

      const note = this.getClinicalNote(id);
      if (!note) {
        throw new Error('Failed to retrieve created clinical note');
      }

      logger.info('Clinical note created', { noteId: id, patientId: data.patientId });
      return note;
    } catch (error) {
      logger.error('Failed to create clinical note', { error, data });
      throw error;
    }
  }

  /**
   * Retrieve a clinical note by ID
   * Requirements: 13.2
   */
  getClinicalNote(id: string): ClinicalNote | null {
    try {
      const row = this.db.executeQueryOne<any>(
        'SELECT * FROM clinical_notes WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToClinicalNote(row);
    } catch (error) {
      logger.error('Failed to retrieve clinical note', { error, id });
      throw error;
    }
  }

  /**
   * Update a clinical note
   * Tracks modification history by updating updated_at timestamp
   * Requirements: 13.5
   */
  updateClinicalNote(id: string, noteText: string, userId: string): ClinicalNote {
    // Check if note exists
    const existing = this.getClinicalNote(id);
    if (!existing) {
      throw new Error('Clinical note not found');
    }

    if (!noteText || noteText.trim() === '') {
      throw new Error('Note text cannot be empty');
    }

    const now = new Date().toISOString();

    try {
      this.db.executeUpdate(
        'UPDATE clinical_notes SET note_text = ?, updated_at = ? WHERE id = ?',
        [noteText.trim(), now, id]
      );

      const note = this.getClinicalNote(id);
      if (!note) {
        throw new Error('Failed to retrieve updated clinical note');
      }

      logger.info('Clinical note updated', { noteId: id, userId });
      return note;
    } catch (error) {
      logger.error('Failed to update clinical note', { error, id });
      throw error;
    }
  }

  /**
   * Get all clinical notes for a patient
   * Returns notes in chronological order (most recent first)
   * Requirements: 13.2, 13.5
   */
  getClinicalNotesByPatient(patientId: string): ClinicalNote[] {
    try {
      const rows = this.db.executeQuery<any>(
        'SELECT * FROM clinical_notes WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
      );

      return rows.map((row) => this.mapRowToClinicalNote(row));
    } catch (error) {
      logger.error('Failed to get clinical notes by patient', { error, patientId });
      throw error;
    }
  }

  /**
   * Delete a clinical note
   * Requirements: 13.2
   */
  deleteClinicalNote(id: string): boolean {
    try {
      const result = this.db.executeUpdate('DELETE FROM clinical_notes WHERE id = ?', [id]);
      logger.info('Clinical note deleted', { noteId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete clinical note', { error, id });
      throw error;
    }
  }

  /**
   * Upload an attachment for a patient
   * Stores file as BLOB in database
   * Requirements: 13.6, 13.7, 13.8
   */
  uploadAttachment(data: AttachmentInput, uploadedBy: string): Attachment {
    // Validate required fields
    if (!data.patientId || data.patientId.trim() === '') {
      throw new Error('Patient ID is required');
    }
    if (!data.fileName || data.fileName.trim() === '') {
      throw new Error('File name is required');
    }
    if (!data.fileType || data.fileType.trim() === '') {
      throw new Error('File type is required');
    }
    if (!data.fileData || data.fileData.length === 0) {
      throw new Error('File data is required');
    }

    // Validate file type (JPEG, PNG, PDF)
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(data.fileType.toLowerCase())) {
      throw new Error('Invalid file type. Only JPEG, PNG, and PDF are supported');
    }

    // Verify patient exists
    const patientExists = this.db.executeQueryOne<any>(
      'SELECT id FROM patients WHERE id = ?',
      [data.patientId]
    );
    if (!patientExists) {
      throw new Error('Patient not found');
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const fileSize = data.fileData.length;

    try {
      this.db.executeUpdate(
        `INSERT INTO attachments (
          id, patient_id, file_name, file_type, file_data, file_size, uploaded_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.patientId.trim(),
          data.fileName.trim(),
          data.fileType.trim(),
          data.fileData,
          fileSize,
          uploadedBy,
          now,
        ]
      );

      const attachment = this.getAttachment(id);
      if (!attachment) {
        throw new Error('Failed to retrieve uploaded attachment');
      }

      logger.info('Attachment uploaded', {
        attachmentId: id,
        patientId: data.patientId,
        fileSize,
      });
      return attachment;
    } catch (error) {
      logger.error('Failed to upload attachment', { error, data: { ...data, fileData: '[BLOB]' } });
      throw error;
    }
  }

  /**
   * Retrieve an attachment by ID
   * Requirements: 13.6, 13.8
   */
  getAttachment(id: string): Attachment | null {
    try {
      const row = this.db.executeQueryOne<any>('SELECT * FROM attachments WHERE id = ?', [id]);

      if (!row) {
        return null;
      }

      return this.mapRowToAttachment(row);
    } catch (error) {
      logger.error('Failed to retrieve attachment', { error, id });
      throw error;
    }
  }

  /**
   * Get all attachments for a patient
   * Requirements: 13.6, 13.8
   */
  getAttachmentsByPatient(patientId: string): Attachment[] {
    try {
      const rows = this.db.executeQuery<any>(
        'SELECT * FROM attachments WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
      );

      return rows.map((row) => this.mapRowToAttachment(row));
    } catch (error) {
      logger.error('Failed to get attachments by patient', { error, patientId });
      throw error;
    }
  }

  /**
   * Get attachment metadata without file data (for listing)
   * Requirements: 13.6
   */
  getAttachmentMetadata(patientId: string): Array<Omit<Attachment, 'fileData'>> {
    try {
      const rows = this.db.executeQuery<any>(
        `SELECT id, patient_id, file_name, file_type, file_size, uploaded_by, created_at
         FROM attachments
         WHERE patient_id = ?
         ORDER BY created_at DESC`,
        [patientId]
      );

      return rows.map((row) => ({
        id: row.id,
        patientId: row.patient_id,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSize: row.file_size,
        uploadedBy: row.uploaded_by,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error('Failed to get attachment metadata', { error, patientId });
      throw error;
    }
  }

  /**
   * Delete an attachment
   * Requirements: 13.6
   */
  deleteAttachment(id: string): boolean {
    try {
      const result = this.db.executeUpdate('DELETE FROM attachments WHERE id = ?', [id]);
      logger.info('Attachment deleted', { attachmentId: id });
      return true;
    } catch (error) {
      logger.error('Failed to delete attachment', { error, id });
      throw error;
    }
  }

  /**
   * Map database row to ClinicalNote object
   */
  private mapRowToClinicalNote(row: any): ClinicalNote {
    return {
      id: row.id,
      patientId: row.patient_id,
      noteText: row.note_text,
      noteType: row.note_type as 'General' | 'Treatment' | 'Consultation',
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to Attachment object
   */
  private mapRowToAttachment(row: any): Attachment {
    return {
      id: row.id,
      patientId: row.patient_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileData: row.file_data,
      fileSize: row.file_size,
      uploadedBy: row.uploaded_by,
      createdAt: new Date(row.created_at),
    };
  }
}
