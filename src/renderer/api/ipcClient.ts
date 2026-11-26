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

// ---- Adapters between the UI field names and the main-process field names ----
const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function appointmentToUi(apt: any, patientNames: Record<string, string> = {}) {
  const start = new Date(apt.startTime);
  const end = new Date(start.getTime() + (apt.duration || 0) * 60000);
  return {
    ...apt,
    appointmentDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: hhmm(start),
    endTime: hhmm(end),
    patientName: patientNames[apt.patientId] || apt.patientId,
    dentistName: apt.dentistName || 'Dentist',
    reason: apt.notes || apt.appointmentType || '',
  };
}

export function appointmentToBackend(ui: any) {
  const start = new Date(`${ui.appointmentDate}T${ui.startTime}:00`);
  const end = new Date(`${ui.appointmentDate}T${ui.endTime}:00`);
  return {
    patientId: ui.patientId,
    dentistId: ui.dentistId,
    startTime: start.toISOString(),
    duration: Math.round((end.getTime() - start.getTime()) / 60000),
    appointmentType: ui.appointmentType || ui.reason || 'General',
    notes: ui.reason || undefined,
    ...(ui.status ? { status: ui.status } : {}),
  };
}

export function inventoryToUi(item: any) {
  return { ...item, itemName: item.name, unit: item.unitOfMeasure };
}

export function inventoryToBackend(ui: any) {
  return {
    name: ui.itemName,
    category: ui.category,
    unitOfMeasure: ui.unit,
    currentQuantity: Number(ui.currentQuantity),
    minimumThreshold: Number(ui.minimumThreshold),
    unitCost: Number(ui.unitCost),
  };
}

export function transactionToUi(t: any) {
  return { ...t, transactionDate: t.createdAt, userId: t.performedBy, reason: t.reason || '' };
}

export function invoiceToUi(inv: any, patientNames: Record<string, string> = {}) {
  return {
    ...inv,
    // the invoice preview reads `total` on items and `paymentMethod` on payments
    items: (inv.items || []).map((it: any) => ({ ...it, total: it.totalPrice ?? it.total })),
    payments: (inv.payments || []).map((p: any) => ({ ...p, paymentMethod: p.method ?? p.paymentMethod })),
    invoiceDate: inv.createdAt,
    total: inv.totalAmount,
    patientName: patientNames[inv.patientId] || inv.patientId,
    status: inv.status === 'Partial' ? 'Partially Paid' : inv.status,
  };
}

