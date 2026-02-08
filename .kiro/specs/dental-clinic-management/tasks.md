# Implementation Plan: Dental Clinic Management System

## Overview

This implementation plan breaks down the Dental Clinic Management System into discrete, incremental coding tasks. The system is built using Electron, React, TypeScript, Node.js, Express, and SQLite (better-sqlite3). Each task builds on previous work, with checkpoints to ensure quality and correctness. Property-based tests validate universal correctness properties, while unit tests cover specific examples and edge cases.

## Tasks

- [x] 1. Project setup and infrastructure
  - Initialize Electron + React + TypeScript project with proper build configuration
  - Set up SQLite database with better-sqlite3
  - Configure IPC communication between main and renderer processes
  - Set up Jest and fast-check for testing
  - Create project directory structure (main/, renderer/, shared/, database/)
  - _Requirements: 8.1, 9.1, 9.5, 10.2_

- [x] 2. Database schema and migrations
  - [x] 2.1 Create database schema SQL files for all tables
    - Implement tables: users, patients, appointments, treatment_plans, treatments, treatment_templates, invoices, invoice_items, payments, inventory_items, inventory_transactions, clinical_notes, attachments, sessions
    - Add all indexes for performance optimization
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 13.1_
  
  - [x] 2.2 Implement DatabaseManager class
    - Create connection management with WAL mode enabled
    - Implement transaction support with rollback
    - Add query execution methods
    - Implement backup functionality
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.6_
  
  - [x] 2.3 Write property test for transaction atomicity
    - **Property 48: Transaction atomicity**
    - **Validates: Requirements 8.2**
  
  - [x] 2.4 Write property test for transaction rollback
    - **Property 49: Transaction rollback on failure**
    - **Validates: Requirements 8.3**
  
  - [x] 2.5 Implement database migration system
    - Create migration runner that applies schema updates
    - Track schema version in database
    - _Requirements: 11.2_
  
  - [x] 2.6 Write property test for schema migration
    - **Property 57: Database schema migration**
    - **Validates: Requirements 11.2**


- [x] 3. Authentication and authorization system
  - [x] 3.1 Implement AuthService with bcrypt password hashing
    - Create user authentication with password verification
    - Implement session management
    - Add password hashing with cost factor 10
    - _Requirements: 1.1, 1.2, 1.3, 1.9_
  
  - [x] 3.2 Write property test for valid credential authentication
    - **Property 1: Valid credential authentication**
    - **Validates: Requirements 1.2**
  
  - [x] 3.3 Write property test for invalid credential rejection
    - **Property 2: Invalid credential rejection**
    - **Validates: Requirements 1.3**
  
  - [x] 3.4 Write property test for password hashing
    - **Property 5: Password hashing**
    - **Validates: Requirements 1.9**
  
  - [x] 3.5 Implement role-based access control middleware
    - Create permission checking for Administrator, Dentist, Receptionist roles
    - Add authorization checks to IPC handlers
    - _Requirements: 1.4, 1.5, 1.6, 1.7_
  
  - [x] 3.6 Write property test for role-based access control
    - **Property 3: Role-based access control**
    - **Validates: Requirements 1.5, 1.6, 1.7**
  
  - [x] 3.7 Implement session timeout mechanism
    - Add automatic logout after 30 minutes of inactivity
    - Track last activity timestamp
    - _Requirements: 1.8_
  
  - [x] 3.8 Write property test for session timeout
    - **Property 4: Session timeout**
    - **Validates: Requirements 1.8**

- [x] 4. Patient management service
  - [x] 4.1 Implement PatientService with CRUD operations
    - Create patient creation with validation
    - Implement patient retrieval, update, and deletion
    - Add unique patient ID generation
    - _Requirements: 2.1, 2.2, 2.4, 2.6_
  
  - [x] 4.2 Write property test for patient creation validation
    - **Property 6: Patient creation validation**
    - **Validates: Requirements 2.1**
  
  - [x] 4.3 Write property test for patient persistence round-trip
    - **Property 7: Patient persistence round-trip**
    - **Validates: Requirements 2.2**
  
  - [x] 4.4 Write property test for patient ID uniqueness
    - **Property 9: Patient ID uniqueness**
    - **Validates: Requirements 2.4**
  
  - [x] 4.5 Implement patient search functionality
    - Add search by name, phone, email, patient ID with partial matching
    - Optimize with database indexes
    - _Requirements: 2.3_
  
  - [x] 4.6 Write property test for patient search correctness
    - **Property 8: Patient search correctness**
    - **Validates: Requirements 2.3**
  
  - [x] 4.7 Implement patient deletion with referential integrity checks
    - Prevent deletion if patient has appointments or treatments
    - _Requirements: 2.7_
  
  - [x] 4.8 Write property test for patient deletion referential integrity
    - **Property 12: Patient deletion referential integrity**
    - **Validates: Requirements 2.7**

