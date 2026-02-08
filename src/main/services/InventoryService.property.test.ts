import fc from 'fast-check';
import { InventoryService, InventoryItemInput } from './InventoryService';
import { DatabaseManager } from '../../database/DatabaseManager';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

describe('InventoryService Property Tests', () => {
  let inventoryService: InventoryService;
  let db: DatabaseManager;
  const testDbPath = path.join(__dirname, '../../test-data/inventory-test.db');

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
    inventoryService = new InventoryService(db);
  });

  afterEach(() => {
    db.close();
  });

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
        'testuser',
        'hash',
        'Test',
        'User',
        'Administrator',
        1,
        now,
        now,
      ]
    );
    return userId;
  };

  // Arbitrary for InventoryItemInput
  const inventoryItemInputArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes("'")),
    category: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
    unitOfMeasure: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes("'")),
    currentQuantity: fc.double({ min: 0, max: 10000, noNaN: true }),
    minimumThreshold: fc.double({ min: 0, max: 100, noNaN: true }),
    unitCost: fc.double({ min: 0, max: 1000, noNaN: true }),
  });

  // Feature: dental-clinic-management, Property 35: Inventory item creation validation
  // **Validates: Requirements 6.1**
  describe('Property 35: Inventory item creation validation', () => {
    it('should reject creation with missing required fields', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('name'),
            fc.constant('category'),
            fc.constant('unitOfMeasure'),
            fc.constant('currentQuantity')
          ),
          inventoryItemInputArb,
          (missingField, itemData) => {
            const invalidData = { ...itemData };
            
            // Make the field invalid
            if (missingField === 'name') {
              invalidData.name = '';
            } else if (missingField === 'category') {
              invalidData.category = '';
            } else if (missingField === 'unitOfMeasure') {
              invalidData.unitOfMeasure = '';
            } else if (missingField === 'currentQuantity') {
              invalidData.currentQuantity = -1;
            }

            expect(() => {
              inventoryService.createItem(invalidData);
            }).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create item with all valid required fields', () => {
      fc.assert(
        fc.property(
          inventoryItemInputArb,
          (itemData) => {
            const item = inventoryService.createItem(itemData);

            expect(item.id).toBeDefined();
            expect(item.name).toBe(itemData.name);
            expect(item.category).toBe(itemData.category);
            expect(item.unitOfMeasure).toBe(itemData.unitOfMeasure);
            expect(item.currentQuantity).toBeCloseTo(itemData.currentQuantity, 2);
            expect(item.minimumThreshold).toBeCloseTo(itemData.minimumThreshold, 2);
            expect(item.unitCost).toBeCloseTo(itemData.unitCost, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 36: Inventory transaction tracking
  // **Validates: Requirements 6.2, 6.5**
  describe('Property 36: Inventory transaction tracking', () => {
    it('should create transaction record for any quantity change', () => {
      fc.assert(
        fc.property(
          inventoryItemInputArb,
          fc.double({ min: -100, max: 100, noNaN: true }).filter(n => n !== 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.includes("'")),
          (itemData, quantityChange, reason) => {
            const userId = createTestUser();

            // Create item with enough quantity to handle negative changes
            const item = inventoryService.createItem({
              ...itemData,
              currentQuantity: Math.max(itemData.currentQuantity, 200),
            });

            // Update quantity
            inventoryService.updateQuantity(
              item.id,
              quantityChange,
              reason,
              userId,
              quantityChange > 0 ? 'Addition' : 'Usage'
            );

            // Get transaction history
            const transactions = inventoryService.getTransactionHistory(item.id);

            // Verify transaction was recorded
            expect(transactions.length).toBeGreaterThan(0);
            const lastTransaction = transactions[0];
            expect(lastTransaction.itemId).toBe(item.id);
            expect(lastTransaction.quantityChange).toBeCloseTo(quantityChange, 2);
            expect(lastTransaction.reason).toBe(reason);
            expect(lastTransaction.performedBy).toBe(userId);
            expect(['Addition', 'Usage', 'Adjustment']).toContain(lastTransaction.transactionType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 37: Low stock warning
  // **Validates: Requirements 6.3**
  describe('Property 37: Low stock warning', () => {
    it('should include items where currentQuantity < minimumThreshold in low stock list', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes("'")),
              category: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
              unitOfMeasure: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes("'")),
              currentQuantity: fc.double({ min: 0, max: 50, noNaN: true }),
              minimumThreshold: fc.double({ min: 51, max: 100, noNaN: true }),
              unitCost: fc.double({ min: 0, max: 1000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (lowStockItems) => {
            // Create low stock items
            const createdItems = lowStockItems.map(itemData =>
              inventoryService.createItem(itemData)
            );

            // Get low stock items
            const lowStock = inventoryService.getLowStockItems();

            // Verify all created items are in low stock list
            for (const item of createdItems) {
              const found = lowStock.find(ls => ls.id === item.id);
              expect(found).toBeDefined();
              expect(found!.currentQuantity).toBeLessThan(found!.minimumThreshold);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 38: Stock adjustment authorization
  // **Validates: Requirements 6.6**
  describe('Property 38: Stock adjustment authorization', () => {
    it('should reject adjustment without reason or user authorization', () => {
      fc.assert(
        fc.property(
          inventoryItemInputArb,
          fc.double({ min: -10, max: 10, noNaN: true }).filter(n => n !== 0),
          (itemData, quantityChange) => {
            const userId = createTestUser();
            const item = inventoryService.createItem({
              ...itemData,
              currentQuantity: 100,
            });

            // Test without reason
            expect(() => {
              inventoryService.updateQuantity(item.id, quantityChange, '', userId);
            }).toThrow('Reason is required');

            // Test without user
            expect(() => {
              inventoryService.updateQuantity(item.id, quantityChange, 'Test reason', '');
            }).toThrow('User authorization is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow adjustment with reason and user authorization', () => {
      fc.assert(
        fc.property(
          inventoryItemInputArb,
          fc.double({ min: -10, max: 10, noNaN: true }).filter(n => n !== 0),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.includes("'")),
          (itemData, quantityChange, reason) => {
            const userId = createTestUser();
            const item = inventoryService.createItem({
              ...itemData,
              currentQuantity: 100,
            });

            const updated = inventoryService.updateQuantity(
              item.id,
              quantityChange,
              reason,
              userId
            );

            expect(updated.currentQuantity).toBeCloseTo(100 + quantityChange, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 39: Inventory value calculation
  // **Validates: Requirements 6.7**
  describe('Property 39: Inventory value calculation', () => {
    it('should calculate value as unitCost × currentQuantity', () => {
      fc.assert(
        fc.property(
          inventoryItemInputArb,
          (itemData) => {
            const item = inventoryService.createItem(itemData);

            const calculatedValue = inventoryService.calculateInventoryValue(item.id);
            const expectedValue = item.currentQuantity * item.unitCost;

            expect(calculatedValue).toBeCloseTo(expectedValue, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate total inventory value correctly', () => {
      fc.assert(
        fc.property(
          fc.array(inventoryItemInputArb, { minLength: 1, maxLength: 5 }),
          (itemsData) => {
            // Create items
            const items = itemsData.map(data => inventoryService.createItem(data));

            // Calculate expected total
            const expectedTotal = items.reduce(
              (sum, item) => sum + (item.currentQuantity * item.unitCost),
              0
            );

            // Get calculated total
            const calculatedTotal = inventoryService.calculateInventoryValue();

            expect(calculatedTotal).toBeCloseTo(expectedTotal, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: dental-clinic-management, Property 40: Inventory search filtering
  // **Validates: Requirements 6.8**
  describe('Property 40: Inventory search filtering', () => {
    it('should return only items matching all applied filters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes("'")),
              category: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes("'")),
              unitOfMeasure: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes("'")),
              currentQuantity: fc.double({ min: 0, max: 100, noNaN: true }),
              minimumThreshold: fc.double({ min: 0, max: 100, noNaN: true }),
              unitCost: fc.double({ min: 0, max: 1000, noNaN: true }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          (targetCategory, itemsData) => {
            // Create items with specific category
            const targetItems = itemsData.slice(0, 2).map(data =>
              inventoryService.createItem({ ...data, category: targetCategory })
            );

            // Create items with different category
            itemsData.slice(2).forEach(data =>
              inventoryService.createItem({ ...data, category: 'OtherCategory' })
            );

            // Search by category
            const results = inventoryService.searchItems({ category: targetCategory });

            // Verify all results match the category
            expect(results.length).toBeGreaterThanOrEqual(targetItems.length);
            for (const result of results) {
              expect(result.category).toBe(targetCategory);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
