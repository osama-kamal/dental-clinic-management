import { DatabaseManager } from '../../database/DatabaseManager';
import { DateRange } from '../../shared/types';
import { logger } from '../utils/logger';
import PDFDocument from 'pdfkit';

export interface AppointmentReport {
  date: Date;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  total: number;
  appointments: AppointmentReportItem[];
}

export interface AppointmentReportItem {
  id: string;
  patientName: string;
  dentistName: string;
  startTime: Date;
  duration: number;
  appointmentType: string;
  status: string;
}

export interface RevenueReport {
  dateRange: DateRange;
  groupBy: 'dentist' | 'treatment' | 'none';
  totalRevenue: number;
  groups: RevenueGroup[];
}

export interface RevenueGroup {
  groupKey: string; // dentist name, treatment type, or 'all'
  groupName: string;
  revenue: number;
  invoiceCount: number;
  paymentCount: number;
}

export interface VisitHistoryReport {
  patientId: string;
  patientName: string;
  visits: VisitHistoryItem[];
  totalVisits: number;
}

export interface VisitHistoryItem {
  appointmentId: string;
  date: Date;
  dentistName: string;
  appointmentType: string;
  status: string;
  treatments: string[];
}

export interface InventoryReport {
  generatedAt: Date;
  items: InventoryReportItem[];
  totalValue: number;
  lowStockCount: number;
}

export interface InventoryReportItem {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  minimumThreshold: number;
  unitCost: number;
  totalValue: number;
  isLowStock: boolean;
  usageTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface DashboardAnalytics {
  dailyRevenue: number;
  appointmentCount: number;
  pendingTreatments: number;
  date: Date;
}

export interface KPIMetrics {
  averageTreatmentValue: number;
  patientRetentionRate: number;
  appointmentUtilization: number;
  period: DateRange;
}

export class ReportService {
  constructor(private db: DatabaseManager) {}

  /**
   * Generate daily appointment report
   * Groups appointments by status for a specific date
   * Requirements: 7.1
   */
  generateDailyAppointmentReport(date: Date): AppointmentReport {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all appointments for the date
      const rows = this.db.executeQuery<any>(
        `SELECT 
          a.id, a.start_time, a.duration, a.appointment_type, a.status,
          p.first_name || ' ' || p.last_name as patient_name,
          u.first_name || ' ' || u.last_name as dentist_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN users u ON a.dentist_id = u.id
         WHERE a.start_time >= ? AND a.start_time <= ?
         ORDER BY a.start_time`,
        [startOfDay.toISOString(), endOfDay.toISOString()]
      );

      const appointments: AppointmentReportItem[] = rows.map((row) => ({
        id: row.id,
        patientName: row.patient_name,
        dentistName: row.dentist_name,
        startTime: new Date(row.start_time),
        duration: row.duration,
        appointmentType: row.appointment_type,
        status: row.status,
      }));

      // Count by status
      const scheduled = appointments.filter((a) => a.status === 'Scheduled').length;
      const confirmed = appointments.filter((a) => a.status === 'Confirmed').length;
      const completed = appointments.filter((a) => a.status === 'Completed').length;
      const cancelled = appointments.filter((a) => a.status === 'Cancelled').length;

      logger.info('Daily appointment report generated', { date, total: appointments.length });

      return {
        date,
        scheduled,
        confirmed,
        completed,
        cancelled,
        total: appointments.length,
        appointments,
      };
    } catch (error) {
      logger.error('Failed to generate daily appointment report', { error, date });
      throw error;
    }
  }

