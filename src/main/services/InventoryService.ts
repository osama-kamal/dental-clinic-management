import { DatabaseManager } from '../../database/DatabaseManager';
import { InventoryItem, InventoryTransaction, ApiResponse } from '../../shared/types';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export interface InventoryItemInput {
  name: string;
  category: string;
  unitOfMeasure: string;
  currentQuantity: number;
  minimumThreshold: number;
  unitCost: number;
}

export interface InventorySearchQuery {
  category?: string;
  stockLevel?: 'all' | 'low' | 'normal';
  name?: string;
  page?: number;
  pageSize?: number;
}

export class InventoryService {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new inventory item
   * Requirements: 6.1
   */
  createItem(data: InventoryItemInput): InventoryItem {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new Error('Item name is required');
    }
    if (!data.category || data.category.trim() === '') {
      throw new Error('Item category is required');
    }
    if (!data.unitOfMeasure || data.unitOfMeasure.trim() === '') {
      throw new Error('Unit of measure is required');
    }
    if (data.currentQuantity === undefined || data.currentQuantity < 0) {
      throw new Error('Current quantity is required and must be non-negative');
    }
    if (data.minimumThreshold === undefined || data.minimumThreshold < 0) {
      throw new Error('Minimum threshold is required and must be non-negative');
    }
    if (data.unitCost === undefined || data.unitCost < 0) {
      throw new Error('Unit cost is required and must be non-negative');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    try {
      this.db.executeUpdate(
        `INSERT INTO inventory_items (
          id, name, category, unit_of_measure, current_quantity,
          minimum_threshold, unit_cost, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name.trim(),
          data.category.trim(),
          data.unitOfMeasure.trim(),
          data.currentQuantity,
          data.minimumThreshold,
          data.unitCost,
          now,
          now,
        ]
      );

      const item = this.getItem(id);
      if (!item) {
        throw new Error('Failed to retrieve created inventory item');
      }

      logger.info('Inventory item created', { itemId: id, name: data.name });
      return item;
    } catch (error) {
      logger.error('Failed to create inventory item', { error, data });
      throw error;
    }
  }

  /**
   * Get an inventory item by ID
   */
  getItem(id: string): InventoryItem | null {
    try {
      const row = this.db.executeQueryOne<any>(
        'SELECT * FROM inventory_items WHERE id = ?',
        [id]
      );

      if (!row) {
        return null;
      }

      return this.mapRowToInventoryItem(row);
    } catch (error) {
      logger.error('Failed to retrieve inventory item', { error, id });
      throw error;
    }
  }

  /**
   * Update inventory item details
   */
  updateItem(id: string, data: Partial<InventoryItemInput>): InventoryItem {
    // Validate at least one field is being updated
    if (Object.keys(data).length === 0) {
      throw new Error('At least one field must be updated');
    }

    // Validate fields if provided
    if (data.name !== undefined && data.name.trim() === '') {
      throw new Error('Item name cannot be empty');
    }
    if (data.category !== undefined && data.category.trim() === '') {
      throw new Error('Item category cannot be empty');
    }
    if (data.unitOfMeasure !== undefined && data.unitOfMeasure.trim() === '') {
      throw new Error('Unit of measure cannot be empty');
    }
    if (data.currentQuantity !== undefined && data.currentQuantity < 0) {
      throw new Error('Current quantity must be non-negative');
    }
    if (data.minimumThreshold !== undefined && data.minimumThreshold < 0) {
      throw new Error('Minimum threshold must be non-negative');
    }
    if (data.unitCost !== undefined && data.unitCost < 0) {
      throw new Error('Unit cost must be non-negative');
    }

    try {
      const now = new Date().toISOString();
      const updates: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name.trim());
      }
      if (data.category !== undefined) {
        updates.push('category = ?');
        values.push(data.category.trim());
      }
      if (data.unitOfMeasure !== undefined) {
        updates.push('unit_of_measure = ?');
        values.push(data.unitOfMeasure.trim());
      }
      if (data.currentQuantity !== undefined) {
        updates.push('current_quantity = ?');
        values.push(data.currentQuantity);
      }
      if (data.minimumThreshold !== undefined) {
        updates.push('minimum_threshold = ?');
        values.push(data.minimumThreshold);
      }
      if (data.unitCost !== undefined) {
        updates.push('unit_cost = ?');
        values.push(data.unitCost);
      }

      updates.push('updated_at = ?');
      values.push(now);
      values.push(id);

      this.db.executeUpdate(
        `UPDATE inventory_items SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const item = this.getItem(id);
      if (!item) {
        throw new Error('Item not found');
      }

      logger.info('Inventory item updated', { itemId: id });
      return item;
    } catch (error) {
      logger.error('Failed to update inventory item', { error, id });
      throw error;
    }
  }

  /**
   * Update inventory quantity with transaction tracking
   * Requirements: 6.2, 6.5, 6.6
   */
  updateQuantity(
    id: string,
    quantityChange: number,
    reason: string,
    userId: string,
    transactionType: 'Addition' | 'Usage' | 'Adjustment' = 'Adjustment',
    referenceId?: string
  ): InventoryItem {
    // Validate authorization (reason required)
    if (!reason || reason.trim() === '') {
      throw new Error('Reason is required for quantity adjustment');
    }
    if (!userId || userId.trim() === '') {
      throw new Error('User authorization is required');
    }

    try {
      const now = new Date().toISOString();

      this.db.executeTransaction(() => {
        // Get current item
        const item = this.getItem(id);
        if (!item) {
          throw new Error('Item not found');
        }

        const newQuantity = item.currentQuantity + quantityChange;
        if (newQuantity < 0) {
          throw new Error('Insufficient inventory quantity');
        }

        // Update quantity
        this.db.executeUpdate(
          'UPDATE inventory_items SET current_quantity = ?, updated_at = ? WHERE id = ?',
          [newQuantity, now, id]
        );

        // Record transaction
        this.db.executeUpdate(
          `INSERT INTO inventory_transactions (
            id, item_id, transaction_type, quantity_change, quantity_after,
            reason, reference_id, performed_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            id,
            transactionType,
            quantityChange,
            newQuantity,
            reason.trim(),
            referenceId || null,
            userId,
            now,
          ]
        );
      });

      const updatedItem = this.getItem(id);
      if (!updatedItem) {
        throw new Error('Failed to retrieve updated item');
      }

      logger.info('Inventory quantity updated', { itemId: id, quantityChange, newQuantity: updatedItem.currentQuantity });
      return updatedItem;
    } catch (error) {
      logger.error('Failed to update inventory quantity', { error, id, quantityChange });
      throw error;
    }
  }

  /**
   * Get low stock items
   * Requirements: 6.3
   */
  getLowStockItems(customThreshold?: number): InventoryItem[] {
    try {
      const query = customThreshold !== undefined
        ? 'SELECT * FROM inventory_items WHERE current_quantity < ? ORDER BY current_quantity ASC'
        : 'SELECT * FROM inventory_items WHERE current_quantity < minimum_threshold ORDER BY current_quantity ASC';

      const params = customThreshold !== undefined ? [customThreshold] : [];
      const rows = this.db.executeQuery<any>(query, params);

      return rows.map(row => this.mapRowToInventoryItem(row));
    } catch (error) {
      logger.error('Failed to get low stock items', { error });
      throw error;
    }
  }

  /**
   * Get transaction history for an item
   * Requirements: 6.2, 6.5
   */
  getTransactionHistory(itemId: string): InventoryTransaction[] {
    try {
      const rows = this.db.executeQuery<any>(
        'SELECT * FROM inventory_transactions WHERE item_id = ? ORDER BY created_at DESC',
        [itemId]
      );

      return rows.map(row => this.mapRowToInventoryTransaction(row));
    } catch (error) {
      logger.error('Failed to get transaction history', { error, itemId });
      throw error;
    }
  }

  /**
   * Calculate inventory value
   * Requirements: 6.7
   */
  calculateInventoryValue(itemId?: string): number {
    try {
      if (itemId) {
        const item = this.getItem(itemId);
        if (!item) {
          throw new Error('Item not found');
        }
        return item.currentQuantity * item.unitCost;
      } else {
        // Calculate total inventory value
        const result = this.db.executeQueryOne<any>(
          'SELECT SUM(current_quantity * unit_cost) as total_value FROM inventory_items'
        );
        return result?.total_value || 0;
      }
    } catch (error) {
      logger.error('Failed to calculate inventory value', { error, itemId });
      throw error;
    }
  }

  /**
   * Search inventory items with filters
   * Requirements: 6.8
   */
  searchItems(searchQuery: InventorySearchQuery): InventoryItem[] {
    try {
      const { category, stockLevel, name, page = 1, pageSize = 100 } = searchQuery;

      let sql = 'SELECT * FROM inventory_items WHERE 1=1';
      const params: any[] = [];

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      if (name && name.trim() !== '') {
        sql += ' AND LOWER(name) LIKE ?';
        params.push(`%${name.trim().toLowerCase()}%`);
      }

      if (stockLevel === 'low') {
        sql += ' AND current_quantity < minimum_threshold';
      } else if (stockLevel === 'normal') {
        sql += ' AND current_quantity >= minimum_threshold';
      }

      sql += ' ORDER BY name';

      // Add pagination
      const offset = (page - 1) * pageSize;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);

      const rows = this.db.executeQuery<any>(sql, params);
      return rows.map(row => this.mapRowToInventoryItem(row));
    } catch (error) {
      logger.error('Failed to search inventory items', { error, searchQuery });
      throw error;
    }
  }

  /**
   * Get all inventory items
   */
  getAllItems(): InventoryItem[] {
    try {
      const rows = this.db.executeQuery<any>(
        'SELECT * FROM inventory_items ORDER BY category, name'
      );
      return rows.map(row => this.mapRowToInventoryItem(row));
    } catch (error) {
      logger.error('Failed to get all inventory items', { error });
      throw error;
    }
  }

  /**
   * Map database row to InventoryItem object
   */
  private mapRowToInventoryItem(row: any): InventoryItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      unitOfMeasure: row.unit_of_measure,
      currentQuantity: row.current_quantity,
      minimumThreshold: row.minimum_threshold,
      unitCost: row.unit_cost,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to InventoryTransaction object
   */
  private mapRowToInventoryTransaction(row: any): InventoryTransaction {
    return {
      id: row.id,
      itemId: row.item_id,
      transactionType: row.transaction_type as 'Addition' | 'Usage' | 'Adjustment',
      quantityChange: row.quantity_change,
      quantityAfter: row.quantity_after,
      reason: row.reason || undefined,
      referenceId: row.reference_id || undefined,
      performedBy: row.performed_by,
      createdAt: new Date(row.created_at),
    };
  }
}
