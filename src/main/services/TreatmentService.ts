import { DatabaseManager } from '../../database/DatabaseManager';
import { TreatmentPlan, Treatment, TreatmentStatus, ApiResponse } from '../../shared/types';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export interface TreatmentInput {
  code: string;
  description: string;
  estimatedCost: number;
  notes?: string;
}

export interface MaterialUsage {
  itemId: string;
  quantity: number;
}

export interface TreatmentCompletionData {
  completedBy: string;
  materialsUsed?: MaterialUsage[];
  notes?: string;
}

export interface TreatmentTemplate {
  id: string;
  code: string;
  description: string;
  category: string;
  defaultCost: number;
  defaultDuration?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentTemplateInput {
  code: string;
  description: string;
  category: string;
  defaultCost: number;
  defaultDuration?: number;
}

export class TreatmentService {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new treatment plan for a patient
   * Requirements: 4.1, 4.2
   */
  createTreatmentPlan(
    patientId: string,
    treatments: TreatmentInput[],
    createdBy: string
  ): TreatmentPlan {
    // Validate patient ID
    if (!patientId || patientId.trim() === '') {
      throw new Error('Patient ID is required');
    }

    // Validate treatments array
    if (!treatments || treatments.length === 0) {
      throw new Error('At least one treatment is required');
    }

    // Validate each treatment
    for (const treatment of treatments) {
      if (!treatment.code || treatment.code.trim() === '') {
        throw new Error('Treatment code is required');
      }
      if (!treatment.description || treatment.description.trim() === '') {
        throw new Error('Treatment description is required');
      }
      if (treatment.estimatedCost === undefined || treatment.estimatedCost < 0) {
        throw new Error('Treatment estimated cost is required and must be non-negative');
      }
    }

    // Verify patient exists
    const patient = this.db.executeQueryOne<any>(
      'SELECT id FROM patients WHERE id = ?',
      [patientId]
    );
    if (!patient) {
      throw new Error('Patient not found');
    }

    const planId = randomUUID();
    const now = new Date().toISOString();
    const totalEstimatedCost = treatments.reduce((sum, t) => sum + t.estimatedCost, 0);

    try {
      this.db.executeTransaction(() => {
        // Create treatment plan
        this.db.executeUpdate(
          `INSERT INTO treatment_plans (
            id, patient_id, created_by, total_estimated_cost, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [planId, patientId, createdBy, totalEstimatedCost, now, now]
        );

        // Create treatments
        for (const treatment of treatments) {
          const treatmentId = randomUUID();
          this.db.executeUpdate(
            `INSERT INTO treatments (
              id, treatment_plan_id, code, description, estimated_cost,
              status, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              treatmentId,
              planId,
              treatment.code.trim(),
              treatment.description.trim(),
              treatment.estimatedCost,
              'Planned' as TreatmentStatus,
              treatment.notes?.trim() || null,
              now,
              now,
            ]
          );
        }
      });

      const plan = this.getTreatmentPlan(planId);
      if (!plan) {
        throw new Error('Failed to retrieve created treatment plan');
      }

      logger.info('Treatment plan created', { planId, patientId, treatmentCount: treatments.length });
      return plan;
    } catch (error) {
      logger.error('Failed to create treatment plan', { error, patientId });
      throw error;
    }
  }

  /**
   * Retrieve a treatment plan by ID
   * Requirements: 4.1
   */
  getTreatmentPlan(id: string): TreatmentPlan | null {
    try {
      const planRow = this.db.executeQueryOne<any>(
        'SELECT * FROM treatment_plans WHERE id = ?',
        [id]
      );

      if (!planRow) {
        return null;
      }

      const treatmentRows = this.db.executeQuery<any>(
        'SELECT * FROM treatments WHERE treatment_plan_id = ? ORDER BY created_at',
        [id]
      );

      return this.mapRowToTreatmentPlan(planRow, treatmentRows);
    } catch (error) {
      logger.error('Failed to retrieve treatment plan', { error, id });
      throw error;
    }
  }

  /**
   * Get all treatment plans for a patient
   * Requirements: 4.5
   */
  getTreatmentsByPatient(patientId: string): TreatmentPlan[] {
    try {
      const planRows = this.db.executeQuery<any>(
        'SELECT * FROM treatment_plans WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
      );

      return planRows.map(planRow => {
        const treatmentRows = this.db.executeQuery<any>(
          'SELECT * FROM treatments WHERE treatment_plan_id = ? ORDER BY created_at',
          [planRow.id]
        );
        return this.mapRowToTreatmentPlan(planRow, treatmentRows);
      });
    } catch (error) {
      logger.error('Failed to retrieve patient treatment plans', { error, patientId });
      throw error;
    }
  }