  /**
   * Generate revenue report
   * Calculate revenue by date range, optionally grouped by dentist or treatment type
   * Requirements: 7.2
   */
  generateRevenueReport(
    dateRange: DateRange,
    groupBy: 'dentist' | 'treatment' | 'none' = 'none'
  ): RevenueReport {
    try {
      let sql: string;
      let groupKey: string;
      let groupName: string;

      if (groupBy === 'dentist') {
        sql = `
          SELECT 
            u.id as group_key,
            u.first_name || ' ' || u.last_name as group_name,
            SUM(p.amount) as revenue,
            COUNT(DISTINCT i.id) as invoice_count,
            COUNT(p.id) as payment_count
          FROM payments p
          JOIN invoices i ON p.invoice_id = i.id
          JOIN treatment_plans tp ON i.patient_id = tp.patient_id
          JOIN treatments t ON t.treatment_plan_id = tp.id AND t.status = 'Completed'
          JOIN users u ON t.completed_by = u.id
          WHERE p.payment_date >= ? AND p.payment_date <= ?
          GROUP BY u.id, u.first_name, u.last_name
        `;
      } else if (groupBy === 'treatment') {
        sql = `
          SELECT 
            t.code as group_key,
            t.description as group_name,
            SUM(ii.total_price) as revenue,
            COUNT(DISTINCT i.id) as invoice_count,
            COUNT(DISTINCT p.id) as payment_count
          FROM invoice_items ii
          JOIN invoices i ON ii.invoice_id = i.id
          JOIN treatments t ON ii.treatment_id = t.id
          LEFT JOIN payments p ON p.invoice_id = i.id AND p.payment_date >= ? AND p.payment_date <= ?
          WHERE i.created_at >= ? AND i.created_at <= ?
          GROUP BY t.code, t.description
        `;
      } else {
        sql = `
          SELECT 
            'all' as group_key,
            'All Revenue' as group_name,
            SUM(p.amount) as revenue,
            COUNT(DISTINCT i.id) as invoice_count,
            COUNT(p.id) as payment_count
          FROM payments p
          JOIN invoices i ON p.invoice_id = i.id
          WHERE p.payment_date >= ? AND p.payment_date <= ?
        `;
      }

      const params =
        groupBy === 'treatment'
          ? [
              dateRange.start.toISOString(),
              dateRange.end.toISOString(),
              dateRange.start.toISOString(),
              dateRange.end.toISOString(),
            ]
          : [dateRange.start.toISOString(), dateRange.end.toISOString()];

      const rows = this.db.executeQuery<any>(sql, params);

      const groups: RevenueGroup[] = rows.map((row) => ({
        groupKey: row.group_key,
        groupName: row.group_name,
        revenue: row.revenue || 0,
        invoiceCount: row.invoice_count || 0,
        paymentCount: row.payment_count || 0,
      }));

      const totalRevenue = groups.reduce((sum, g) => sum + g.revenue, 0);

      logger.info('Revenue report generated', { dateRange, groupBy, totalRevenue });

      return {
        dateRange,
        groupBy,
        totalRevenue,
        groups,
      };
    } catch (error) {
      logger.error('Failed to generate revenue report', { error, dateRange, groupBy });
      throw error;
    }
  }

  /**
   * Generate patient visit history report
   * Show all appointments for a patient chronologically
   * Requirements: 7.3
   */
  generatePatientVisitHistory(patientId: string): VisitHistoryReport {
    try {
      // Get patient name
      const patientRow = this.db.executeQueryOne<any>(
        'SELECT first_name || " " || last_name as name FROM patients WHERE id = ?',
        [patientId]
      );

      if (!patientRow) {
        throw new Error('Patient not found');
      }

      // Get all appointments for the patient
      const appointmentRows = this.db.executeQuery<any>(
        `SELECT 
          a.id, a.start_time, a.appointment_type, a.status,
          u.first_name || ' ' || u.last_name as dentist_name
         FROM appointments a
         JOIN users u ON a.dentist_id = u.id
         WHERE a.patient_id = ?
         ORDER BY a.start_time DESC`,
        [patientId]
      );

      const visits: VisitHistoryItem[] = [];

      for (const appt of appointmentRows) {
        // Get treatments associated with this appointment (if any)
        const treatmentRows = this.db.executeQuery<any>(
          `SELECT t.description
           FROM treatments t
           JOIN treatment_plans tp ON t.treatment_plan_id = tp.id
           WHERE tp.patient_id = ? AND t.completed_date IS NOT NULL
           AND DATE(t.completed_date) = DATE(?)`,
          [patientId, appt.start_time]
        );

        visits.push({
          appointmentId: appt.id,
          date: new Date(appt.start_time),
          dentistName: appt.dentist_name,
          appointmentType: appt.appointment_type,
          status: appt.status,
          treatments: treatmentRows.map((t) => t.description),
        });
      }

      logger.info('Patient visit history generated', { patientId, totalVisits: visits.length });

      return {
        patientId,
        patientName: patientRow.name,
        visits,
        totalVisits: visits.length,
      };
    } catch (error) {
      logger.error('Failed to generate patient visit history', { error, patientId });
      throw error;
    }
  }

