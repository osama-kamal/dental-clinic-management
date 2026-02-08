/**
 * IPC Client Wrapper
 * Provides type-safe interface for communicating with main process
 * Requirements: 9.1, 9.5
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class IpcClient {
  /**
   * Invoke IPC handler and return typed response
   */
  private async invoke<T = any>(channel: string, ...args: any[]): Promise<ApiResponse<T>> {
    try {
      const response = await window.api.invoke(channel, ...args);
      return response as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ==================== Authentication ====================
  async login(username: string, password: string) {
    return this.invoke('auth:login', username, password);
  }

  async logout(sessionId: string) {
    return this.invoke('auth:logout', sessionId);
  }

  async validateSession(sessionId: string) {
    return this.invoke('auth:validateSession', sessionId);
  }

  async createUser(userData: any, creatorId: string) {
    return this.invoke('auth:createUser', userData, creatorId);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    return this.invoke('auth:changePassword', userId, oldPassword, newPassword);
  }

  // ==================== Patients ====================
  async createPatient(patientData: any) {
    return this.invoke('patients:create', patientData);
  }

  async getPatient(patientId: string) {
    return this.invoke('patients:get', patientId);
  }

  async updatePatient(patientId: string, patientData: any) {
    return this.invoke('patients:update', patientId, patientData);
  }

  async deletePatient(patientId: string) {
    return this.invoke('patients:delete', patientId);
  }

  async searchPatients(searchQuery: any) {
    return this.invoke('patients:search', searchQuery);
  }

  // ==================== Appointments ====================
  async createAppointment(appointmentData: any, createdBy: string) {
    return this.invoke('appointments:create', appointmentData, createdBy);
  }

  async getAppointment(appointmentId: string) {
    return this.invoke('appointments:get', appointmentId);
  }

  async updateAppointment(appointmentId: string, appointmentData: any) {
    return this.invoke('appointments:update', appointmentId, appointmentData);
  }

  async cancelAppointment(appointmentId: string, reason: string) {
    return this.invoke('appointments:cancel', appointmentId, reason);
  }

  async searchAppointments(searchQuery: any) {
    return this.invoke('appointments:search', searchQuery);
  }

  async getAppointmentsByDateRange(start: string, end: string) {
    return this.invoke('appointments:getByDateRange', start, end);
  }

  async generateReminders() {
    return this.invoke('appointments:generateReminders');
  }

  // ==================== Treatments ====================
  async createTreatmentPlan(patientId: string, treatments: any[], createdBy: string) {
    return this.invoke('treatments:createPlan', patientId, treatments, createdBy);
  }

  async getTreatmentPlan(planId: string) {
    return this.invoke('treatments:getPlan', planId);
  }

  async updateTreatmentStatus(treatmentId: string, status: string, userId: string) {
    return this.invoke('treatments:updateStatus', treatmentId, status, userId);
  }

  async completeTreatment(treatmentId: string, materialsUsed: any[], userId: string) {
    return this.invoke('treatments:complete', treatmentId, materialsUsed, userId);
  }

  async getTreatmentsByPatient(patientId: string) {
    return this.invoke('treatments:getByPatient', patientId);
  }

  // ==================== Treatment Templates ====================
  async createTemplate(templateData: any) {
    return this.invoke('templates:create', templateData);
  }

  async getAllTemplates() {
    return this.invoke('templates:getAll');
  }

  async updateTemplate(templateId: string, templateData: any) {
    return this.invoke('templates:update', templateId, templateData);
  }

  async deleteTemplate(templateId: string) {
    return this.invoke('templates:delete', templateId);
  }

  // ==================== Billing ====================
  async createInvoice(invoiceData: any, createdBy: string) {
    return this.invoke('billing:createInvoice', invoiceData, createdBy);
  }

  async getInvoice(invoiceId: string) {
    return this.invoke('billing:getInvoice', invoiceId);
  }

  async recordPayment(invoiceId: string, paymentData: any, recordedBy: string) {
    return this.invoke('billing:recordPayment', invoiceId, paymentData, recordedBy);
  }

  async applyDiscount(invoiceId: string, discountData: any, userId: string) {
    return this.invoke('billing:applyDiscount', invoiceId, discountData, userId);
  }

  async generateInvoicePDF(invoiceId: string) {
    return this.invoke('billing:generatePDF', invoiceId);
  }

  async searchInvoices(searchQuery: any) {
    return this.invoke('billing:searchInvoices', searchQuery);
  }

  // ==================== Inventory ====================
  async createInventoryItem(itemData: any, createdBy: string) {
    return this.invoke('inventory:createItem', itemData, createdBy);
  }

  async getInventoryItem(itemId: string) {
    return this.invoke('inventory:getItem', itemId);
  }

  async updateInventoryItem(itemId: string, itemData: any) {
    return this.invoke('inventory:updateItem', itemId, itemData);
  }

  async adjustInventoryQuantity(itemId: string, quantity: number, reason: string, userId: string) {
    return this.invoke('inventory:adjustQuantity', itemId, quantity, reason, userId);
  }

  async getLowStockItems(threshold?: number) {
    return this.invoke('inventory:getLowStock', threshold);
  }

  async getInventoryTransactionHistory(itemId: string) {
    return this.invoke('inventory:getTransactionHistory', itemId);
  }

  async searchInventory(searchQuery: any) {
    return this.invoke('inventory:search', searchQuery);
  }

  // ==================== Reports ====================
  async getDailyAppointmentReport(date: string) {
    return this.invoke('reports:dailyAppointments', date);
  }

  async getRevenueReport(dateRange: any, groupBy: string) {
    return this.invoke('reports:revenue', dateRange, groupBy);
  }

  async getVisitHistoryReport(patientId: string) {
    return this.invoke('reports:visitHistory', patientId);
  }

  async getInventoryReport() {
    return this.invoke('reports:inventory');
  }

  async exportReportToPDF(report: any, reportType: string) {
    return this.invoke('reports:exportPDF', report, reportType);
  }

  async exportReportToCSV(report: any, reportType: string) {
    return this.invoke('reports:exportCSV', report, reportType);
  }

  async getDashboardAnalytics(date?: string) {
    return this.invoke('reports:dashboard', date);
  }

  async getKPIs(dateRange: any) {
    return this.invoke('reports:kpis', dateRange);
  }

  // ==================== Clinical Notes ====================
  async createClinicalNote(noteData: any, createdBy: string) {
    return this.invoke('clinicalNotes:create', noteData, createdBy);
  }

  async getClinicalNote(noteId: string) {
    return this.invoke('clinicalNotes:get', noteId);
  }

  async updateClinicalNote(noteId: string, noteText: string, userId: string) {
    return this.invoke('clinicalNotes:update', noteId, noteText, userId);
  }

  async getClinicalNotesByPatient(patientId: string) {
    return this.invoke('clinicalNotes:getByPatient', patientId);
  }

  async deleteClinicalNote(noteId: string) {
    return this.invoke('clinicalNotes:delete', noteId);
  }

  // ==================== Attachments ====================
  async uploadAttachment(attachmentData: any, uploadedBy: string) {
    return this.invoke('attachments:upload', attachmentData, uploadedBy);
  }

  async getAttachment(attachmentId: string) {
    return this.invoke('attachments:get', attachmentId);
  }

  async getAttachmentsByPatient(patientId: string) {
    return this.invoke('attachments:getByPatient', patientId);
  }

  async getAttachmentMetadata(patientId: string) {
    return this.invoke('attachments:getMetadata', patientId);
  }

  async deleteAttachment(attachmentId: string) {
    return this.invoke('attachments:delete', attachmentId);
  }

  // ==================== Health Check ====================
  async checkAppHealth() {
    return this.invoke('app:health');
  }

  async checkDatabaseHealth() {
    return this.invoke('db:health');
  }
}

// Export singleton instance
export const ipcClient = new IpcClient();