- [x] 5. Appointment scheduling service
  - [x] 5.1 Implement AppointmentService with CRUD operations
    - Create appointment creation with validation
    - Implement appointment retrieval, update, cancellation
    - _Requirements: 3.1, 3.3, 3.7_
  
  - [x] 5.2 Write property test for appointment creation validation
    - **Property 14: Appointment creation validation**
    - **Validates: Requirements 3.1**
  
  - [x] 5.3 Write property test for appointment persistence round-trip
    - **Property 16: Appointment persistence round-trip**
    - **Validates: Requirements 3.3**
  
  - [x] 5.4 Implement appointment conflict detection
    - Check for overlapping appointments for same dentist
    - Validate on creation and rescheduling
    - _Requirements: 3.2, 3.6, 3.9_
  
  - [x] 5.5 Write property test for appointment conflict detection
    - **Property 15: Appointment conflict detection**
    - **Validates: Requirements 3.2, 3.6, 3.9**
  
  - [x] 5.6 Implement appointment reminder generation
    - Generate reminders 24 hours before scheduled time
    - Send to renderer process for display
    - _Requirements: 3.8_
  
  - [x] 5.7 Write property test for appointment reminder generation
    - **Property 19: Appointment reminder generation**
    - **Validates: Requirements 3.8**
  
  - [x] 5.8 Write property test for appointment cancellation preservation
    - **Property 18: Appointment cancellation preservation**
    - **Validates: Requirements 3.7**

- [x] 6. Checkpoint - Core services validation
  - Ensure all tests pass for authentication, patient, and appointment services
  - Verify database operations work correctly with transactions
  - Ask the user if questions arise


- [x] 7. Treatment planning service
  - [x] 7.1 Implement TreatmentService with treatment plan management
    - Create treatment plan creation and retrieval
    - Add treatment status management (Planned, In Progress, Completed, Cancelled)
    - Implement treatment completion with metadata
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 7.2 Write property test for treatment plan patient association
    - **Property 20: Treatment plan patient association**
    - **Validates: Requirements 4.1**
  
  - [x] 7.3 Write property test for treatment required fields
    - **Property 21: Treatment required fields**
    - **Validates: Requirements 4.2**
  
  - [x] 7.4 Write property test for treatment completion metadata
    - **Property 22: Treatment completion metadata**
    - **Validates: Requirements 4.4**
  
  - [x] 7.5 Implement treatment plan cost calculation
    - Calculate total estimated cost as sum of treatment costs
    - Update automatically when treatments are added/removed
    - _Requirements: 4.6_
  
  - [x] 7.6 Write property test for treatment plan cost calculation
    - **Property 24: Treatment plan cost calculation**
    - **Validates: Requirements 4.6**
  
  - [x] 7.7 Implement treatment modification history tracking
    - Record all changes with timestamps and user IDs
    - _Requirements: 4.8_
  
  - [x] 7.8 Write property test for treatment modification history
    - **Property 26: Treatment modification history**
    - **Validates: Requirements 4.8**

- [x] 8. Treatment template system
  - [x] 8.1 Implement treatment template CRUD operations
    - Create template library with codes, descriptions, costs, durations
    - Allow administrators to manage templates
    - _Requirements: 14.1, 14.3, 14.5_
  
  - [x] 8.2 Write property test for treatment template CRUD
    - **Property 76: Treatment template CRUD**
    - **Validates: Requirements 14.3**
  
  - [x] 8.3 Implement template selection and auto-population
    - Populate treatment details from selected template
    - Ensure template modifications don't affect existing plans
    - _Requirements: 14.2, 14.4, 14.6, 14.7_
  
  - [x] 8.4 Write property test for template modification isolation
    - **Property 77: Template modification isolation**
    - **Validates: Requirements 14.4**
  
  - [x] 8.5 Write property test for template auto-population
    - **Property 79: Template auto-population**
    - **Validates: Requirements 14.6**

