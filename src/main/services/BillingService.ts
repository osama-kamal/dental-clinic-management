import { DatabaseManager } from '../../database/DatabaseManager';
import { Invoice, InvoiceItem, Payment, InvoiceStatus, PaymentMethod } from '../../shared/types';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';

export interface InvoiceInput {
  patientId: string;
  treatmentIds: string[];
  taxRate: number;
  dueDate?: Date;
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  date: Date;
}

export interface DiscountInput {
  amount: number;
  percentage: number;
}

export class BillingService {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new invoice
   * Requirements: 5.1, 5.2, 5.3
   */
  createInvoice(data: InvoiceInput, createdBy: string): Invoice {
    // Validate required fields
    if (!data.patientId || data.patientId.trim() === '') {
      throw new Error('Patient ID is required');
    }
    if (!data.treatmentIds || data.treatmentIds.length === 0) {
      throw new Error('At least one treatment is required');
    }
    if (data.taxRate === undefined || data.taxRate < 0 || data.taxRate > 1) {
      throw new Error('Tax rate is required and must be between 0 and 1');
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    try {
      let subtotal = 0;
      const items: InvoiceItem[] = [];

      this.db.executeTransaction(() => {
        // Generate unique invoice number
        const invoiceNumber = this.generateInvoiceNumber();

        // Get treatment details and create invoice items
        for (const treatmentId of data.treatmentIds) {
          const treatment = this.db.executeQueryOne<any>(
            'SELECT * FROM treatments WHERE id = ?',
            [treatmentId]
          );

          if (!treatment) {
            throw new Error(`Treatment not found: ${treatmentId}`);
          }

          const itemId = randomUUID();
          const totalPrice = treatment.estimated_cost;
          subtotal += totalPrice;

          this.db.executeUpdate(
            `INSERT INTO invoice_items (
              id, invoice_id, treatment_id, description, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [itemId, id, treatmentId, treatment.description, 1, treatment.estimated_cost, totalPrice]
          );

          items.push({
            id: itemId,
            invoiceId: id,
            treatmentId,
            description: treatment.description,
            quantity: 1,
            unitPrice: treatment.estimated_cost,
            totalPrice,
          });
        }

        // Calculate amounts
        const taxAmount = subtotal * data.taxRate;
        const totalAmount = subtotal + taxAmount;
        const balance = totalAmount;

        // Create invoice
        this.db.executeUpdate(
          `INSERT INTO invoices (
            id, invoice_number, patient_id, subtotal, tax_rate, tax_amount,
            discount_amount, total_amount, amount_paid, balance, status,
            due_date, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            invoiceNumber,
            data.patientId,
            subtotal,
            data.taxRate,
            taxAmount,
            0,
            totalAmount,
            0,
            balance,
            'Unpaid' as InvoiceStatus,
            data.dueDate?.toISOString() || null,
            createdBy,
            now,
            now,
          ]
        );
      });

      const invoice = this.getInvoice(id);
      if (!invoice) {
        throw new Error('Failed to retrieve created invoice');
      }

      logger.info('Invoice created', { invoiceId: id, invoiceNumber: invoice.invoiceNumber });
      return invoice;
    } catch (error) {
      logger.error('Failed to create invoice', { error, data });
      throw error;
    }
  }

  /**
   * Generate unique invoice number
   * Requirements: 5.2
   */
  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const result = this.db.executeQueryOne<any>(
      `SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?`,
      [`INV-${year}-%`]
    );
    const count = (result?.count || 0) + 1;
    return `INV-${year}-${String(count).padStart(6, '0')}`;
  }

  /**
   * Get an invoice by ID
   * Requirements: 5.1
   */
  getInvoice(id: string): Invoice | null {
    try {
      const invoiceRow = this.db.executeQueryOne<any>(
        'SELECT * FROM invoices WHERE id = ?',
        [id]
      );

      if (!invoiceRow) {
        return null;
      }

      const itemRows = this.db.executeQuery<any>(
        'SELECT * FROM invoice_items WHERE invoice_id = ?',
        [id]
      );

      const paymentRows = this.db.executeQuery<any>(
        'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC',
        [id]
      );

      return this.mapRowToInvoice(invoiceRow, itemRows, paymentRows);
    } catch (error) {
      logger.error('Failed to retrieve invoice', { error, id });
      throw error;
    }
  }

  /**
   * Record a payment on an invoice
   * Requirements: 5.4, 5.5, 5.6
   */
  recordPayment(invoiceId: string, payment: PaymentInput, recordedBy: string): Invoice {
    // Validate payment
    if (payment.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }
    if (!payment.method) {
      throw new Error('Payment method is required');
    }

    try {
      const now = new Date().toISOString();

      this.db.executeTransaction(() => {
        // Get current invoice
        const invoice = this.getInvoice(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        if (invoice.status === 'Cancelled') {
          throw new Error('Cannot record payment on cancelled invoice');
        }

        // Check if payment exceeds balance
        if (payment.amount > invoice.balance) {
          throw new Error('Payment amount exceeds invoice balance');
        }

        // Record payment
        this.db.executeUpdate(
          `INSERT INTO payments (
            id, invoice_id, amount, method, reference, payment_date, recorded_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            invoiceId,
            payment.amount,
            payment.method,
            payment.reference || null,
            payment.date.toISOString(),
            recordedBy,
            now,
          ]
        );

        // Update invoice
        const newAmountPaid = invoice.amountPaid + payment.amount;
        const newBalance = invoice.totalAmount - newAmountPaid;
        let newStatus: InvoiceStatus = 'Partial';

        if (newBalance <= 0.01) {
          newStatus = 'Paid';
        } else if (newAmountPaid === 0) {
          newStatus = 'Unpaid';
        }

        this.db.executeUpdate(
          `UPDATE invoices 
           SET amount_paid = ?, balance = ?, status = ?, updated_at = ?
           WHERE id = ?`,
          [newAmountPaid, newBalance, newStatus, now, invoiceId]
        );
      });

      const updatedInvoice = this.getInvoice(invoiceId);
      if (!updatedInvoice) {
        throw new Error('Failed to retrieve updated invoice');
      }

      logger.info('Payment recorded', { invoiceId, amount: payment.amount });
      return updatedInvoice;
    } catch (error) {
      logger.error('Failed to record payment', { error, invoiceId, payment });
      throw error;
    }
  }

  /**
   * Apply discount to an invoice
   * Requirements: 5.7
   */
  applyDiscount(invoiceId: string, discount: DiscountInput, userId: string, userRole: string): Invoice {
    // Validate discount
    if (discount.amount < 0) {
      throw new Error('Discount amount must be non-negative');
    }
    if (discount.percentage < 0 || discount.percentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    // Check authorization based on role and discount percentage
    if (userRole === 'Receptionist' && discount.percentage > 10) {
      throw new Error('Receptionist cannot apply discounts over 10%');
    }
    if (userRole === 'Dentist' && discount.percentage > 20) {
      throw new Error('Dentist cannot apply discounts over 20%');
    }

    try {
      const now = new Date().toISOString();

      this.db.executeTransaction(() => {
        // Get current invoice
        const invoice = this.getInvoice(invoiceId);
        if (!invoice) {
          throw new Error('Invoice not found');
        }

        if (invoice.status === 'Paid' || invoice.status === 'Cancelled') {
          throw new Error('Cannot apply discount to paid or cancelled invoice');
        }

        // Calculate new amounts
        const newDiscountAmount = discount.amount;
        const newTotalAmount = invoice.subtotal + invoice.taxAmount - newDiscountAmount;
        const newBalance = newTotalAmount - invoice.amountPaid;

        // Update invoice
        this.db.executeUpdate(
          `UPDATE invoices 
           SET discount_amount = ?, total_amount = ?, balance = ?, updated_at = ?
           WHERE id = ?`,
          [newDiscountAmount, newTotalAmount, newBalance, now, invoiceId]
        );
      });

      const updatedInvoice = this.getInvoice(invoiceId);
      if (!updatedInvoice) {
        throw new Error('Failed to retrieve updated invoice');
      }

      logger.info('Discount applied', { invoiceId, discountAmount: discount.amount });
      return updatedInvoice;
    } catch (error) {
      logger.error('Failed to apply discount', { error, invoiceId, discount });
      throw error;
    }
  }

  /**
   * Generate PDF invoice
   * Requirements: 5.8
   */
  generateInvoicePDF(invoiceId: string): Buffer {
    try {
      const invoice = this.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Get patient details
      const patient = this.db.executeQueryOne<any>(
        'SELECT * FROM patients WHERE id = ?',
        [invoice.patientId]
      );

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`);
      doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`);
      if (invoice.dueDate) {
        doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`);
      }
      doc.moveDown();

      // Patient info
      doc.fontSize(14).text('Bill To:');
      doc.fontSize(12).text(`${patient.first_name} ${patient.last_name}`);
      if (patient.address) {
        doc.text(patient.address);
      }
      doc.text(patient.phone);
      doc.moveDown();

      // Items table
      doc.fontSize(14).text('Items:');
      doc.moveDown(0.5);

      invoice.items.forEach((item) => {
        doc.fontSize(10).text(
          `${item.description} - $${item.totalPrice.toFixed(2)}`,
          { indent: 20 }
        );
      });

      doc.moveDown();

      // Totals
      doc.fontSize(12);
      doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, { align: 'right' });
      doc.text(`Tax (${(invoice.taxRate * 100).toFixed(1)}%): $${invoice.taxAmount.toFixed(2)}`, { align: 'right' });
      if (invoice.discountAmount > 0) {
        doc.text(`Discount: -$${invoice.discountAmount.toFixed(2)}`, { align: 'right' });
      }
      doc.fontSize(14).text(`Total: $${invoice.totalAmount.toFixed(2)}`, { align: 'right' });
      doc.fontSize(12).text(`Amount Paid: $${invoice.amountPaid.toFixed(2)}`, { align: 'right' });
      doc.fontSize(14).text(`Balance Due: $${invoice.balance.toFixed(2)}`, { align: 'right' });

      doc.end();

      return new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', reject);
      }) as any;
    } catch (error) {
      logger.error('Failed to generate invoice PDF', { error, invoiceId });
      throw error;
    }
  }

  /**
   * Search invoices with filters
   * Requirements: 5.9
   */
  searchInvoices(filters: {
    patientId?: string;
    dateRange?: { start: Date; end: Date };
    status?: InvoiceStatus;
    page?: number;
    pageSize?: number;
  }): Invoice[] {
    try {
      const { patientId, dateRange, status, page = 1, pageSize = 100 } = filters;

      let sql = 'SELECT * FROM invoices WHERE 1=1';
      const params: any[] = [];

      if (patientId) {
        sql += ' AND patient_id = ?';
        params.push(patientId);
      }

      if (dateRange) {
        sql += ' AND created_at >= ? AND created_at <= ?';
        params.push(dateRange.start.toISOString(), dateRange.end.toISOString());
      }

      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }

      sql += ' ORDER BY created_at DESC';

      // Add pagination
      const offset = (page - 1) * pageSize;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);

      const invoiceRows = this.db.executeQuery<any>(sql, params);

      return invoiceRows.map((invoiceRow) => {
        const itemRows = this.db.executeQuery<any>(
          'SELECT * FROM invoice_items WHERE invoice_id = ?',
          [invoiceRow.id]
        );

        const paymentRows = this.db.executeQuery<any>(
          'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC',
          [invoiceRow.id]
        );

        return this.mapRowToInvoice(invoiceRow, itemRows, paymentRows);
      });
    } catch (error) {
      logger.error('Failed to search invoices', { error, filters });
      throw error;
    }
  }

  /**
   * Get invoices by patient
   */
  getInvoicesByPatient(patientId: string): Invoice[] {
    return this.searchInvoices({ patientId });
  }

  /**
   * Map database rows to Invoice object
   */
  private mapRowToInvoice(invoiceRow: any, itemRows: any[], paymentRows: any[]): Invoice {
    const items: InvoiceItem[] = itemRows.map((row) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      treatmentId: row.treatment_id,
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      totalPrice: row.total_price,
    }));

    const payments: Payment[] = paymentRows.map((row) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      amount: row.amount,
      method: row.method as PaymentMethod,
      reference: row.reference || undefined,
      paymentDate: new Date(row.payment_date),
      recordedBy: row.recorded_by,
      createdAt: new Date(row.created_at),
    }));

    return {
      id: invoiceRow.id,
      invoiceNumber: invoiceRow.invoice_number,
      patientId: invoiceRow.patient_id,
      items,
      subtotal: invoiceRow.subtotal,
      taxRate: invoiceRow.tax_rate,
      taxAmount: invoiceRow.tax_amount,
      discountAmount: invoiceRow.discount_amount,
      totalAmount: invoiceRow.total_amount,
      amountPaid: invoiceRow.amount_paid,
      balance: invoiceRow.balance,
      status: invoiceRow.status as InvoiceStatus,
      dueDate: invoiceRow.due_date ? new Date(invoiceRow.due_date) : undefined,
      createdBy: invoiceRow.created_by,
      createdAt: new Date(invoiceRow.created_at),
      updatedAt: new Date(invoiceRow.updated_at),
    };
  }
}