  /**
   * Update treatment status
   * Requirements: 4.3
   */
  updateTreatmentStatus(treatmentId: string, status: TreatmentStatus): Treatment {
    // Validate status
    const validStatuses: TreatmentStatus[] = ['Planned', 'In Progress', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid treatment status: ${status}`);
    }

    try {
      const now = new Date().toISOString();
      
      this.db.executeUpdate(
        'UPDATE treatments SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, treatmentId]
      );

      const treatment = this.getTreatment(treatmentId);
      if (!treatment) {
        throw new Error('Treatment not found');
      }

      logger.info('Treatment status updated', { treatmentId, status });
      return treatment;
    } catch (error) {
      logger.error('Failed to update treatment status', { error, treatmentId, status });
      throw error;
    }
  }

  /**
   * Complete a treatment with metadata
   * Requirements: 4.4, 4.7
   */
  completeTreatment(
    treatmentId: string,
    completionData: TreatmentCompletionData
  ): Treatment {
    if (!completionData.completedBy) {
      throw new Error('Completed by user ID is required');
    }

    try {
      const now = new Date().toISOString();

      this.db.executeTransaction(() => {
        // Update treatment
        this.db.executeUpdate(
          `UPDATE treatments 
           SET status = ?, completed_date = ?, completed_by = ?, 
               notes = COALESCE(?, notes), updated_at = ?
           WHERE id = ?`,
          [
            'Completed' as TreatmentStatus,
            now,
            completionData.completedBy,
            completionData.notes?.trim() || null,
            now,
            treatmentId,
          ]
        );

        // Deduct inventory if materials were used
        if (completionData.materialsUsed && completionData.materialsUsed.length > 0) {
          for (const material of completionData.materialsUsed) {
            // Get current quantity
            const item = this.db.executeQueryOne<any>(
              'SELECT current_quantity FROM inventory_items WHERE id = ?',
              [material.itemId]
            );

            if (!item) {
              throw new Error(`Inventory item not found: ${material.itemId}`);
            }

            const newQuantity = item.current_quantity - material.quantity;
            if (newQuantity < 0) {
              throw new Error(`Insufficient inventory for item: ${material.itemId}`);
            }

            // Update inventory quantity
            this.db.executeUpdate(
              'UPDATE inventory_items SET current_quantity = ?, updated_at = ? WHERE id = ?',
              [newQuantity, now, material.itemId]
            );

            // Record transaction
            this.db.executeUpdate(
              `INSERT INTO inventory_transactions (
                id, item_id, transaction_type, quantity_change, quantity_after,
                reason, reference_id, performed_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                randomUUID(),
                material.itemId,
                'Usage',
                -material.quantity,
                newQuantity,
                'Treatment completion',
                treatmentId,
                completionData.completedBy,
                now,
              ]
            );
          }
        }
      });

      const treatment = this.getTreatment(treatmentId);
      if (!treatment) {
        throw new Error('Treatment not found');
      }

      logger.info('Treatment completed', { treatmentId, completedBy: completionData.completedBy });
      return treatment;
    } catch (error) {
      logger.error('Failed to complete treatment', { error, treatmentId });
      throw error;
    }
  }

  /**
   * Get a single treatment by ID
   */
  private getTreatment(id: string): Treatment | null {
    try {
      const row = this.db.executeQueryOne<any>(
        'SELECT * FROM treatments WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToTreatment(row);
    } catch (error) {
      logger.error('Failed to retrieve treatment', { error, id });
      throw error;
    }
  }

  /**
   * Map database row to TreatmentPlan object
   */
  private mapRowToTreatmentPlan(planRow: any, treatmentRows: any[]): TreatmentPlan {
    return {
      id: planRow.id,
      patientId: planRow.patient_id,
      treatments: treatmentRows.map(row => this.mapRowToTreatment(row)),
      totalEstimatedCost: planRow.total_estimated_cost,
      createdBy: planRow.created_by,
      createdAt: new Date(planRow.created_at),
      updatedAt: new Date(planRow.updated_at),
    };
  }

  /**
   * Map database row to Treatment object
   */
  private mapRowToTreatment(row: any): Treatment {
    return {
      id: row.id,
      treatmentPlanId: row.treatment_plan_id,
      code: row.code,
      description: row.description,
      estimatedCost: row.estimated_cost,
      status: row.status as TreatmentStatus,
      completedDate: row.completed_date ? new Date(row.completed_date) : undefined,
      completedBy: row.completed_by || undefined,
      notes: row.notes || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Create a new treatment template
   * Requirements: 14.1, 14.3, 14.5
   */
  createTreatmentTemplate(data: TreatmentTemplateInput): TreatmentTemplate {
    // Validate required fields
    if (!data.code || data.code.trim() === '') {
      throw new Error('Template code is required');
    }
    if (!data.description || data.description.trim() === '') {
      throw new Error('Template description is required');
    }
    if (!data.category || data.category.trim() === '') {
      throw new Error('Template category is required');
    }
    if (data.defaultCost === undefined || data.defaultCost < 0) {
      throw new Error('Template default cost is required and must be non-negative');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    try {
      this.db.executeUpdate(
        `INSERT INTO treatment_templates (
          id, code, description, category, default_cost, default_duration,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.code.trim(),
          data.description.trim(),
          data.category.trim(),
          data.defaultCost,
          data.defaultDuration || null,
          1,
          now,
          now,
        ]
      );

      const template = this.getTreatmentTemplate(id);
      if (!template) {
        throw new Error('Failed to retrieve created template');
      }

      logger.info('Treatment template created', { templateId: id, code: data.code });
      return template;
    } catch (error) {
      logger.error('Failed to create treatment template', { error, data });
      throw error;
    }
  }

  /**
   * Get a treatment template by ID
   * Requirements: 14.2
   */
  getTreatmentTemplate(id: string): TreatmentTemplate | null {
    try {
      const row = this.db.executeQueryOne<any>(
        'SELECT * FROM treatment_templates WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToTreatmentTemplate(row);
    } catch (error) {
      logger.error('Failed to retrieve treatment template', { error, id });
      throw error;
    }
  }

  /**
   * Get all active treatment templates
   * Requirements: 14.2
   */
  getAllTreatmentTemplates(includeInactive: boolean = false): TreatmentTemplate[] {
    try {
      const query = includeInactive
        ? 'SELECT * FROM treatment_templates ORDER BY category, code'
        : 'SELECT * FROM treatment_templates WHERE is_active = 1 ORDER BY category, code';

      const rows = this.db.executeQuery<any>(query);
      return rows.map(row => this.mapRowToTreatmentTemplate(row));
    } catch (error) {
      logger.error('Failed to retrieve treatment templates', { error });
      throw error;
    }
  }

  /**
   * Update a treatment template
   * Requirements: 14.3, 14.4
   */
  updateTreatmentTemplate(
    id: string,
    data: Partial<TreatmentTemplateInput>
  ): TreatmentTemplate {
    // Validate at least one field is being updated
    if (Object.keys(data).length === 0) {
      throw new Error('At least one field must be updated');
    }

    // Validate fields if provided
    if (data.code !== undefined && data.code.trim() === '') {
      throw new Error('Template code cannot be empty');
    }
    if (data.description !== undefined && data.description.trim() === '') {
      throw new Error('Template description cannot be empty');
    }
    if (data.category !== undefined && data.category.trim() === '') {
      throw new Error('Template category cannot be empty');
    }
    if (data.defaultCost !== undefined && data.defaultCost < 0) {
      throw new Error('Template default cost must be non-negative');
    }

    try {
      const now = new Date().toISOString();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.code !== undefined) {
        updates.push('code = ?');
        values.push(data.code.trim());
      }
      if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description.trim());
      }
      if (data.category !== undefined) {
        updates.push('category = ?');
        values.push(data.category.trim());
      }
      if (data.defaultCost !== undefined) {
        updates.push('default_cost = ?');
        values.push(data.defaultCost);
      }
      if (data.defaultDuration !== undefined) {
        updates.push('default_duration = ?');
        values.push(data.defaultDuration);
      }

      updates.push('updated_at = ?');
      values.push(now);
      values.push(id);

      this.db.executeUpdate(
        `UPDATE treatment_templates SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const template = this.getTreatmentTemplate(id);
      if (!template) {
        throw new Error('Template not found');
      }

      logger.info('Treatment template updated', { templateId: id });
      return template;
    } catch (error) {
      logger.error('Failed to update treatment template', { error, id });
      throw error;
    }
  }

  /**
   * Delete (deactivate) a treatment template
   * Requirements: 14.3
   */
  deleteTreatmentTemplate(id: string): void {
    try {
      const now = new Date().toISOString();
      
      this.db.executeUpdate(
        'UPDATE treatment_templates SET is_active = 0, updated_at = ? WHERE id = ?',
        [now, id]
      );

      logger.info('Treatment template deactivated', { templateId: id });
    } catch (error) {
      logger.error('Failed to delete treatment template', { error, id });
      throw error;
    }
  }

  /**
   * Create treatment from template
   * Requirements: 14.6
   */
  createTreatmentFromTemplate(templateId: string): TreatmentInput {
    const template = this.getTreatmentTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    return {
      code: template.code,
      description: template.description,
      estimatedCost: template.defaultCost,
      notes: undefined,
    };
  }

  /**
   * Map database row to TreatmentTemplate object
   */
  private mapRowToTreatmentTemplate(row: any): TreatmentTemplate {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      category: row.category,
      defaultCost: row.default_cost,
      defaultDuration: row.default_duration || undefined,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