- [x] 9. Inventory management service
  - [x] 9.1 Implement InventoryService with item management
    - Create inventory item CRUD operations
    - Add validation for required fields
    - _Requirements: 6.1_
  
  - [x] 9.2 Write property test for inventory item creation validation
    - **Property 35: Inventory item creation validation**
    - **Validates: Requirements 6.1**
  
  - [x] 9.3 Implement inventory transaction tracking
    - Record all quantity changes with transaction history
    - Track transaction type, quantity change, reason, and user
    - _Requirements: 6.2, 6.5_
  
  - [x] 9.4 Write property test for inventory transaction tracking
    - **Property 36: Inventory transaction tracking**
    - **Validates: Requirements 6.2, 6.5**
  
  - [x] 9.5 Implement low stock warning system
    - Identify items below minimum threshold
    - Display warnings in UI
    - _Requirements: 6.3_
  
  - [x] 9.6 Write property test for low stock warning
    - **Property 37: Low stock warning**
    - **Validates: Requirements 6.3**
  
  - [x] 9.7 Implement inventory deduction on treatment completion
    - Automatically deduct materials when treatment is completed
    - Integrate with TreatmentService
    - _Requirements: 4.7, 6.4_
  
  - [x] 9.8 Write property test for treatment completion inventory deduction
    - **Property 25: Treatment completion inventory deduction**
    - **Validates: Requirements 4.7, 6.4**
  
  - [x] 9.9 Implement stock adjustment with authorization
    - Require reason and user authorization for adjustments
    - _Requirements: 6.6_
  
  - [x] 9.10 Write property test for stock adjustment authorization
    - **Property 38: Stock adjustment authorization**
    - **Validates: Requirements 6.6**
  
  - [x] 9.11 Implement inventory value calculation
    - Calculate value as unit cost × current quantity
    - _Requirements: 6.7_
  
  - [x] 9.12 Write property test for inventory value calculation
    - **Property 39: Inventory value calculation**
    - **Validates: Requirements 6.7**


- [x] 10. Billing and invoicing service
  - [x] 10.1 Implement BillingService with invoice management
    - Create invoice generation with required fields
    - Assign unique invoice numbers automatically
    - _Requirements: 5.1, 5.2_
  
  - [x] 10.2 Write property test for invoice required fields
    - **Property 27: Invoice required fields**
    - **Validates: Requirements 5.1**
  
  - [x] 10.3 Write property test for invoice number uniqueness
    - **Property 28: Invoice number uniqueness**
    - **Validates: Requirements 5.2**
  
  - [x] 10.4 Implement invoice calculation logic
    - Calculate subtotal, tax amount, discount, total, and balance
    - Ensure mathematical correctness
    - _Requirements: 5.3_
  
  - [x] 10.5 Write property test for invoice calculation correctness
    - **Property 29: Invoice calculation correctness**
    - **Validates: Requirements 5.3**
  
  - [x] 10.6 Implement payment recording and balance updates
    - Record payments with method and reference
    - Update invoice balance and status
    - _Requirements: 5.4, 5.5, 5.6_
  
  - [x] 10.7 Write property test for payment balance update
    - **Property 30: Payment balance update**
    - **Validates: Requirements 5.4**
  
  - [x] 10.8 Write property test for invoice paid status
    - **Property 31: Invoice paid status**
    - **Validates: Requirements 5.6**
  
  - [x] 10.9 Implement discount application with authorization
    - Check user role and discount percentage
    - Require authorization for large discounts
    - _Requirements: 5.7_
  
  - [x] 10.10 Write property test for discount authorization
    - **Property 32: Discount authorization**
    - **Validates: Requirements 5.7**
  
  - [x] 10.11 Implement PDF invoice generation using PDFKit
    - Generate printable invoices with all details
    - _Requirements: 5.8_
  
  - [x] 10.12 Write property test for invoice PDF generation
    - **Property 33: Invoice PDF generation**
    - **Validates: Requirements 5.8**

