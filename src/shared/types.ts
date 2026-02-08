/**
 * Shared type definitions used across main and renderer processes
 */

// User types
export type UserRole = 'Administrator' | 'Dentist' | 'Receptionist';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Patient types
export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  allergies: string[];
  medicalConditions: string[];
  currentMedications: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Appointment types
export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  startTime: Date;
  duration: number; // minutes
  appointmentType: string;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Treatment types
export type TreatmentStatus = 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Treatment {
  id: string;
  treatmentPlanId: string;
  code: string;
  description: string;
  estimatedCost: number;
  status: TreatmentStatus;
  completedDate?: Date;
  completedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  treatments: Treatment[];
  totalEstimatedCost: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Invoice types
export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Cancelled';
export type PaymentMethod = 'Cash' | 'Credit Card' | 'Debit Card' | 'Check' | 'Insurance';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  treatmentId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  dueDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paymentDate: Date;
  recordedBy: string;
  createdAt: Date;
}

// Inventory types
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unitOfMeasure: string;
  currentQuantity: number;
  minimumThreshold: number;
  unitCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export type InventoryTransactionType = 'Addition' | 'Usage' | 'Adjustment';

export interface InventoryTransaction {
  id: string;
  itemId: string;
  transactionType: InventoryTransactionType;
  quantityChange: number;
  quantityAfter: number;
  reason?: string;
  referenceId?: string;
  performedBy: string;
  createdAt: Date;
}

// Clinical notes types
export type ClinicalNoteType = 'General' | 'Treatment' | 'Consultation';

export interface ClinicalNote {
  id: string;
  patientId: string;
  noteText: string;
  noteType: ClinicalNoteType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Attachment types
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

// Treatment template types
export interface TreatmentTemplate {
  id: string;
  code: string;
  description: string;
  category: string;
  defaultCost: number;
  defaultDuration?: number; // minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

// Search and filter types
export interface SearchQuery {
  query?: string;
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Date range type
export interface DateRange {
  start: Date;
  end: Date;
}
