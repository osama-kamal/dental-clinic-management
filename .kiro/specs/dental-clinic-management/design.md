# Design Document: Dental Clinic Management System

## Overview

The Dental Clinic Management System is a production-ready offline desktop application built with Electron, React, Node.js, and SQLite. The system provides comprehensive clinic management capabilities including patient records, appointment scheduling, treatment planning, billing, inventory management, and reporting—all without requiring internet connectivity.

### Key Design Principles

1. **Offline-First Architecture**: All data stored locally in SQLite; no external dependencies
2. **Responsive UI**: All blocking operations run in Electron's main process via IPC
3. **Data Integrity**: ACID transactions and automatic backups ensure data safety
4. **Role-Based Security**: Three-tier access control (Administrator, Dentist, Receptionist)
5. **Scalability**: Designed to handle 50,000+ patient records with sub-500ms query times

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Material-UI for components
- **Desktop Framework**: Electron 28+ with context isolation enabled
- **Backend**: Node.js 20+ with Express for IPC request handling
- **Database**: SQLite 3.45+ with better-sqlite3 (synchronous API)
- **State Management**: React Context API with useReducer for complex state
- **PDF Generation**: PDFKit for invoices and reports
- **Authentication**: bcrypt for password hashing (cost factor 10)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Database   │  │   Business   │  │     IPC      │  │
│  │   Manager    │──│     Logic    │──│   Handlers   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                                      │         │
│         │ (SQLite)                            │         │
│         ▼                                      ▼         │
│  ┌──────────────┐                    ┌──────────────┐  │
│  │    SQLite    │                    │  IPC Bridge  │  │
│  │   Database   │                    └──────────────┘  │
│  └──────────────┘                            │         │
└──────────────────────────────────────────────┼─────────┘
                                                │
                                                │ (IPC)
                                                │
┌──────────────────────────────────────────────┼─────────┐
│                Electron Renderer Process      │         │
│                                               ▼         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    React     │  │     IPC      │  │    State     │ │
│  │  Components  │──│    Client    │──│  Management  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                                              │
│         ▼                                              │
│  ┌──────────────────────────────────────────────────┐ │
│  │              User Interface (DOM)                 │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Process Separation

**Main Process Responsibilities:**
- Database connection management and query execution
- Business logic and data validation
- File system operations (backups, exports)
- Application lifecycle management
- IPC request handling

**Renderer Process Responsibilities:**
- UI rendering and user interaction
- Form validation and input handling
- State management for UI components
- IPC requests to main process
- Display of data received from main process

### IPC Communication Pattern

All communication between renderer and main process follows a request-response pattern:

```typescript
// Renderer Process
const result = await window.api.invoke('patients:create', patientData);

// Main Process (preload.js exposes API)
ipcMain.handle('patients:create', async (event, patientData) => {
  return await patientService.createPatient(patientData);
});
```

## Components and Interfaces

### Database Layer

**DatabaseManager**
- Manages SQLite connection lifecycle
- Executes queries with transaction support
- Handles database migrations
- Performs automatic backups

```typescript
interface DatabaseManager {
  initialize(): Promise<void>;
  executeQuery<T>(sql: string, params?: any[]): T[];
  executeTransaction(operations: () => void): void;
  backup(destination: string): Promise<void>;
  close(): void;
}
```

### Service Layer

**PatientService**
- CRUD operations for patient records
- Patient search and filtering
- Medical history management

```typescript
interface PatientService {
  createPatient(data: PatientInput): Patient;
  getPatient(id: string): Patient | null;
  updatePatient(id: string, data: Partial<PatientInput>): Patient;
  searchPatients(query: SearchQuery): Patient[];
  deletePatient(id: string): boolean;
}

interface PatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: EmergencyContact;
  medicalHistory?: MedicalHistory;
  allergies?: string[];
}
```

**AppointmentService**
- Appointment scheduling and management
- Conflict detection
- Calendar view data preparation

```typescript
interface AppointmentService {
  createAppointment(data: AppointmentInput): Appointment;
  getAppointment(id: string): Appointment | null;
  updateAppointment(id: string, data: Partial<AppointmentInput>): Appointment;
  getAppointmentsByDateRange(start: Date, end: Date): Appointment[];
  checkConflict(dentistId: string, startTime: Date, duration: number): boolean;
  cancelAppointment(id: string, reason: string): Appointment;
}

interface AppointmentInput {
  patientId: string;
  dentistId: string;
  startTime: Date;
  duration: number; // minutes
  appointmentType: string;
  notes?: string;
}
```

**TreatmentService**
- Treatment plan creation and tracking
- Treatment status management
- Inventory integration for material usage