  /**
   * Generate inventory report
   * Show current stock levels and usage trends
   * Requirements: 7.4
   */
  generateInventoryReport(): InventoryReport {
    try {
      const rows = this.db.executeQuery<any>(
        `SELECT 
          id, name, category, current_quantity, minimum_threshold, unit_cost
         FROM inventory_items
         ORDER BY category, name`
      );

      const items: InventoryReportItem[] = [];
      let totalValue = 0;
      let lowStockCount = 0;

      for (const row of rows) {
        const itemValue = row.current_quantity * row.unit_cost;
        const isLowStock = row.current_quantity < row.minimum_threshold;

        if (isLowStock) {
          lowStockCount++;
        }

        // Calculate usage trend based on last 30 days of transactions
        const usageTrend = this.calculateUsageTrend(row.id);

        items.push({
          id: row.id,
          name: row.name,
          category: row.category,
          currentQuantity: row.current_quantity,
          minimumThreshold: row.minimum_threshold,
          unitCost: row.unit_cost,
          totalValue: itemValue,
          isLowStock,
          usageTrend,
        });

        totalValue += itemValue;
      }

      logger.info('Inventory report generated', { itemCount: items.length, totalValue });

      return {
        generatedAt: new Date(),
        items,
        totalValue,
        lowStockCount,
      };
    } catch (error) {
      logger.error('Failed to generate inventory report', { error });
      throw error;
    }
  }

