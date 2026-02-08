import { IpcMain } from 'electron';
import { DatabaseManager } from '../../database/DatabaseManager';
import { AuthService } from '../services/AuthService';
import { PatientService } from '../services/PatientService';
import { AppointmentService } from '../services/AppointmentService';
import { TreatmentService } from '../services/TreatmentService';
import { BillingService } from '../services/BillingService';
import { InventoryService } from '../services/InventoryService';
import { ReportService } from '../services/ReportService';
import { ClinicalNotesService } from '../services/ClinicalNotesService';
import { logger } from '../utils/logger';

/**
 * Set up all IPC handlers for communication between renderer and main process
 * Requirements: 9.1, 9.5
 */
export function setupIpcHandlers(ipcMain: IpcMain, dbManager: DatabaseManager): void {
  logger.info('Setting up IPC handlers');

  // Initialize services
  const authService = new AuthService(dbManager);
  const patientService = new PatientService(dbManager);
  const appointmentService = new AppointmentService(dbManager);
  const treatmentService = new TreatmentService(dbManager);
  const billingService = new BillingService(dbManager);
  const inventoryService = new InventoryService(dbManager);
  const reportService = new ReportService(dbManager);
  const clinicalNotesService = new ClinicalNotesService(dbManager);

  // Health check handlers
  ipcMain.handle('app:health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  ipcMain.handle('db:health', async () => {
    try {
      const result = dbManager.executeQueryOne('SELECT 1 as test');
      return { status: 'ok', connected: true };
    } catch (error) {
      logger.error('Database health check failed', { error });
      return { status: 'error', connected: false, error: String(error) };
    }
  });

  // ==================== Authentication Handlers ====================
  ipcMain.handle('auth:login', async (event, username: string, password: string) => {
    try {
      const result = authService.authenticate(username, password);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Login failed', { error, username });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auth:logout', async (event, sessionId: string) => {
    try {
      authService.logout(sessionId);
      return { success: true };
    } catch (error) {
      logger.error('Logout failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auth:validateSession', async (event, sessionId: string) => {
    try {
      const user = authService.validateSession(sessionId);
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auth:createUser', async (event, userData: any, creatorId: string) => {
    try {
      const user = authService.createUser(userData);
      return { success: true, data: user };
    } catch (error) {
      logger.error('Create user failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('auth:changePassword', async (event, userId: string, oldPassword: string, newPassword: string) => {
    try {
      const result = authService.changePassword(userId, oldPassword, newPassword);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Change password failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Patient Handlers ====================
  ipcMain.handle('patients:create', async (event, patientData: any) => {
    try {
      const patient = patientService.createPatient(patientData);
      return { success: true, data: patient };
    } catch (error) {
      logger.error('Create patient failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('patients:get', async (event, patientId: string) => {
    try {
      const patient = patientService.getPatient(patientId);
      return { success: true, data: patient };
    } catch (error) {
      logger.error('Get patient failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('patients:update', async (event, patientId: string, patientData: any) => {
    try {
      const patient = patientService.updatePatient(patientId, patientData);
      return { success: true, data: patient };
    } catch (error) {
      logger.error('Update patient failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('patients:delete', async (event, patientId: string) => {
    try {
      const result = patientService.deletePatient(patientId);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Delete patient failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('patients:search', async (event, searchQuery: any) => {
    try {
      const patients = patientService.searchPatients(searchQuery);
      return { success: true, data: patients };
    } catch (error) {
      logger.error('Search patients failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Appointment Handlers ====================
  ipcMain.handle('appointments:create', async (event, appointmentData: any, createdBy: string) => {
    try {
      const appointment = appointmentService.createAppointment(appointmentData, createdBy);
      return { success: true, data: appointment };
    } catch (error) {
      logger.error('Create appointment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('appointments:get', async (event, appointmentId: string) => {
    try {
      const appointment = appointmentService.getAppointment(appointmentId);
      return { success: true, data: appointment };
    } catch (error) {
      logger.error('Get appointment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('appointments:update', async (event, appointmentId: string, appointmentData: any) => {
    try {
      const appointment = appointmentService.updateAppointment(appointmentId, appointmentData);
      return { success: true, data: appointment };
    } catch (error) {
      logger.error('Update appointment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('appointments:cancel', async (event, appointmentId: string, reason: string) => {
    try {
      const appointment = appointmentService.cancelAppointment(appointmentId, reason);
      return { success: true, data: appointment };
    } catch (error) {
      logger.error('Cancel appointment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('appointments:search', async (event, searchQuery: any) => {
    try {
      const appointments = appointmentService.searchAppointments(searchQuery);
      return { success: true, data: appointments };
    } catch (error) {
      logger.error('Search appointments failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('appointments:getByDateRange', async (event, start: string, end: string) => {
    try {
      const appointments = appointmentService.getAppointmentsByDateRange(new Date(start), new Date(end));
      return { success: true, data: appointments };
    } catch (error) {
      logger.error('Get appointments by date range failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('appointments:generateReminders', async () => {
    try {
      const reminders = appointmentService.generateReminders();
      return { success: true, data: reminders };
    } catch (error) {
      logger.error('Generate reminders failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Treatment Handlers ====================
  ipcMain.handle('treatments:createPlan', async (event, patientId: string, treatments: any[], createdBy: string) => {
    try {
      const plan = treatmentService.createTreatmentPlan(patientId, treatments, createdBy);
      return { success: true, data: plan };
    } catch (error) {
      logger.error('Create treatment plan failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('treatments:getPlan', async (event, planId: string) => {
    try {
      const plan = treatmentService.getTreatmentPlan(planId);
      return { success: true, data: plan };
    } catch (error) {
      logger.error('Get treatment plan failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('treatments:updateStatus', async (event, treatmentId: string, status: string, userId: string) => {
    try {
      const treatment = treatmentService.updateTreatmentStatus(treatmentId, status as any);
      return { success: true, data: treatment };
    } catch (error) {
      logger.error('Update treatment status failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('treatments:complete', async (event, treatmentId: string, materialsUsed: any[], userId: string) => {
    try {
      const completionData = {
        completedBy: userId,
        materialsUsed: materialsUsed || []
      };
      const treatment = treatmentService.completeTreatment(treatmentId, completionData);
      return { success: true, data: treatment };
    } catch (error) {
      logger.error('Complete treatment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('treatments:getByPatient', async (event, patientId: string) => {
    try {
      const plans = treatmentService.getTreatmentsByPatient(patientId);
      return { success: true, data: plans };
    } catch (error) {
      logger.error('Get treatments by patient failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // Treatment Template Handlers
  ipcMain.handle('templates:create', async (event, templateData: any) => {
    try {
      const template = treatmentService.createTreatmentTemplate(templateData);
      return { success: true, data: template };
    } catch (error) {
      logger.error('Create template failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('templates:getAll', async () => {
    try {
      const templates = treatmentService.getAllTreatmentTemplates();
      return { success: true, data: templates };
    } catch (error) {
      logger.error('Get all templates failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('templates:update', async (event, templateId: string, templateData: any) => {
    try {
      const template = treatmentService.updateTreatmentTemplate(templateId, templateData);
      return { success: true, data: template };
    } catch (error) {
      logger.error('Update template failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('templates:delete', async (event, templateId: string) => {
    try {
      treatmentService.deleteTreatmentTemplate(templateId);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      logger.error('Delete template failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Billing Handlers ====================
  ipcMain.handle('billing:createInvoice', async (event, invoiceData: any, createdBy: string) => {
    try {
      const invoice = billingService.createInvoice(invoiceData, createdBy);
      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Create invoice failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('billing:getInvoice', async (event, invoiceId: string) => {
    try {
      const invoice = billingService.getInvoice(invoiceId);
      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Get invoice failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('billing:recordPayment', async (event, invoiceId: string, paymentData: any, recordedBy: string) => {
    try {
      const invoice = billingService.recordPayment(invoiceId, paymentData, recordedBy);
      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Record payment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('billing:applyDiscount', async (event, invoiceId: string, discountData: any, userId: string) => {
    try {
      const user = authService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      const invoice = billingService.applyDiscount(invoiceId, discountData, userId, user.role);
      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Apply discount failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('billing:generatePDF', async (event, invoiceId: string) => {
    try {
      const pdfBuffer = billingService.generateInvoicePDF(invoiceId);
      return { success: true, data: pdfBuffer };
    } catch (error) {
      logger.error('Generate invoice PDF failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('billing:searchInvoices', async (event, searchQuery: any) => {
    try {
      const invoices = billingService.searchInvoices(searchQuery);
      return { success: true, data: invoices };
    } catch (error) {
      logger.error('Search invoices failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Inventory Handlers ====================
  ipcMain.handle('inventory:createItem', async (event, itemData: any, createdBy: string) => {
    try {
      const item = inventoryService.createItem(itemData);
      return { success: true, data: item };
    } catch (error) {
      logger.error('Create inventory item failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('inventory:getItem', async (event, itemId: string) => {
    try {
      const item = inventoryService.getItem(itemId);
      return { success: true, data: item };
    } catch (error) {
      logger.error('Get inventory item failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('inventory:updateItem', async (event, itemId: string, itemData: any) => {
    try {
      const item = inventoryService.updateItem(itemId, itemData);
      return { success: true, data: item };
    } catch (error) {
      logger.error('Update inventory item failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('inventory:adjustQuantity', async (event, itemId: string, quantity: number, reason: string, userId: string) => {
    try {
      const item = inventoryService.updateQuantity(itemId, quantity, reason, userId);
      return { success: true, data: item };
    } catch (error) {
      logger.error('Adjust inventory quantity failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('inventory:getLowStock', async (event, threshold?: number) => {
    try {
      const items = inventoryService.getLowStockItems(threshold);
      return { success: true, data: items };
    } catch (error) {
      logger.error('Get low stock items failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('inventory:getTransactionHistory', async (event, itemId: string) => {
    try {
      const transactions = inventoryService.getTransactionHistory(itemId);
      return { success: true, data: transactions };
    } catch (error) {
      logger.error('Get transaction history failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('inventory:search', async (event, searchQuery: any) => {
    try {
      const items = inventoryService.searchItems(searchQuery);
      return { success: true, data: items };
    } catch (error) {
      logger.error('Search inventory failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Report Handlers ====================
  ipcMain.handle('reports:dailyAppointments', async (event, date: string) => {
    try {
      const report = reportService.generateDailyAppointmentReport(new Date(date));
      return { success: true, data: report };
    } catch (error) {
      logger.error('Generate daily appointment report failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reports:revenue', async (event, dateRange: any, groupBy: string) => {
    try {
      const report = reportService.generateRevenueReport(
        { start: new Date(dateRange.start), end: new Date(dateRange.end) },
        groupBy as any
      );
      return { success: true, data: report };
    } catch (error) {
      logger.error('Generate revenue report failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reports:visitHistory', async (event, patientId: string) => {
    try {
      const report = reportService.generatePatientVisitHistory(patientId);
      return { success: true, data: report };
    } catch (error) {
      logger.error('Generate visit history report failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reports:inventory', async () => {
    try {
      const report = reportService.generateInventoryReport();
      return { success: true, data: report };
    } catch (error) {
      logger.error('Generate inventory report failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reports:exportPDF', async (event, report: any, reportType: string) => {
    try {
      const pdfBuffer = reportService.exportToPDF(report, reportType);
      return { success: true, data: pdfBuffer };
    } catch (error) {
      logger.error('Export report to PDF failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reports:exportCSV', async (event, report: any, reportType: string) => {
    try {
      const csv = reportService.exportToCSV(report, reportType);
      return { success: true, data: csv };
    } catch (error) {
      logger.error('Export report to CSV failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reports:dashboard', async (event, date?: string) => {
    try {
      const analytics = reportService.getDashboardAnalytics(date ? new Date(date) : undefined);
      return { success: true, data: analytics };
    } catch (error) {
      logger.error('Get dashboard analytics failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('reports:kpis', async (event, dateRange: any) => {
    try {
      const kpis = reportService.calculateKPIs({
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      });
      return { success: true, data: kpis };
    } catch (error) {
      logger.error('Calculate KPIs failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Clinical Notes Handlers ====================
  ipcMain.handle('clinicalNotes:create', async (event, noteData: any, createdBy: string) => {
    try {
      const note = clinicalNotesService.createClinicalNote(noteData, createdBy);
      return { success: true, data: note };
    } catch (error) {
      logger.error('Create clinical note failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('clinicalNotes:get', async (event, noteId: string) => {
    try {
      const note = clinicalNotesService.getClinicalNote(noteId);
      return { success: true, data: note };
    } catch (error) {
      logger.error('Get clinical note failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('clinicalNotes:update', async (event, noteId: string, noteText: string, userId: string) => {
    try {
      const note = clinicalNotesService.updateClinicalNote(noteId, noteText, userId);
      return { success: true, data: note };
    } catch (error) {
      logger.error('Update clinical note failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('clinicalNotes:getByPatient', async (event, patientId: string) => {
    try {
      const notes = clinicalNotesService.getClinicalNotesByPatient(patientId);
      return { success: true, data: notes };
    } catch (error) {
      logger.error('Get clinical notes by patient failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('clinicalNotes:delete', async (event, noteId: string) => {
    try {
      const result = clinicalNotesService.deleteClinicalNote(noteId);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Delete clinical note failed', { error });
      return { success: false, error: String(error) };
    }
  });

  // ==================== Attachment Handlers ====================
  ipcMain.handle('attachments:upload', async (event, attachmentData: any, uploadedBy: string) => {
    try {
      const attachment = clinicalNotesService.uploadAttachment(attachmentData, uploadedBy);
      return { success: true, data: attachment };
    } catch (error) {
      logger.error('Upload attachment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('attachments:get', async (event, attachmentId: string) => {
    try {
      const attachment = clinicalNotesService.getAttachment(attachmentId);
      return { success: true, data: attachment };
    } catch (error) {
      logger.error('Get attachment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('attachments:getByPatient', async (event, patientId: string) => {
    try {
      const attachments = clinicalNotesService.getAttachmentsByPatient(patientId);
      return { success: true, data: attachments };
    } catch (error) {
      logger.error('Get attachments by patient failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('attachments:getMetadata', async (event, patientId: string) => {
    try {
      const metadata = clinicalNotesService.getAttachmentMetadata(patientId);
      return { success: true, data: metadata };
    } catch (error) {
      logger.error('Get attachment metadata failed', { error });
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('attachments:delete', async (event, attachmentId: string) => {
    try {
      const result = clinicalNotesService.deleteAttachment(attachmentId);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Delete attachment failed', { error });
      return { success: false, error: String(error) };
    }
  });

  logger.info('IPC handlers setup complete');
}