```typescript
interface TreatmentService {
  createTreatmentPlan(patientId: string, treatments: TreatmentInput[]): TreatmentPlan;
  getTreatmentPlan(id: string): TreatmentPlan | null;
  updateTreatmentStatus(treatmentId: string, status: TreatmentStatus): Treatment;
  completeTreatment(treatmentId: string, materialsUsed: MaterialUsage[]): Treatment;
  getTreatmentsByPatient(patientId: string): TreatmentPlan[];
}

interface TreatmentInput {
  code: string;
  description: string;
  estimatedCost: number;
  notes?: string;
}

type TreatmentStatus = 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
```

**BillingService**
- Invoice generation and management
- Payment processing and tracking
- Discount application with authorization

```typescript
interface BillingService {
  createInvoice(data: InvoiceInput): Invoice;
  getInvoice(id: string): Invoice | null;
  recordPayment(invoiceId: string, payment: PaymentInput): Invoice;
  applyDiscount(invoiceId: string, discount: DiscountInput, userId: string): Invoice;
  generateInvoicePDF(invoiceId: string): Buffer;
  getInvoicesByPatient(patientId: string): Invoice[];
}

interface InvoiceInput {
  patientId: string;
  treatmentIds: string[];
  taxRate: number;
  dueDate?: Date;
}

interface PaymentInput {
  amount: number;
  method: 'Cash' | 'Credit Card' | 'Debit Card' | 'Check' | 'Insurance';
  reference?: string;
  date: Date;
}
```

**InventoryService**
- Inventory item management
- Stock level tracking and alerts
- Transaction history

```typescript
interface InventoryService {
  createItem(data: InventoryItemInput): InventoryItem;
  getItem(id: string): InventoryItem | null;
  updateQuantity(id: string, quantity: number, reason: string, userId: string): InventoryItem;
  deductMaterials(materials: MaterialUsage[]): void;
  getLowStockItems(threshold?: number): InventoryItem[];
  getTransactionHistory(itemId: string): InventoryTransaction[];
}

interface InventoryItemInput {
  name: string;
  category: string;
  unitOfMeasure: string;
  currentQuantity: number;
  minimumThreshold: number;
  unitCost: number;
}
```

**ReportService**
- Report generation for various metrics
- Data aggregation and analysis
- Export to PDF and CSV

```typescript
interface ReportService {
  generateAppointmentReport(dateRange: DateRange): AppointmentReport;
  generateRevenueReport(dateRange: DateRange, groupBy?: 'dentist' | 'treatment'): RevenueReport;
  generatePatientVisitHistory(patientId: string): VisitHistoryReport;
  generateInventoryReport(): InventoryReport;
  exportToPDF(report: Report): Buffer;
  exportToCSV(report: Report): string;
}
```

**AuthService**
- User authentication
- Session management
- Password hashing and verification

```typescript
interface AuthService {
  authenticate(username: string, password: string): AuthResult;
  createUser(data: UserInput): User;
  updateUser(id: string, data: Partial<UserInput>): User;
  changePassword(userId: string, oldPassword: string, newPassword: string): boolean;
  validateSession(sessionId: string): User | null;
  logout(sessionId: string): void;
}

interface UserInput {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'Administrator' | 'Dentist' | 'Receptionist';
  email?: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  sessionId?: string;
  error?: string;
}
```

### UI Components

**Layout Components**
- `AppShell`: Main application layout with navigation
- `Sidebar`: Role-based navigation menu
- `Header`: User info, notifications, logout

**Patient Components**
- `PatientList`: Searchable, paginated patient list
- `PatientForm`: Patient registration and editing
- `PatientDetail`: Complete patient information view
- `MedicalHistoryPanel`: Medical history and clinical notes

**Appointment Components**
- `AppointmentCalendar`: Calendar view (daily, weekly, monthly)
- `AppointmentForm`: Appointment creation and editing
- `AppointmentList`: Filterable appointment list

**Treatment Components**
- `TreatmentPlanForm`: Treatment plan creation
- `TreatmentList`: Patient treatment history
- `TreatmentTemplateSelector`: Treatment library browser

**Billing Components**
- `InvoiceForm`: Invoice creation
- `InvoiceList`: Searchable invoice list
- `PaymentForm`: Payment recording
- `InvoicePreview`: Printable invoice view

**Inventory Components**
- `InventoryList`: Searchable inventory with stock alerts
- `InventoryForm`: Item creation and editing
- `StockAdjustmentForm`: Quantity adjustment with reason
- `InventoryTransactionHistory`: Transaction log

**Report Components**
- `ReportDashboard`: KPI overview and quick stats
- `ReportGenerator`: Report parameter selection
- `ReportViewer`: Report display with export options

## Data Models