- [x] 11. Medical history and documentation
  - [x] 11.1 Implement clinical notes management
    - Create clinical note CRUD operations
    - Add timestamp and user association
    - Track modification history
    - _Requirements: 13.2, 13.5_
  
  - [x] 11.2 Write property test for clinical note metadata
    - **Property 70: Clinical note metadata**
    - **Validates: Requirements 13.2**
  
  - [x] 11.3 Write property test for clinical note history
    - **Property 72: Clinical note history**
    - **Validates: Requirements 13.5**
  
  - [x] 11.4 Implement attachment storage and retrieval
    - Store documents/images as BLOBs in database
    - Support JPEG, PNG, PDF formats
    - Add metadata (filename, type, size)
    - _Requirements: 13.6, 13.7, 13.8_
  
  - [x] 11.5 Write property test for attachment storage
    - **Property 73: Attachment storage**
    - **Validates: Requirements 13.6**
  
  - [x] 11.6 Write property test for attachment format support
    - **Property 74: Attachment format support**
    - **Validates: Requirements 13.7**

- [x] 12. Checkpoint - Business logic validation
  - Ensure all tests pass for treatment, inventory, billing, and documentation services
  - Verify integration between services (e.g., treatment completion → inventory deduction)
  - Ask the user if questions arise


- [x] 13. Search and filtering functionality
  - [x] 13.1 Implement patient search with partial matching
    - Search by name, phone, email, patient ID
    - Support case-insensitive partial matching
    - _Requirements: 12.1_
  
  - [x] 13.2 Write property test for patient search partial matching
    - **Property 63: Patient search partial matching**
    - **Validates: Requirements 12.1**
  
  - [x] 13.3 Implement appointment search with filtering
    - Filter by date range, dentist, status, patient
    - _Requirements: 12.2_
  
  - [x] 13.4 Write property test for appointment search filtering
    - **Property 64: Appointment search filtering**
    - **Validates: Requirements 12.2**
  
  - [x] 13.5 Implement treatment search with filtering
    - Filter by treatment type, status, date range
    - _Requirements: 12.3_
  
  - [x] 13.6 Write property test for treatment search filtering
    - **Property 65: Treatment search filtering**
    - **Validates: Requirements 12.3**
  
  - [x] 13.7 Implement invoice search with filtering
    - Filter by patient, date range, payment status
    - _Requirements: 5.9_
  
  - [x] 13.8 Write property test for invoice search filtering
    - **Property 34: Invoice search filtering**
    - **Validates: Requirements 5.9**
  
  - [x] 13.9 Implement inventory search with filtering
    - Filter by category, stock level, item name
    - _Requirements: 6.8_
  
  - [x] 13.10 Write property test for inventory search filtering
    - **Property 40: Inventory search filtering**
    - **Validates: Requirements 6.8**
  
  - [x] 13.11 Implement auto-complete suggestions
    - Provide suggestions after 3 characters
    - _Requirements: 12.5_
  
  - [x] 13.12 Write property test for search auto-complete
    - **Property 66: Search auto-complete**
    - **Validates: Requirements 12.5**

- [~] 14. Reports and analytics service
  - [x] 14.1 Implement daily appointment report generation
    - Group appointments by status
    - _Requirements: 7.1_
  
  - [x] 14.2 Write property test for daily appointment report completeness
    - **Property 41: Daily appointment report completeness**
    - **Validates: Requirements 7.1**
  
  - [x] 14.3 Implement revenue report generation
    - Calculate revenue by date range, dentist, treatment type
    - _Requirements: 7.2_
  
  - [x] 14.4 Write property test for revenue report calculation
    - **Property 42: Revenue report calculation**
    - **Validates: Requirements 7.2**
  
  - [x] 14.5 Implement patient visit history report
    - Show all appointments for a patient chronologically
    - _Requirements: 7.3_
  
  - [x] 14.6 Write property test for patient visit history completeness
    - **Property 43: Patient visit history completeness**
    - **Validates: Requirements 7.3**
  
  - [x] 14.7 Implement inventory report generation
    - Show current stock levels and usage trends
    - _Requirements: 7.4_
  
  - [x] 14.8 Write property test for inventory report accuracy
    - **Property 44: Inventory report accuracy**
    - **Validates: Requirements 7.4**
  
  - [x] 14.9 Implement report export to PDF and CSV
    - Use PDFKit for PDF generation
    - Generate CSV with proper formatting
    - _Requirements: 7.6_
  
  - [x] 14.10 Write property test for report export format validity
    - **Property 45: Report export format validity**
    - **Validates: Requirements 7.6**
  
  - [x] 14.11 Implement dashboard analytics
    - Calculate daily revenue, appointment count, pending treatments
    - _Requirements: 7.7_
  
  - [x] 14.12 Write property test for dashboard analytics accuracy
    - **Property 46: Dashboard analytics accuracy**
    - **Validates: Requirements 7.7**
  
  - [x] 14.13 Implement KPI calculations
    - Calculate average treatment value, patient retention rate, appointment utilization
    - _Requirements: 7.8_
  
  - [x] 14.14 Write property test for KPI calculation correctness
    - **Property 47: KPI calculation correctness**
    - **Validates: Requirements 7.8**