  /**
   * Calculate usage trend for an inventory item
   * Based on last 30 days of transactions
   */
  private calculateUsageTrend(itemId: string): 'increasing' | 'stable' | 'decreasing' {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const rows = this.db.executeQuery<any>(
        `SELECT quantity_change, created_at
         FROM inventory_transactions
         WHERE item_id = ? AND transaction_type = 'Usage' AND created_at >= ?
         ORDER BY created_at`,
        [itemId, thirtyDaysAgo.toISOString()]
      );

      if (rows.length < 2) {
        return 'stable';
      }

      // Calculate average usage in first half vs second half
      const midpoint = Math.floor(rows.length / 2);
      const firstHalf = rows.slice(0, midpoint);
      const secondHalf = rows.slice(midpoint);

      const firstHalfAvg =
        Math.abs(firstHalf.reduce((sum, r) => sum + r.quantity_change, 0)) / firstHalf.length;
      const secondHalfAvg =
        Math.abs(secondHalf.reduce((sum, r) => sum + r.quantity_change, 0)) / secondHalf.length;

      const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

      if (changePercent > 20) {
        return 'increasing';
      } else if (changePercent < -20) {
        return 'decreasing';
      } else {
        return 'stable';
      }
    } catch (error) {
      logger.error('Failed to calculate usage trend', { error, itemId });
      return 'stable';
    }
  }

  /**
   * Export report to PDF
   * Requirements: 7.6
   */
  exportToPDF(report: any, reportType: string): Buffer {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));

      // Header
      doc.fontSize(20).text(`${reportType} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      // Report content based on type
      if (reportType === 'Daily Appointment') {
        this.renderAppointmentReportPDF(doc, report as AppointmentReport);
      } else if (reportType === 'Revenue') {
        this.renderRevenueReportPDF(doc, report as RevenueReport);
      } else if (reportType === 'Visit History') {
        this.renderVisitHistoryPDF(doc, report as VisitHistoryReport);
      } else if (reportType === 'Inventory') {
        this.renderInventoryReportPDF(doc, report as InventoryReport);
      }

      doc.end();

      return Buffer.concat(buffers);
    } catch (error) {
      logger.error('Failed to export report to PDF', { error, reportType });
      throw error;
    }
  }

  private renderAppointmentReportPDF(doc: PDFKit.PDFDocument, report: AppointmentReport): void {
    doc.fontSize(14).text(`Date: ${report.date.toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(12).text(`Total Appointments: ${report.total}`);
    doc.text(`Scheduled: ${report.scheduled}`);
    doc.text(`Confirmed: ${report.confirmed}`);
    doc.text(`Completed: ${report.completed}`);
    doc.text(`Cancelled: ${report.cancelled}`);
    doc.moveDown();

    // Appointment list
    doc.fontSize(14).text('Appointments:');
    doc.moveDown();
    report.appointments.forEach((appt) => {
      doc
        .fontSize(10)
        .text(
          `${appt.startTime.toLocaleTimeString()} - ${appt.patientName} with ${appt.dentistName} (${appt.status})`
        );
    });
  }

  private renderRevenueReportPDF(doc: PDFKit.PDFDocument, report: RevenueReport): void {
    doc
      .fontSize(14)
      .text(
        `Period: ${report.dateRange.start.toLocaleDateString()} - ${report.dateRange.end.toLocaleDateString()}`
      );
    doc.moveDown();
    doc.fontSize(12).text(`Total Revenue: $${report.totalRevenue.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(14).text('Revenue Breakdown:');
    doc.moveDown();
    report.groups.forEach((group) => {
      doc
        .fontSize(10)
        .text(
          `${group.groupName}: $${group.revenue.toFixed(2)} (${group.invoiceCount} invoices, ${group.paymentCount} payments)`
        );
    });
  }

  private renderVisitHistoryPDF(doc: PDFKit.PDFDocument, report: VisitHistoryReport): void {
    doc.fontSize(14).text(`Patient: ${report.patientName}`);
    doc.moveDown();
    doc.fontSize(12).text(`Total Visits: ${report.totalVisits}`);
    doc.moveDown();

    doc.fontSize(14).text('Visit History:');
    doc.moveDown();
    report.visits.forEach((visit) => {
      doc
        .fontSize(10)
        .text(
          `${visit.date.toLocaleDateString()} - ${visit.appointmentType} with ${visit.dentistName} (${visit.status})`
        );
      if (visit.treatments.length > 0) {
        doc.fontSize(9).text(`  Treatments: ${visit.treatments.join(', ')}`);
      }
    });
  }

  private renderInventoryReportPDF(doc: PDFKit.PDFDocument, report: InventoryReport): void {
    doc.fontSize(12).text(`Total Value: $${report.totalValue.toFixed(2)}`);
    doc.text(`Low Stock Items: ${report.lowStockCount}`);
    doc.moveDown();

    doc.fontSize(14).text('Inventory Items:');
    doc.moveDown();
    report.items.forEach((item) => {
      doc
        .fontSize(10)
        .text(
          `${item.name} (${item.category}): ${item.currentQuantity} ${item.isLowStock ? '⚠️ LOW STOCK' : ''}`
        );
      doc
        .fontSize(9)
        .text(
          `  Value: $${item.totalValue.toFixed(2)}, Trend: ${item.usageTrend}, Min: ${item.minimumThreshold}`
        );
    });
  }

  /**
   * Export report to CSV
   * Requirements: 7.6
   */
  exportToCSV(report: any, reportType: string): string {
    try {
      let csv = '';

      if (reportType === 'Daily Appointment') {
        const r = report as AppointmentReport;
        csv = 'Date,Patient,Dentist,Time,Duration,Type,Status\n';
        r.appointments.forEach((appt) => {
          csv += `${r.date.toLocaleDateString()},"${appt.patientName}","${appt.dentistName}",${appt.startTime.toLocaleTimeString()},${appt.duration},"${appt.appointmentType}",${appt.status}\n`;
        });
      } else if (reportType === 'Revenue') {
        const r = report as RevenueReport;
        csv = 'Group,Revenue,Invoice Count,Payment Count\n';
        r.groups.forEach((group) => {
          csv += `"${group.groupName}",${group.revenue},${group.invoiceCount},${group.paymentCount}\n`;
        });
      } else if (reportType === 'Visit History') {
        const r = report as VisitHistoryReport;
        csv = 'Date,Dentist,Type,Status,Treatments\n';
        r.visits.forEach((visit) => {
          csv += `${visit.date.toLocaleDateString()},"${visit.dentistName}","${visit.appointmentType}",${visit.status},"${visit.treatments.join('; ')}"\n`;
        });
      } else if (reportType === 'Inventory') {
        const r = report as InventoryReport;
        csv = 'Name,Category,Quantity,Min Threshold,Unit Cost,Total Value,Low Stock,Trend\n';
        r.items.forEach((item) => {
          csv += `"${item.name}","${item.category}",${item.currentQuantity},${item.minimumThreshold},${item.unitCost},${item.totalValue},${item.isLowStock},${item.usageTrend}\n`;
        });
      }

      logger.info('Report exported to CSV', { reportType });
      return csv;
    } catch (error) {
      logger.error('Failed to export report to CSV', { error, reportType });
      throw error;
    }
  }

  /**
   * Get dashboard analytics
   * Calculate daily revenue, appointment count, pending treatments
   * Requirements: 7.7
   */
  getDashboardAnalytics(date: Date = new Date()): DashboardAnalytics {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Daily revenue (sum of payments made today)
      const revenueRow = this.db.executeQueryOne<any>(
        `SELECT COALESCE(SUM(amount), 0) as revenue
         FROM payments
         WHERE payment_date >= ? AND payment_date <= ?`,
        [startOfDay.toISOString(), endOfDay.toISOString()]
      );

      // Appointment count (appointments scheduled for today)
      const appointmentRow = this.db.executeQueryOne<any>(
        `SELECT COUNT(*) as count
         FROM appointments
         WHERE start_time >= ? AND start_time <= ?`,
        [startOfDay.toISOString(), endOfDay.toISOString()]
      );

      // Pending treatments (treatments with status 'Planned' or 'In Progress')
      const treatmentRow = this.db.executeQueryOne<any>(
        `SELECT COUNT(*) as count
         FROM treatments
         WHERE status IN ('Planned', 'In Progress')`
      );

      logger.info('Dashboard analytics retrieved', { date });

      return {
        dailyRevenue: revenueRow?.revenue || 0,
        appointmentCount: appointmentRow?.count || 0,
        pendingTreatments: treatmentRow?.count || 0,
        date,
      };
    } catch (error) {
      logger.error('Failed to get dashboard analytics', { error, date });
      throw error;
    }
  }

  /**
   * Calculate KPI metrics
   * Average treatment value, patient retention rate, appointment utilization
   * Requirements: 7.8
   */
  calculateKPIs(period: DateRange): KPIMetrics {
    try {
      // Average treatment value = total revenue / treatment count
      const revenueRow = this.db.executeQueryOne<any>(
        `SELECT 
          COALESCE(SUM(p.amount), 0) as total_revenue,
          COUNT(DISTINCT t.id) as treatment_count
         FROM payments p
         JOIN invoices i ON p.invoice_id = i.id
         JOIN invoice_items ii ON ii.invoice_id = i.id
         JOIN treatments t ON ii.treatment_id = t.id
         WHERE p.payment_date >= ? AND p.payment_date <= ?`,
        [period.start.toISOString(), period.end.toISOString()]
      );

      const averageTreatmentValue =
        revenueRow && revenueRow.treatment_count > 0
          ? revenueRow.total_revenue / revenueRow.treatment_count
          : 0;

      // Patient retention rate = returning patients / total patients
      // Returning patients = patients with more than one appointment in the period
      const retentionRow = this.db.executeQueryOne<any>(
        `SELECT 
          COUNT(DISTINCT patient_id) as total_patients,
          COUNT(DISTINCT CASE WHEN appointment_count > 1 THEN patient_id END) as returning_patients
         FROM (
           SELECT patient_id, COUNT(*) as appointment_count
           FROM appointments
           WHERE start_time >= ? AND start_time <= ?
           GROUP BY patient_id
         )`,
        [period.start.toISOString(), period.end.toISOString()]
      );

      const patientRetentionRate =
        retentionRow && retentionRow.total_patients > 0
          ? (retentionRow.returning_patients / retentionRow.total_patients) * 100
          : 0;

      // Appointment utilization = completed appointments / scheduled appointments
      const utilizationRow = this.db.executeQueryOne<any>(
        `SELECT 
          COUNT(*) as scheduled_count,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count
         FROM appointments
         WHERE start_time >= ? AND start_time <= ?`,
        [period.start.toISOString(), period.end.toISOString()]
      );

      const appointmentUtilization =
        utilizationRow && utilizationRow.scheduled_count > 0
          ? (utilizationRow.completed_count / utilizationRow.scheduled_count) * 100
          : 0;

      logger.info('KPIs calculated', { period });

      return {
        averageTreatmentValue,
        patientRetentionRate,
        appointmentUtilization,
        period,
      };
    } catch (error) {
      logger.error('Failed to calculate KPIs', { error, period });
      throw error;
    }
  }
}