### Database Schema

**users**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Administrator', 'Dentist', 'Receptionist')),
  email TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**patients**
```sql
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  allergies TEXT, -- JSON array
  medical_conditions TEXT, -- JSON array
  current_medications TEXT, -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_phone ON patients(phone);
```

**appointments**
```sql
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  dentist_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  appointment_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled')),
  notes TEXT,
  cancellation_reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (dentist_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_dentist_time ON appointments(dentist_id, start_time);
CREATE INDEX idx_appointments_date ON appointments(start_time);
```

**treatment_plans**
```sql
CREATE TABLE treatment_plans (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  total_estimated_cost REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**treatments**
```sql
CREATE TABLE treatments (
  id TEXT PRIMARY KEY,
  treatment_plan_id TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_cost REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Planned', 'In Progress', 'Completed', 'Cancelled')),
  completed_date TEXT,
  completed_by TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id),
  FOREIGN KEY (completed_by) REFERENCES users(id)
);

CREATE INDEX idx_treatments_plan ON treatments(treatment_plan_id);
CREATE INDEX idx_treatments_status ON treatments(status);
```

**treatment_templates**
```sql
CREATE TABLE treatment_templates (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  default_cost REAL NOT NULL,
  default_duration INTEGER, -- minutes
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_treatment_templates_category ON treatment_templates(category);
```

**invoices**
```sql
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  patient_id TEXT NOT NULL,
  subtotal REAL NOT NULL,
  tax_rate REAL NOT NULL,
  tax_amount REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  balance REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Unpaid', 'Partial', 'Paid', 'Cancelled')),
  due_date TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(created_at);
```

**invoice_items**
```sql
CREATE TABLE invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  treatment_id TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (treatment_id) REFERENCES treatments(id)
);
```

**payments**
```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('Cash', 'Credit Card', 'Debit Card', 'Check', 'Insurance')),
  reference TEXT,
  payment_date TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
```

**inventory_items**
```sql
CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  current_quantity REAL NOT NULL,
  minimum_threshold REAL NOT NULL,
  unit_cost REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_inventory_low_stock ON inventory_items(current_quantity, minimum_threshold);
```

**inventory_transactions**
```sql
CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('Addition', 'Usage', 'Adjustment')),
  quantity_change REAL NOT NULL,
  quantity_after REAL NOT NULL,
  reason TEXT,
  reference_id TEXT, -- treatment_id or adjustment reference
  performed_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES inventory_items(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id);