- [~] 15. IPC handlers and main process setup
  - [x] 15.1 Create IPC handlers for all services
    - Implement handlers for patients, appointments, treatments, billing, inventory, reports
    - Add error handling and response formatting
    - Ensure all database operations run in main process
    - _Requirements: 9.1, 9.5_
  
  - [x] 15.2 Implement application lifecycle management
    - Initialize database on startup
    - Close connections on shutdown
    - Handle unsaved changes confirmation
    - _Requirements: 11.1, 11.4, 11.5_
  
  - [x] 15.3 Write property test for database initialization failure handling
    - **Property 58: Database initialization failure handling**
    - **Validates: Requirements 11.3**
  
  - [x] 15.4 Write property test for database connection cleanup
    - **Property 59: Database connection cleanup**
    - **Validates: Requirements 11.4**
  
  - [x] 15.5 Write property test for unsaved changes confirmation
    - **Property 60: Unsaved changes confirmation**
    - **Validates: Requirements 11.5**
  
  - [x] 15.6 Implement error logging system
    - Log all errors to file with timestamp and stack trace
    - _Requirements: 11.6, 11.7_
  
  - [x] 15.7 Write property test for error logging
    - **Property 61: Error logging**
    - **Validates: Requirements 11.6, 11.7**
  
  - [x] 15.8 Implement crash recovery mechanism
    - Ensure database integrity after crashes
    - _Requirements: 11.8_
  
  - [x] 15.9 Write property test for crash data preservation
    - **Property 62: Crash data preservation**
    - **Validates: Requirements 11.8**

- [~] 16. Backup and restore functionality
  - [x] 16.1 Implement automatic daily backup
    - Schedule backups at user-configured time
    - Store backups with timestamps
    - _Requirements: 8.4, 8.5_
  
  - [x] 16.2 Write property test for backup file creation
    - **Property 50: Backup file creation**
    - **Validates: Requirements 8.5, 8.7**
  
  - [x] 16.3 Implement backup retention policy
    - Keep only last 30 daily backups
    - Automatically delete older backups
    - _Requirements: 8.6_
  
  - [x] 16.4 Write property test for backup retention policy
    - **Property 51: Backup retention policy**
    - **Validates: Requirements 8.6**
  
  - [x] 16.5 Implement database integrity validation
    - Check database integrity on startup
    - Detect corruption and prevent launch if corrupted
    - _Requirements: 8.8, 8.9_
  
  - [x] 16.6 Write property test for database corruption detection
    - **Property 52: Database corruption detection**
    - **Validates: Requirements 8.9**

- [~] 17. Concurrency and multi-user support
  - [x] 17.1 Implement optimistic locking for concurrent modifications
    - Add version field to records
    - Detect conflicts when same record is modified concurrently
    - _Requirements: 15.3, 15.4_
  
  - [x] 17.2 Write property test for non-conflicting concurrent modifications
    - **Property 80: Non-conflicting concurrent modifications**
    - **Validates: Requirements 15.2**
  
  - [x] 17.3 Write property test for optimistic locking conflict detection
    - **Property 81: Optimistic locking conflict detection**
    - **Validates: Requirements 15.3**
  
  - [x] 17.4 Write property test for conflict notification
    - **Property 82: Conflict notification**
    - **Validates: Requirements 15.4**
  
  - [x] 17.5 Implement session data refresh mechanism
    - Notify other sessions of data changes within 5 seconds
    - _Requirements: 15.6_
  
  - [x] 17.6 Write property test for session data refresh
    - **Property 83: Session data refresh**
    - **Validates: Requirements 15.6**