const mapData = (res: ApiResponse, fn: (x: any) => any): ApiResponse => {
  if (res.success && Array.isArray(res.data)) return { ...res, data: res.data.map(fn) };
  if (res.success && res.data) return { ...res, data: fn(res.data) };
  return res;
};

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
  private async patientNameMap(): Promise<Record<string, string>> {
    const res = await this.invoke('patients:search', {});
    const map: Record<string, string> = {};
    if (res.success && Array.isArray(res.data)) {
      for (const p of res.data) map[p.id] = `${p.firstName} ${p.lastName}`.trim();
    }
    return map;
  }

  async createAppointment(appointmentData: any, createdBy: string) {
    const names = await this.patientNameMap();
    const res = await this.invoke('appointments:create', appointmentToBackend(appointmentData), createdBy);
    return mapData(res, (a) => appointmentToUi(a, names));
  }

  async getAppointment(appointmentId: string) {
    const names = await this.patientNameMap();
    return mapData(await this.invoke('appointments:get', appointmentId), (a) => appointmentToUi(a, names));
  }

  async updateAppointment(appointmentId: string, appointmentData: any) {
    const names = await this.patientNameMap();
    const res = await this.invoke('appointments:update', appointmentId, appointmentToBackend(appointmentData));
    return mapData(res, (a) => appointmentToUi(a, names));
  }

  async cancelAppointment(appointmentId: string, reason: string) {
    return this.invoke('appointments:cancel', appointmentId, reason);
  }

  async searchAppointments(searchQuery: any) {
    const names = await this.patientNameMap();
    const q: any = { ...searchQuery };
    if (q.date) {
      const day = new Date(`${q.date}T00:00:00`);
      q.dateRange = {
        start: day.toISOString(),
        end: new Date(day.getTime() + 24 * 3600 * 1000 - 1).toISOString(),
      };
      delete q.date;
    }
    return mapData(await this.invoke('appointments:search', q), (a) => appointmentToUi(a, names));
  }

  async getAppointmentsByDateRange(start: string, end: string) {
    const names = await this.patientNameMap();
    return mapData(await this.invoke('appointments:getByDateRange', start, end), (a) => appointmentToUi(a, names));
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
    const names = await this.patientNameMap();
    const backendData = {
      patientId: invoiceData.patientId,
      treatmentIds: (invoiceData.items || []).map((i: any) => i.treatmentId).filter(Boolean),
      taxRate: (Number(invoiceData.taxRate) || 0) / 100,
    };
    return mapData(await this.invoke('billing:createInvoice', backendData, createdBy), (i) => invoiceToUi(i, names));
  }

  async getInvoice(invoiceId: string) {
    const names = await this.patientNameMap();
    return mapData(await this.invoke('billing:getInvoice', invoiceId), (i) => invoiceToUi(i, names));
  }

  async recordPayment(invoiceId: string, paymentData: any, recordedBy: string) {
    const names = await this.patientNameMap();
    const backendData = {
      amount: Number(paymentData.amount),
      method: paymentData.method || paymentData.paymentMethod,
      reference: paymentData.reference || undefined,
      date: new Date(),
    };
    return mapData(await this.invoke('billing:recordPayment', invoiceId, backendData, recordedBy), (i) => invoiceToUi(i, names));
  }

  async applyDiscount(invoiceId: string, discountData: any, userId: string) {
    return this.invoke('billing:applyDiscount', invoiceId, discountData, userId);
  }

  async generateInvoicePDF(invoiceId: string) {
    return this.invoke('billing:generatePDF', invoiceId);
  }

  async searchInvoices(searchQuery: any) {
    const names = await this.patientNameMap();
    const { startDate, endDate, status, patientName, ...rest } = searchQuery || {};
    const q: any = { ...rest };
    if (status) q.status = status === 'Partially Paid' ? 'Partial' : status;
    if (startDate || endDate) {
      q.dateRange = {
        start: new Date(startDate ? `${startDate}T00:00:00` : '1970-01-01T00:00:00').toISOString(),
        end: new Date(endDate ? `${endDate}T23:59:59` : '2999-12-31T23:59:59').toISOString(),
      };
    }
    const res = mapData(await this.invoke('billing:searchInvoices', q), (i) => invoiceToUi(i, names));
    if (patientName && res.success && Array.isArray(res.data)) {
      const needle = String(patientName).toLowerCase();
      res.data = res.data.filter((i: any) => String(i.patientName).toLowerCase().includes(needle));
    }
    return res;
  }

  // ==================== Inventory ====================
  async createInventoryItem(itemData: any, createdBy: string) {
    return mapData(await this.invoke('inventory:createItem', inventoryToBackend(itemData), createdBy), inventoryToUi);
  }

  async getInventoryItem(itemId: string) {
    return mapData(await this.invoke('inventory:getItem', itemId), inventoryToUi);
  }

  async updateInventoryItem(itemId: string, itemData: any) {
    return mapData(await this.invoke('inventory:updateItem', itemId, inventoryToBackend(itemData)), inventoryToUi);
  }

  async adjustInventoryQuantity(itemId: string, quantity: number, reason: string, userId: string) {
    return this.invoke('inventory:adjustQuantity', itemId, quantity, reason, userId);
  }

  async getLowStockItems(threshold?: number) {
    return mapData(await this.invoke('inventory:getLowStock', threshold), inventoryToUi);
  }

  async getInventoryTransactionHistory(itemId: string) {
    return mapData(await this.invoke('inventory:getTransactionHistory', itemId), transactionToUi);
  }

  async searchInventory(searchQuery: any) {
    const q: any = { ...searchQuery };
    if ('itemName' in q) {
      q.name = q.itemName;
      delete q.itemName;
    }
    return mapData(await this.invoke('inventory:search', q), inventoryToUi);
  }

  // ==================== Reports ====================
  async getDailyAppointmentReport(date: string) {
    return this.invoke('reports:dailyAppointments', date);
  }

  // The report screens use { startDate, endDate } (yyyy-mm-dd); the backend wants { start, end } as
  // dates, and the end date should cover the whole day.
  private toBackendRange(range: any) {
    if (range && range.start && range.end) return range;
    return {
      start: new Date(`${range.startDate}T00:00:00`),
      end: new Date(`${range.endDate}T23:59:59.999`),
    };
  }

  // The screens use kebab-case report types; the report service uses display names.
  static REPORT_TYPES: Record<string, string> = {
    'daily-appointments': 'Daily Appointment',
    revenue: 'Revenue',
    'visit-history': 'Visit History',
    inventory: 'Inventory',
  };

  async getRevenueReport(dateRange: any, groupBy: string) {
    // The "Date" option has no backend grouping: it means one overall total
    const backendGroup = groupBy === 'dentist' || groupBy === 'treatment' ? groupBy : 'none';
    return this.invoke('reports:revenue', this.toBackendRange(dateRange), backendGroup);
  }

  async getVisitHistoryReport(patientId: string) {
    return this.invoke('reports:visitHistory', patientId);
  }

  async getInventoryReport() {
    return this.invoke('reports:inventory');
  }

  async exportReportToPDF(report: any, reportType: string) {
    return this.invoke('reports:exportPDF', report, IpcClient.REPORT_TYPES[reportType] ?? reportType);
  }

  async exportReportToCSV(report: any, reportType: string) {
    return this.invoke('reports:exportCSV', report, IpcClient.REPORT_TYPES[reportType] ?? reportType);
  }

  async getDashboardAnalytics(date?: string) {
    return this.invoke('reports:dashboard', date);
  }

  async getKPIs(dateRange: any) {
    return this.invoke('reports:kpis', this.toBackendRange(dateRange));
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