```

**clinical_notes**
```sql
CREATE TABLE clinical_notes (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  note_text TEXT NOT NULL,
  note_type TEXT NOT NULL, -- 'General', 'Treatment', 'Consultation'
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_clinical_notes_patient ON clinical_notes(patient_id);
```

**attachments**
```sql
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_data BLOB NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_attachments_patient ON attachments(patient_id);
```

**sessions**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_activity TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
```

### TypeScript Type Definitions

```typescript
interface Patient {
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

interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  startTime: Date;
  duration: number;
  appointmentType: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
  cancellationReason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TreatmentPlan {
  id: string;
  patientId: string;
  treatments: Treatment[];
  totalEstimatedCost: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Treatment {
  id: string;
  treatmentPlanId: string;
  code: string;
  description: string;
  estimatedCost: number;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  completedDate?: Date;
  completedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Invoice {
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
  status: 'Unpaid' | 'Partial' | 'Paid' | 'Cancelled';
  dueDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryItem {
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

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'Administrator' | 'Dentist' | 'Receptionist';
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **Round-trip properties** appear multiple times (patient save 2.2, appointment save 3.3) - these can be consolidated into a general persistence property
2. **Conflict detection** for appointments (3.2 and 3.6) is stated twice - combine into one property
3. **Offline operation** (10.1 and 10.3) both test no network requests - combine into one property
4. **Inventory deduction** (4.7 and 6.4) is the same behavior from different perspectives - combine into one property
5. **Search correctness** appears for multiple entities (patients, appointments, treatments, invoices, inventory) - these follow the same pattern but test different domains, so keep separate
6. **Authorization properties** (1.5, 1.6, 1.7) can be combined into a single role-based access control property

After reflection, the following properties provide unique validation value:

### Authentication and Authorization Properties

**Property 1: Valid credential authentication**
*For any* user with valid credentials (correct username and password), authentication should succeed and return the user with their assigned role.
**Validates: Requirements 1.2**

**Property 2: Invalid credential rejection**
*For any* invalid credentials (non-existent username, incorrect password, or empty fields), authentication should fail and return an error.
**Validates: Requirements 1.3**

**Property 3: Role-based access control**
*For any* user and system function, access should be granted if and only if the user's role has permission for that function (Administrator: all functions, Dentist: patient records/treatments/appointments, Receptionist: appointments/billing/basic patient info).
**Validates: Requirements 1.5, 1.6, 1.7**

**Property 4: Session timeout**
*For any* user session inactive for 30 minutes or more, the session should be invalidated and require re-authentication.
**Validates: Requirements 1.8**

**Property 5: Password hashing**
*For any* stored password, it should be a bcrypt hash with cost factor of at least 10, and the original password should not be recoverable.
**Validates: Requirements 1.9**

### Patient Management Properties

**Property 6: Patient creation validation**
*For any* patient creation attempt missing required fields (firstName, lastName, dateOfBirth, or phone), the creation should be rejected with a validation error.
**Validates: Requirements 2.1**

**Property 7: Patient persistence round-trip**
*For any* valid patient record saved to the database, querying by the patient ID should return a patient with equivalent data.
**Validates: Requirements 2.2**

**Property 8: Patient search correctness**
*For any* patient search query, all returned results should match the query on at least one of: name (partial), phone (partial), email (partial), or patient ID (exact).
**Validates: Requirements 2.3**

**Property 9: Patient ID uniqueness**
*For any* set of patients in the database, all patient IDs should be unique.
**Validates: Requirements 2.4**

**Property 10: Patient record completeness**
*For any* patient record view, the rendered output should contain all patient fields including firstName, lastName, dateOfBirth, phone, medicalHistory, allergies, and emergencyContact.
**Validates: Requirements 2.5**

**Property 11: Patient update validation**
*For any* patient update attempt missing required fields, the update should be rejected with a validation error.
**Validates: Requirements 2.6**

**Property 12: Patient deletion referential integrity**
*For any* patient with associated appointments or treatments, deletion should be prevented and return an error.
**Validates: Requirements 2.7**

**Property 13: Allergy warning display**
*For any* patient record with non-empty allergies array, the UI should display a prominent warning indicator.
**Validates: Requirements 2.8**

### Appointment Scheduling Properties

**Property 14: Appointment creation validation**
*For any* appointment creation attempt missing required fields (patientId, dentistId, startTime, duration, or appointmentType), the creation should be rejected with a validation error.
**Validates: Requirements 3.1**

**Property 15: Appointment conflict detection**
*For any* appointment creation or reschedule where the time range [startTime, startTime + duration] overlaps with an existing appointment for the same dentist, the operation should be prevented and return a conflict error.
**Validates: Requirements 3.2, 3.6, 3.9**

**Property 16: Appointment persistence round-trip**
*For any* valid appointment saved to the database, querying by the appointment ID should return an appointment with equivalent data.
**Validates: Requirements 3.3**

**Property 17: Appointment status color-coding**
*For any* appointment displayed in the calendar view, the color should correspond to its status (Scheduled, Confirmed, Completed, or Cancelled).
**Validates: Requirements 3.5**

**Property 18: Appointment cancellation preservation**
*For any* cancelled appointment, the status should be updated to 'Cancelled' and the record should remain in the database (not deleted).
**Validates: Requirements 3.7**

**Property 19: Appointment reminder generation**
*For any* appointment scheduled more than 24 hours in the future, a reminder should be generated 24 hours before the scheduled time.
**Validates: Requirements 3.8**

### Treatment Planning Properties

**Property 20: Treatment plan patient association**
*For any* treatment plan created, it should be associated with exactly one valid patient ID.
**Validates: Requirements 4.1**

**Property 21: Treatment required fields**
*For any* treatment added to a treatment plan, it should include code, description, estimatedCost, and status fields.
**Validates: Requirements 4.2**

**Property 22: Treatment completion metadata**
*For any* treatment marked as completed, the completedDate and completedBy fields should be set with the current date and logged-in user ID.
**Validates: Requirements 4.4**

**Property 23: Patient treatment plan completeness**
*For any* patient with treatment plans, viewing the patient record should display all associated treatment plans with their current status.
**Validates: Requirements 4.5**

**Property 24: Treatment plan cost calculation**
*For any* treatment plan, the totalEstimatedCost should equal the sum of estimatedCost for all treatments in the plan.
**Validates: Requirements 4.6**

**Property 25: Treatment completion inventory deduction**
*For any* treatment marked as completed with associated materials, the inventory quantities for those materials should be decremented by the used amounts.
**Validates: Requirements 4.7, 6.4**

**Property 26: Treatment modification history**
*For any* treatment modification (status change, cost update, etc.), a history record should be created with timestamp and user ID.
**Validates: Requirements 4.8**

### Billing and Invoicing Properties

**Property 27: Invoice required fields**
*For any* invoice created, it should include patientId, items array, subtotal, taxRate, taxAmount, totalAmount, and status fields.
**Validates: Requirements 5.1**

**Property 28: Invoice number uniqueness**
*For any* set of invoices in the database, all invoice numbers should be unique.
**Validates: Requirements 5.2**

**Property 29: Invoice calculation correctness**
*For any* invoice, the following calculations should hold: taxAmount = subtotal × taxRate, totalAmount = subtotal + taxAmount - discountAmount, balance = totalAmount - amountPaid.
**Validates: Requirements 5.3**

**Property 30: Payment balance update**
*For any* payment recorded on an invoice, the amountPaid should increase by the payment amount and balance should decrease by the payment amount.
**Validates: Requirements 5.4**

**Property 31: Invoice paid status**
*For any* invoice where amountPaid ≥ totalAmount, the status should be 'Paid'.
**Validates: Requirements 5.6**

**Property 32: Discount authorization**
*For any* discount application, it should be rejected if the user's role lacks authorization for the discount percentage (e.g., Receptionist cannot apply discounts over 10%).
**Validates: Requirements 5.7**

**Property 33: Invoice PDF generation**
*For any* invoice, generating a PDF should produce a valid PDF buffer that can be parsed and contains the invoice number.
**Validates: Requirements 5.8**

**Property 34: Invoice search filtering**
*For any* invoice search with filters (patientId, dateRange, status), all returned results should match all applied filters.
**Validates: Requirements 5.9**

### Inventory Management Properties

**Property 35: Inventory item creation validation**
*For any* inventory item creation attempt missing required fields (name, category, unitOfMeasure, or currentQuantity), the creation should be rejected with a validation error.
**Validates: Requirements 6.1**

**Property 36: Inventory transaction tracking**
*For any* inventory quantity change, a transaction record should be created with transactionType, quantityChange, quantityAfter, and performedBy fields.
**Validates: Requirements 6.2, 6.5**

**Property 37: Low stock warning**
*For any* inventory item where currentQuantity < minimumThreshold, the item should appear in the low stock warnings list.
**Validates: Requirements 6.3**

**Property 38: Stock adjustment authorization**
*For any* stock adjustment attempt without a reason or without proper user authorization, the adjustment should be rejected.
**Validates: Requirements 6.6**

**Property 39: Inventory value calculation**
*For any* inventory item, the calculated value should equal unitCost × currentQuantity.
**Validates: Requirements 6.7**

**Property 40: Inventory search filtering**
*For any* inventory search with filters (category, stockLevel, name), all returned results should match all applied filters.
**Validates: Requirements 6.8**

### Reports and Analytics Properties

**Property 41: Daily appointment report completeness**
*For any* date, the daily appointment report should include all appointments on that date grouped by status (Scheduled, Confirmed, Completed, Cancelled).
**Validates: Requirements 7.1**

**Property 42: Revenue report calculation**
*For any* date range and grouping (by dentist or treatment type), the revenue report should correctly sum all invoice amounts for completed treatments in that range.
**Validates: Requirements 7.2**

**Property 43: Patient visit history completeness**
*For any* patient, the visit history report should include all appointments for that patient in chronological order.
**Validates: Requirements 7.3**

**Property 44: Inventory report accuracy**
*For any* point in time, the inventory report should accurately reflect current stock levels and usage trends based on transaction history.
**Validates: Requirements 7.4**

**Property 45: Report export format validity**
*For any* report, exporting to PDF should produce a valid PDF buffer, and exporting to CSV should produce valid CSV text with proper headers and delimiters.
**Validates: Requirements 7.6**

**Property 46: Dashboard analytics accuracy**
*For any* system state, the dashboard should display correct metrics: daily revenue (sum of today's payments), appointment count (today's appointments), and pending treatments (treatments with status 'Planned' or 'In Progress').
**Validates: Requirements 7.7**

**Property 47: KPI calculation correctness**
*For any* dataset, KPIs should be mathematically correct: average treatment value = total revenue / treatment count, patient retention rate = returning patients / total patients, appointment utilization = completed appointments / scheduled appointments.
**Validates: Requirements 7.8**

### Data Persistence and Integrity Properties

**Property 48: Transaction atomicity**
*For any* database operation involving multiple changes, either all changes should be committed or all should be rolled back (no partial commits).
**Validates: Requirements 8.2**

**Property 49: Transaction rollback on failure**
*For any* database transaction that encounters an error, all changes within that transaction should be rolled back and the database should remain in its pre-transaction state.
**Validates: Requirements 8.3**

**Property 50: Backup file creation**
*For any* backup operation (automatic or manual), a backup file should be created at the specified location with a timestamp in the filename.
**Validates: Requirements 8.5, 8.7**

**Property 51: Backup retention policy**
*For any* backup directory, only the most recent 30 daily backups should be retained (older backups should be automatically deleted).
**Validates: Requirements 8.6**

**Property 52: Database corruption detection**
*For any* application startup with a corrupted database, the application should prevent launch and display an error message with recovery instructions.
**Validates: Requirements 8.9**

### User Interface Properties

**Property 53: Long operation progress indicator**
*For any* operation taking longer than 1 second, a progress indicator should be displayed in the UI.
**Validates: Requirements 9.2**

**Property 54: Concurrent access data consistency**
*For any* set of concurrent database operations on different records, all operations should complete successfully and the database should remain consistent.
**Validates: Requirements 9.6**

**Property 55: Pagination for large lists**
*For any* list view with more than 100 records, pagination should be applied with a maximum of 100 records per page.
**Validates: Requirements 9.7**

### Offline Operation Properties

**Property 56: No network requests**
*For any* application operation during normal use, no network requests should be made (verified by monitoring network activity).
**Validates: Requirements 10.1, 10.3**

### Application Lifecycle Properties

**Property 57: Database schema migration**
*For any* application startup where the database schema version is older than the application version, migrations should be applied to update the schema.
**Validates: Requirements 11.2**

**Property 58: Database initialization failure handling**
*For any* application startup where database initialization fails, the application should display an error message and prevent the UI from loading.
**Validates: Requirements 11.3**

**Property 59: Database connection cleanup**
*For any* application shutdown, all database connections should be closed before the process exits.
**Validates: Requirements 11.4**

**Property 60: Unsaved changes confirmation**
*For any* application close attempt with unsaved changes in any form, a confirmation dialog should be displayed.
**Validates: Requirements 11.5**

**Property 61: Error logging**
*For any* error that occurs (handled or unhandled), an entry should be written to the error log file with timestamp, error message, and stack trace.
**Validates: Requirements 11.6, 11.7**

**Property 62: Crash data preservation**
*For any* application crash, the database should remain in a consistent state and no data should be lost (verified by checking database integrity after restart).
**Validates: Requirements 11.8**

### Search and Filtering Properties

**Property 63: Patient search partial matching**
*For any* patient search query string, all returned patients should have at least one field (firstName, lastName, phone, email, or patientId) that contains the query string as a substring (case-insensitive).
**Validates: Requirements 12.1**

**Property 64: Appointment search filtering**
*For any* appointment search with filters (dateRange, dentistId, status, patientId), all returned appointments should match all applied filters.
**Validates: Requirements 12.2**

**Property 65: Treatment search filtering**
*For any* treatment search with filters (treatmentType, status, dateRange), all returned treatments should match all applied filters.
**Validates: Requirements 12.3**

**Property 66: Search auto-complete**
*For any* search query with 3 or more characters, auto-complete suggestions should be provided based on matching records.
**Validates: Requirements 12.5**

**Property 67: Search result highlighting**
*For any* search result, the matching text should be highlighted in the displayed result.
**Validates: Requirements 12.6**

**Property 68: Empty search result message**
*For any* search query that returns no results, a helpful message should be displayed suggesting alternative searches.
**Validates: Requirements 12.7**

### Medical History and Documentation Properties

**Property 69: Medical history completeness**
*For any* patient with medical history data (conditions, medications, allergies), viewing the patient record should display all medical history fields.
**Validates: Requirements 13.1**

**Property 70: Clinical note metadata**
*For any* clinical note created, it should have a timestamp (createdAt) and be associated with the logged-in user (createdBy).
**Validates: Requirements 13.2**

**Property 71: Critical condition alert**
*For any* patient with critical medical conditions flagged, viewing the patient record should display a prominent alert.
**Validates: Requirements 13.4**

**Property 72: Clinical note history**
*For any* clinical note modification, the modification should be tracked in the history with timestamp and user ID.
**Validates: Requirements 13.5**

**Property 73: Attachment storage**
*For any* document or image attached to a patient record, it should be stored in the database as a BLOB with metadata (fileName, fileType, fileSize).
**Validates: Requirements 13.6**

**Property 74: Attachment format support**
*For any* file with extension .jpg, .jpeg, .png, or .pdf, the system should accept it as a valid attachment.
**Validates: Requirements 13.7**

**Property 75: Attachment inline viewing**
*For any* attachment, it should be viewable within the application without launching external applications.
**Validates: Requirements 13.8**

### Treatment Template Properties

**Property 76: Treatment template CRUD**
*For any* treatment template operation (create, update, delete) by an Administrator, the operation should succeed and be reflected in the template library.
**Validates: Requirements 14.3**

**Property 77: Template modification isolation**
*For any* treatment template modification, existing treatment plans that used the old template should remain unchanged (no retroactive updates).
**Validates: Requirements 14.4**

**Property 78: Template default values**
*For any* treatment template, it should have defaultCost and defaultDuration fields that are populated when the template is selected.
**Validates: Requirements 14.5**

**Property 79: Template auto-population**
*For any* treatment created from a template, the treatment fields (code, description, estimatedCost) should be automatically populated with the template's values.
**Validates: Requirements 14.6**

### Multi-User Concurrency Properties

**Property 80: Non-conflicting concurrent modifications**
*For any* set of concurrent modifications to different records, all modifications should succeed without conflicts.
**Validates: Requirements 15.2**

**Property 81: Optimistic locking conflict detection**
*For any* concurrent modifications to the same record by different users, the system should detect the conflict using optimistic locking (version checking).
**Validates: Requirements 15.3**

**Property 82: Conflict notification**
*For any* detected record conflict, the user attempting the second modification should receive a notification requiring manual conflict resolution.
**Validates: Requirements 15.4**

**Property 83: Session data refresh**
*For any* data modification by one user, other active user sessions should see the updated data within 5 seconds.
**Validates: Requirements 15.6**



## Error Handling

### Error Categories

**Validation Errors**
- Missing required fields
- Invalid data formats (e.g., invalid email, phone number)
- Business rule violations (e.g., appointment conflicts)
- Response: Return error object with field-specific messages, HTTP 400 equivalent

**Database Errors**
- Connection failures
- Transaction failures
- Constraint violations (unique, foreign key)
- Corruption detection
- Response: Log error, rollback transaction, return generic error to user, HTTP 500 equivalent

**Authorization Errors**
- Insufficient permissions for operation
- Invalid or expired session
- Response: Return error with permission requirements, HTTP 403 equivalent

**Not Found Errors**
- Record does not exist
- Response: Return error with resource type and ID, HTTP 404 equivalent

**Concurrency Errors**
- Optimistic locking conflicts
- Response: Return error with conflict details, require user resolution

**File System Errors**
- Backup directory not accessible
- Insufficient disk space
- Attachment file too large
- Response: Log error, display user-friendly message with resolution steps

### Error Handling Strategy

**Main Process Error Handling**
```typescript
try {
  // Database operation
  const result = db.executeQuery(sql, params);
  return { success: true, data: result };
} catch (error) {
  logger.error('Database operation failed', { error, sql, params });
  
  if (error.code === 'SQLITE_CONSTRAINT') {
    return { success: false, error: 'Constraint violation', details: error.message };
  }
  
  if (error.code === 'SQLITE_CORRUPT') {
    // Critical error - prevent further operations
    app.quit();
    return { success: false, error: 'Database corruption detected' };
  }
  
  return { success: false, error: 'Database operation failed' };
}
```

**Renderer Process Error Handling**
```typescript
try {
  const result = await window.api.invoke('patients:create', patientData);
  
  if (!result.success) {
    // Display user-friendly error
    showErrorNotification(result.error);
    return;
  }
  
  // Success handling
  showSuccessNotification('Patient created successfully');
} catch (error) {
  // IPC communication error
  logger.error('IPC call failed', { error });
  showErrorNotification('Communication error. Please try again.');
}
```

**Global Error Handlers**
```typescript
// Main Process
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  dialog.showErrorBox('Application Error', 'An unexpected error occurred. The application will restart.');
  app.relaunch();
  app.exit(1);
});