- [x] 18. Checkpoint - Backend services complete
  - Ensure all backend services and IPC handlers are working
  - Verify all property tests pass
  - Test backup, restore, and concurrency features
  - Ask the user if questions arise


- [x] 19. React UI foundation and layout
  - [x] 19.1 Create AppShell layout component
    - Implement main application layout with sidebar and header
    - Add navigation menu with role-based visibility
    - _Requirements: 1.5, 1.6, 1.7_
  
  - [x] 19.2 Create login screen component
    - Implement username/password form
    - Add authentication error display
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 19.3 Implement IPC client wrapper
    - Create window.api interface for renderer process
    - Add error handling for IPC calls
    - _Requirements: 9.1, 9.5_
  
  - [x] 19.4 Create loading and progress indicator components
    - Display progress for long-running operations
    - _Requirements: 9.2_
  
  - [x] 19.5 Write property test for long operation progress indicator
    - **Property 53: Long operation progress indicator**
    - **Validates: Requirements 9.2**
  
  - [x] 19.6 Implement pagination component
    - Apply pagination for lists over 100 records
    - _Requirements: 9.7_
  
  - [x] 19.7 Write property test for pagination for large lists
    - **Property 55: Pagination for large lists**
    - **Validates: Requirements 9.7**

- [x] 20. Patient management UI
  - [x] 20.1 Create PatientList component
    - Display searchable, paginated patient list
    - Add search by name, phone, email, patient ID
    - _Requirements: 2.3, 12.1_
  
  - [x] 20.2 Create PatientForm component
    - Implement patient registration and editing form
    - Add validation for required fields
    - _Requirements: 2.1, 2.6_
  
  - [x] 20.3 Create PatientDetail component
    - Display complete patient information
    - Show medical history, allergies, emergency contacts
    - Display allergy warning indicator
    - _Requirements: 2.5, 2.8, 13.1_
  
  - [x] 20.4 Write property test for patient record completeness
    - **Property 10: Patient record completeness**
    - **Validates: Requirements 2.5**
  
  - [x] 20.5 Write property test for allergy warning display
    - **Property 13: Allergy warning display**
    - **Validates: Requirements 2.8**
  
  - [x] 20.6 Create MedicalHistoryPanel component
    - Display medical conditions, medications, allergies
    - Show critical condition alerts
    - _Requirements: 13.1, 13.4_
  
  - [x] 20.7 Write property test for medical history completeness
    - **Property 69: Medical history completeness**
    - **Validates: Requirements 13.1**
  
  - [x] 20.8 Write property test for critical condition alert
    - **Property 71: Critical condition alert**
    - **Validates: Requirements 13.4**
  
  - [x] 20.9 Create ClinicalNotesPanel component
    - Display and create clinical notes with rich text
    - Show note history with timestamps
    - _Requirements: 13.2, 13.3, 13.5_
  
  - [x] 20.10 Create AttachmentViewer component
    - Display attachments inline (JPEG, PNG, PDF)
    - Support file upload
    - _Requirements: 13.6, 13.7, 13.8_
  
  - [x] 20.11 Write property test for attachment inline viewing
    - **Property 75: Attachment inline viewing**
    - **Validates: Requirements 13.8**

- [x] 21. Appointment scheduling UI
  - [x] 21.1 Create AppointmentCalendar component
    - Implement calendar view with daily, weekly, monthly options
    - Color-code appointments by status
    - _Requirements: 3.4, 3.5_
  
  - [x] 21.2 Write property test for appointment status color-coding
    - **Property 17: Appointment status color-coding**
    - **Validates: Requirements 3.5**
  
  - [x] 21.3 Create AppointmentForm component
    - Implement appointment creation and editing
    - Add conflict detection with error display
    - _Requirements: 3.1, 3.2, 3.9_
  
  - [x] 21.4 Create AppointmentList component
    - Display filterable appointment list
    - Support filtering by date range, dentist, status, patient
    - _Requirements: 12.2_
  
  - [x] 21.5 Create AppointmentReminderNotification component
    - Display reminders 24 hours before appointments
    - _Requirements: 3.8_