// Renderer Process
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', { error: event.reason });
  showErrorNotification('An unexpected error occurred. Please refresh the page.');
});
```

### Error Recovery

**Database Transaction Rollback**
- All multi-step operations wrapped in transactions
- Automatic rollback on any error
- Database state remains consistent

**Session Recovery**
- Expired sessions redirect to login
- Unsaved form data preserved in local state
- User can resume after re-authentication

**Backup Recovery**
- Database corruption detected on startup
- User prompted to restore from backup
- Backup selection UI with timestamps
- Restore operation with integrity verification

**Crash Recovery**
- SQLite WAL mode ensures database consistency
- Uncommitted transactions automatically rolled back
- Application restarts cleanly without data loss

## Testing Strategy

### Dual Testing Approach

The system requires both **unit testing** and **property-based testing** for comprehensive coverage. These approaches are complementary:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Property-Based Testing

**Library Selection**: Use **fast-check** for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `// Feature: dental-clinic-management, Property {number}: {property_text}`

**Example Property Test**:
```typescript
import fc from 'fast-check';

describe('Patient Management', () => {
  // Feature: dental-clinic-management, Property 7: Patient persistence round-trip
  it('should persist and retrieve patient data correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          firstName: fc.string({ minLength: 1, maxLength: 50 }),
          lastName: fc.string({ minLength: 1, maxLength: 50 }),
          dateOfBirth: fc.date({ max: new Date() }),
          phone: fc.string({ minLength: 10, maxLength: 15 }),
          email: fc.option(fc.emailAddress()),
        }),
        (patientData) => {
          // Create patient
          const created = patientService.createPatient(patientData);
          
          // Retrieve patient
          const retrieved = patientService.getPatient(created.id);
          
          // Verify equivalence
          expect(retrieved).toBeDefined();
          expect(retrieved.firstName).toBe(patientData.firstName);
          expect(retrieved.lastName).toBe(patientData.lastName);
          expect(retrieved.phone).toBe(patientData.phone);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing

**Library Selection**: Use **Jest** for unit testing with TypeScript support

**Unit Test Focus Areas**:
- Specific examples demonstrating correct behavior
- Edge cases (empty strings, boundary values, null/undefined)
- Error conditions (invalid input, missing data)
- Integration points between components
- UI component rendering and interaction

**Example Unit Test**:
```typescript
describe('AppointmentService', () => {
  it('should reject appointment creation with missing required fields', () => {
    const invalidAppointment = {
      patientId: 'patient-123',
      // Missing dentistId, startTime, duration, appointmentType
    };
    
    expect(() => {
      appointmentService.createAppointment(invalidAppointment);
    }).toThrow('Missing required fields');
  });
  
  it('should detect appointment conflicts', () => {
    // Create first appointment
    const appointment1 = appointmentService.createAppointment({
      patientId: 'patient-123',
      dentistId: 'dentist-456',
      startTime: new Date('2024-01-15T10:00:00'),
      duration: 60,
      appointmentType: 'Checkup',
    });
    
    // Attempt conflicting appointment
    expect(() => {
      appointmentService.createAppointment({
        patientId: 'patient-789',
        dentistId: 'dentist-456', // Same dentist
        startTime: new Date('2024-01-15T10:30:00'), // Overlaps
        duration: 60,
        appointmentType: 'Cleaning',
      });
    }).toThrow('Appointment conflict detected');
  });
});
```

### Integration Testing

**Focus Areas**:
- IPC communication between main and renderer processes
- Database operations with real SQLite database
- Multi-step workflows (create patient → create appointment → create treatment plan → create invoice)
- Concurrent access scenarios
- Backup and restore operations

**Example Integration Test**:
```typescript
describe('Patient-Appointment Workflow', () => {
  it('should create patient and schedule appointment', async () => {
    // Create patient
    const patient = await window.api.invoke('patients:create', {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      phone: '555-0123',
    });
    
    expect(patient.id).toBeDefined();
    
    // Schedule appointment for patient
    const appointment = await window.api.invoke('appointments:create', {
      patientId: patient.id,
      dentistId: 'dentist-123',
      startTime: new Date('2024-01-15T10:00:00'),
      duration: 60,
      appointmentType: 'Checkup',
    });
    
    expect(appointment.id).toBeDefined();
    expect(appointment.patientId).toBe(patient.id);
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 83 correctness properties implemented
- **Integration Test Coverage**: All major workflows covered
- **UI Component Coverage**: All React components with rendering and interaction tests

### Testing Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use beforeEach/afterEach to reset database state
3. **Mocking**: Mock external dependencies (file system, time) for deterministic tests
4. **Assertions**: Use specific assertions (toBe, toEqual, toThrow) rather than generic truthy checks
5. **Descriptive Names**: Test names should clearly describe what is being tested
6. **Fast Execution**: Unit tests should run in milliseconds, property tests in seconds
7. **CI Integration**: All tests should run automatically on every commit

### Test Data Generation

**For Property Tests**:
- Use fast-check arbitraries to generate random valid data
- Define custom arbitraries for domain objects (Patient, Appointment, etc.)
- Use constraints to ensure generated data is realistic (e.g., dates in valid ranges)

**For Unit Tests**:
- Use factory functions to create test data
- Define fixtures for common test scenarios
- Use meaningful test data that represents real-world cases

**Example Factory**:
```typescript
function createTestPatient(overrides?: Partial<PatientInput>): PatientInput {
  return {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1980-01-01'),
    phone: '555-0123',
    email: 'john.doe@example.com',
    ...overrides,
  };
}
```

### Performance Testing

While not part of unit/property testing, performance requirements should be validated:

- Patient search: < 500ms for 50,000 records
- Report generation: < 2 seconds for 10,000 records
- UI responsiveness: < 100ms for all interactions
- Database queries: < 100ms for indexed queries

Performance tests should run separately and use realistic data volumes.