- [x] 22. Treatment planning UI
  - [x] 22.1 Create TreatmentPlanForm component
    - Implement treatment plan creation
    - Add treatment selection from template library
    - Display total estimated cost
    - _Requirements: 4.1, 4.2, 4.6, 14.2_
  
  - [x] 22.2 Create TreatmentTemplateSelector component
    - Browse and select treatment templates
    - Display template details (code, description, cost, duration)
    - _Requirements: 14.2, 14.5, 14.6_
  
  - [x] 22.3 Create TreatmentList component
    - Display patient treatment history
    - Show treatment status and completion details
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [x] 22.4 Write property test for patient treatment plan completeness
    - **Property 23: Patient treatment plan completeness**
    - **Validates: Requirements 4.5**
  
  - [x] 22.5 Create TreatmentStatusUpdater component
    - Update treatment status (Planned → In Progress → Completed)
    - Record completion metadata
    - _Requirements: 4.4_

- [x] 23. Billing and invoicing UI
  - [x] 23.1 Create InvoiceForm component
    - Implement invoice creation from treatments
    - Calculate totals automatically
    - _Requirements: 5.1, 5.3_
  
  - [x] 23.2 Create InvoiceList component
    - Display searchable invoice list
    - Filter by patient, date range, payment status
    - _Requirements: 5.9_
  
  - [x] 23.3 Create PaymentForm component
    - Record payments with method selection
    - Update invoice balance and status
    - _Requirements: 5.4, 5.5, 5.6_
  
  - [x] 23.4 Create DiscountForm component
    - Apply discounts with authorization check
    - Display authorization requirements
    - _Requirements: 5.7_
  
  - [x] 23.5 Create InvoicePreview component
    - Display printable invoice view
    - Add PDF export button
    - _Requirements: 5.8_

- [x] 24. Inventory management UI
  - [x] 24.1 Create InventoryList component
    - Display searchable inventory with filters
    - Show low stock warnings prominently
    - _Requirements: 6.3, 6.8_
  
  - [x] 24.2 Create InventoryForm component
    - Implement item creation and editing
    - Add validation for required fields
    - _Requirements: 6.1_
  
  - [x] 24.3 Create StockAdjustmentForm component
    - Record quantity adjustments with reason
    - Require authorization
    - _Requirements: 6.6_
  
  - [x] 24.4 Create InventoryTransactionHistory component
    - Display transaction log for each item
    - Show transaction type, quantity change, reason, user
    - _Requirements: 6.2, 6.5_

- [x] 25. Reports and analytics UI
  - [x] 25.1 Create ReportDashboard component
    - Display KPI overview (daily revenue, appointment count, pending treatments)
    - Show key performance indicators
    - _Requirements: 7.7, 7.8_
  
  - [x] 25.2 Create ReportGenerator component
    - Select report type and parameters
    - Generate appointment, revenue, visit history, inventory reports
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 25.3 Create ReportViewer component
    - Display generated reports
    - Add export to PDF and CSV buttons
    - _Requirements: 7.6_

- [ ] 26. Checkpoint - UI components complete
  - Ensure all UI components render correctly
  - Test user interactions and form validations
  - Verify IPC communication between renderer and main process
  - Ask the user if questions arise


- [ ] 27. Search and filtering UI integration
  - [ ] 27.1 Integrate search functionality into all list components
    - Add search bars with auto-complete
    - Implement result highlighting
    - Display empty result messages
    - _Requirements: 12.5, 12.6, 12.7_
  
  - [ ] 27.2 Write property test for search result highlighting
    - **Property 67: Search result highlighting**
    - **Validates: Requirements 12.6**
  
  - [ ] 27.3 Write property test for empty search result message
    - **Property 68: Empty search result message**
    - **Validates: Requirements 12.7**
  
  - [ ] 27.4 Add filter panels to list components
    - Implement filter UI for appointments, treatments, invoices, inventory
    - Apply filters and update results
    - _Requirements: 12.2, 12.3, 5.9, 6.8_

- [ ] 28. Offline operation verification
  - [ ] 28.1 Verify no network requests during normal operation
    - Test all features without internet connection
    - Monitor network activity
    - _Requirements: 10.1, 10.3, 10.4, 10.6_
  
  - [ ] 28.2 Write property test for no network requests
    - **Property 56: No network requests**
    - **Validates: Requirements 10.1, 10.3**
  
  - [ ] 28.3 Verify all resources are bundled
    - Check that images, fonts, libraries are included
    - Test application works without internet
    - _Requirements: 10.5_

- [ ] 29. User management and administration
  - [ ] 29.1 Create UserManagement component (Administrator only)
    - Display user list
    - Add user creation and editing forms
    - Implement password change functionality
    - _Requirements: 1.4, 1.5_
  
  - [ ] 29.2 Create SettingsPanel component
    - Configure backup schedule and location
    - Set application preferences
    - _Requirements: 8.4_
  
  - [ ] 29.3 Create BackupRestorePanel component
    - Trigger manual backups
    - View backup history
    - Restore from backup
    - _Requirements: 8.4, 8.5, 8.6, 8.7_

- [ ] 30. Integration testing and end-to-end workflows
  - [ ] 30.1 Write integration test for patient-appointment workflow
    - Create patient → schedule appointment → verify linkage
    - _Requirements: 2.1, 3.1_
  
  - [ ] 30.2 Write integration test for treatment-billing workflow
    - Create treatment plan → complete treatment → generate invoice → record payment
    - _Requirements: 4.1, 4.4, 5.1, 5.4_
  
  - [ ] 30.3 Write integration test for treatment-inventory workflow
    - Complete treatment with materials → verify inventory deduction
    - _Requirements: 4.7, 6.4_
  
  - [ ] 30.4 Write integration test for concurrent user access
    - Simulate multiple users modifying different records
    - Test optimistic locking for same record modifications
    - _Requirements: 15.2, 15.3, 15.4_
  
  - [ ] 30.5 Write integration test for backup and restore
    - Create backup → modify data → restore backup → verify data restored
    - _Requirements: 8.4, 8.5_

- [ ] 31. Performance optimization and testing
  - [ ] 31.1 Optimize database queries with proper indexes
    - Verify all frequently-used queries use indexes
    - Test query performance with large datasets
    - _Requirements: 2.3, 12.4_
  
  - [ ] 31.2 Implement virtual scrolling for large lists
    - Add virtual scrolling to patient, appointment, invoice lists
    - _Requirements: 9.8_
  
  - [ ] 31.3 Test UI responsiveness
    - Verify UI responds within 100ms for all interactions
    - Ensure database operations don't block UI
    - _Requirements: 9.3, 9.4_

- [ ] 32. Error handling and user feedback
  - [ ] 32.1 Implement error notification system
    - Display user-friendly error messages
    - Add toast notifications for success/error
    - _Requirements: 11.6_
  
  - [ ] 32.2 Add form validation feedback
    - Display field-level validation errors
    - Highlight invalid fields
    - _Requirements: 2.1, 2.6, 3.1, 5.1, 6.1_
  
  - [ ] 32.3 Implement confirmation dialogs
    - Add confirmation for delete operations
    - Confirm unsaved changes on navigation
    - _Requirements: 11.5_

- [ ] 33. Final checkpoint - System integration and testing
  - Run all unit tests and property tests
  - Test all end-to-end workflows
  - Verify offline operation
  - Test backup and restore functionality
  - Verify multi-user concurrent access
  - Test with realistic data volumes (1000+ patients, 5000+ appointments)
  - Ask the user if questions arise

- [ ] 34. Documentation and deployment preparation
  - [ ] 34.1 Create user documentation
    - Write user guide for each role (Administrator, Dentist, Receptionist)
    - Document common workflows
  
  - [ ] 34.2 Create deployment package
    - Build Electron application for Windows, macOS, Linux
    - Include initial database schema
    - Add sample treatment templates
  
  - [ ] 34.3 Create administrator setup guide
    - Document initial setup steps
    - Explain backup configuration
    - Describe user management

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (83 total)
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end workflows
- All database operations run in main process to prevent UI blocking
- SQLite WAL mode enables concurrent read access
- Offline-first architecture ensures no internet dependency
