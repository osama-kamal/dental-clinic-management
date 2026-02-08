import fc from 'fast-check';
import { ReportService } from './ReportService';
import { DatabaseManager } from '../../database/DatabaseManager';
import { AppointmentService } from './AppointmentService';
import { PatientService } from './PatientService';
import { AuthService } from './AuthService';
import { BillingService } from './BillingService';
import { TreatmentService } from './TreatmentService';
import { InventoryService } from './InventoryService';
import { randomUUID } from 'crypto';

describe('ReportService Property Tests', () => {
  let db: DatabaseManager;
  let reportService: ReportService;
  let appointmentService: AppointmentService;
  let patientService: PatientService;
  let authService: AuthService;
  let billingService: BillingService;
  let treatmentService: TreatmentService;
  let inventoryService: InventoryService;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.initialize();
    reportService = new ReportService(db);
    appointmentService = new AppointmentService(db);
    patientService = new PatientService(db);
    authService = new AuthService(db);
    billingService = new BillingService(db);
    treatmentService = new TreatmentService(db);
    inventoryService = new InventoryService(db);
  });

  afterEach(() => {
    db.close();
  });

  // Helper function to create test user
  const createTestUser = (role: 'Administrator' | 'Dentist' | 'Receptionist' = 'Dentist') => {
    return authService.createUser({
      username: `user_${randomUUID()}`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role,
    });
  };

  // Helper function to create test patient
  const createTestPatient = () => {
    return patientService.createPatient({
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-01-01'),
      phone: '555-0100',
    });
  };

  /**
   * Property 41: Daily appointment report completeness
   * For any date, the daily appointment report should include all appointments on that date
   * grouped by status (Scheduled, Confirmed, Completed, Cancelled).
   * Validates: Requirements 7.1
   */
  describe('Property 41: Daily appointment report completeness', () => {
    it('should include all appointments for the date grouped by status', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              duration: fc.integer({ min: 15, max: 120 }),
              status: fc.constantFrom('Scheduled', 'Confirmed', 'Completed', 'Cancelled'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (appointments) => {
            const user = createTestUser();
            const patient = createTestPatient();
            const testDate = new Date('2024-06-15');

            // Create appointments for the test date
            const createdAppointments = appointments.map((appt) => {
              const startTime = new Date(testDate);
              startTime.setHours(appt.hour, appt.minute, 0, 0);

              const created = appointmentService.createAppointment(
                {
                  patientId: patient.id,
                  dentistId: user.id,
                  startTime,
                  duration: appt.duration,
                  appointmentType: 'Checkup',
                },
                user.id
              );

              // Update status if needed
              if (appt.status === 'Cancelled') {
                appointmentService.cancelAppointment(created.id, 'Test cancellation');
              } else if (appt.status !== 'Scheduled') {
                db.executeUpdate('UPDATE appointments SET status = ? WHERE id = ?', [
                  appt.status,
                  created.id,
                ]);
              }

              return { ...created, status: appt.status };
            });

            // Generate report
            const report = reportService.generateDailyAppointmentReport(testDate);

            // Verify all appointments are included
            expect(report.appointments.length).toBe(createdAppointments.length);
            expect(report.total).toBe(createdAppointments.length);

            // Verify counts by status
            const scheduledCount = createdAppointments.filter((a) => a.status === 'Scheduled')
              .length;
            const confirmedCount = createdAppointments.filter((a) => a.status === 'Confirmed')
              .length;
            const completedCount = createdAppointments.filter((a) => a.status === 'Completed')
              .length;
            const cancelledCount = createdAppointments.filter((a) => a.status === 'Cancelled')
              .length;

            expect(report.scheduled).toBe(scheduledCount);
            expect(report.confirmed).toBe(confirmedCount);
            expect(report.completed).toBe(completedCount);
            expect(report.cancelled).toBe(cancelledCount);

            // Verify date matches
            expect(report.date.toDateString()).toBe(testDate.toDateString());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 42: Revenue report calculation
   * For any date range and grouping (by dentist or treatment type), the revenue report
   * should correctly sum all invoice amounts for completed treatments in that range.
   * Validates: Requirements 7.2
   */
  describe('Property 42: Revenue report calculation', () => {
    it('should correctly sum revenue for the date range', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              amount: fc.float({ min: 10, max: 1000, noNaN: true }),
              daysOffset: fc.integer({ min: 0, max: 30 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (payments) => {
            const user = createTestUser();
            const patient = createTestPatient();

            const startDate = new Date('2024-06-01');
            const endDate = new Date('2024-06-30');

            let expectedTotal = 0;

            // Create invoices and payments
            payments.forEach((payment) => {
              const paymentDate = new Date(startDate);
              paymentDate.setDate(paymentDate.getDate() + payment.daysOffset);

              // Create treatment plan and treatment
              const treatmentPlan = treatmentService.createTreatmentPlan(
                patient.id,
                [
                  {
                    code: 'T001',
                    description: 'Test Treatment',
                    estimatedCost: payment.amount,
                  },
                ],
                user.id
              );

              // Complete the treatment
              treatmentService.updateTreatmentStatus(
                treatmentPlan.treatments[0].id,
                'Completed',
                user.id
              );

              // Create invoice
              const invoice = billingService.createInvoice(
                {
                  patientId: patient.id,
                  treatmentIds: [treatmentPlan.treatments[0].id],
                  taxRate: 0,
                },
                user.id
              );

              // Record payment
              billingService.recordPayment(
                invoice.id,
                {
                  amount: payment.amount,
                  method: 'Cash',
                  date: paymentDate,
                },
                user.id
              );

              expectedTotal += payment.amount;
            });

            // Generate revenue report
            const report = reportService.generateRevenueReport(
              { start: startDate, end: endDate },
              'none'
            );

            // Verify total revenue matches expected
            expect(Math.abs(report.totalRevenue - expectedTotal)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 43: Patient visit history completeness
   * For any patient, the visit history report should include all appointments
   * for that patient in chronological order.
   * Validates: Requirements 7.3
   */
  describe('Property 43: Patient visit history completeness', () => {
    it('should include all appointments for the patient in chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              daysOffset: fc.integer({ min: -30, max: 30 }),
              appointmentType: fc.constantFrom('Checkup', 'Cleaning', 'Filling', 'Extraction'),
            }),
            { minLength: 1, maxLength: 15 }
          ),
          (appointments) => {
            const user = createTestUser();
            const patient = createTestPatient();
            const baseDate = new Date('2024-06-15');

            // Create appointments
            const createdAppointments = appointments.map((appt) => {
              const startTime = new Date(baseDate);
              startTime.setDate(startTime.getDate() + appt.daysOffset);
              startTime.setHours(10, 0, 0, 0);

              return appointmentService.createAppointment(
                {
                  patientId: patient.id,
                  dentistId: user.id,
                  startTime,
                  duration: 60,
                  appointmentType: appt.appointmentType,
                },
                user.id
              );
            });

            // Generate visit history
            const report = reportService.generatePatientVisitHistory(patient.id);

            // Verify all appointments are included
            expect(report.visits.length).toBe(createdAppointments.length);
            expect(report.totalVisits).toBe(createdAppointments.length);
            expect(report.patientId).toBe(patient.id);

            // Verify chronological order (descending - most recent first)
            for (let i = 0; i < report.visits.length - 1; i++) {
              expect(report.visits[i].date.getTime()).toBeGreaterThanOrEqual(
                report.visits[i + 1].date.getTime()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 44: Inventory report accuracy
   * For any point in time, the inventory report should accurately reflect
   * current stock levels and usage trends based on transaction history.
   * Validates: Requirements 7.4
   */
  describe('Property 44: Inventory report accuracy', () => {
    it('should accurately reflect current stock levels', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 3, maxLength: 20 }),
              category: fc.constantFrom('Dental Supplies', 'Medications', 'Equipment'),
              quantity: fc.integer({ min: 0, max: 1000 }),
              minThreshold: fc.integer({ min: 5, max: 50 }),
              unitCost: fc.float({ min: 1, max: 100, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (items) => {
            const user = createTestUser();

            // Create inventory items
            const createdItems = items.map((item) =>
              inventoryService.createItem(
                {
                  name: item.name,
                  category: item.category,
                  unitOfMeasure: 'units',
                  currentQuantity: item.quantity,
                  minimumThreshold: item.minThreshold,
                  unitCost: item.unitCost,
                },
                user.id
              )
            );

            // Generate inventory report
            const report = reportService.generateInventoryReport();

            // Verify all items are included
            expect(report.items.length).toBe(createdItems.length);

            // Verify each item's data
            createdItems.forEach((created) => {
              const reportItem = report.items.find((i) => i.id === created.id);
              expect(reportItem).toBeDefined();
              expect(reportItem!.currentQuantity).toBe(created.currentQuantity);
              expect(reportItem!.minimumThreshold).toBe(created.minimumThreshold);
              expect(reportItem!.unitCost).toBe(created.unitCost);

              // Verify low stock flag
              const expectedLowStock = created.currentQuantity < created.minimumThreshold;
              expect(reportItem!.isLowStock).toBe(expectedLowStock);

              // Verify value calculation
              const expectedValue = created.currentQuantity * created.unitCost;
              expect(Math.abs(reportItem!.totalValue - expectedValue)).toBeLessThan(0.01);
            });

            // Verify total value
            const expectedTotalValue = createdItems.reduce(
              (sum, item) => sum + item.currentQuantity * item.unitCost,
              0
            );
            expect(Math.abs(report.totalValue - expectedTotalValue)).toBeLessThan(0.01);

            // Verify low stock count
            const expectedLowStockCount = createdItems.filter(
              (item) => item.currentQuantity < item.minimumThreshold
            ).length;
            expect(report.lowStockCount).toBe(expectedLowStockCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 45: Report export format validity
   * For any report, exporting to PDF should produce a valid PDF buffer,
   * and exporting to CSV should produce valid CSV text with proper headers and delimiters.
   * Validates: Requirements 7.6
   */
  describe('Property 45: Report export format validity', () => {
    it('should produce valid PDF buffer', () => {
      fc.assert(
        fc.property(fc.date(), (date) => {
          const user = createTestUser();
          const patient = createTestPatient();

          // Create at least one appointment
          appointmentService.createAppointment(
            {
              patientId: patient.id,
              dentistId: user.id,
              startTime: date,
              duration: 60,
              appointmentType: 'Checkup',
            },
            user.id
          );

          const report = reportService.generateDailyAppointmentReport(date);
          const pdfBuffer = reportService.exportToPDF(report, 'Daily Appointment');

          // Verify it's a valid buffer
          expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
          expect(pdfBuffer.length).toBeGreaterThan(0);

          // Verify PDF signature (starts with %PDF)
          const pdfSignature = pdfBuffer.toString('utf8', 0, 4);
          expect(pdfSignature).toBe('%PDF');
        }),
        { numRuns: 100 }
      );
    });

    it('should produce valid CSV with headers', () => {
      fc.assert(
        fc.property(fc.date(), (date) => {
          const user = createTestUser();
          const patient = createTestPatient();

          // Create at least one appointment
          appointmentService.createAppointment(
            {
              patientId: patient.id,
              dentistId: user.id,
              startTime: date,
              duration: 60,
              appointmentType: 'Checkup',
            },
            user.id
          );

          const report = reportService.generateDailyAppointmentReport(date);
          const csv = reportService.exportToCSV(report, 'Daily Appointment');

          // Verify it's a string
          expect(typeof csv).toBe('string');
          expect(csv.length).toBeGreaterThan(0);

          // Verify CSV has headers
          const lines = csv.split('\n');
          expect(lines.length).toBeGreaterThan(1);
          expect(lines[0]).toContain('Date');
          expect(lines[0]).toContain('Patient');
          expect(lines[0]).toContain('Dentist');

          // Verify proper delimiter (comma)
          expect(lines[0].includes(',')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 46: Dashboard analytics accuracy
   * For any system state, the dashboard should display correct metrics:
   * daily revenue (sum of today's payments), appointment count (today's appointments),
   * and pending treatments (treatments with status 'Planned' or 'In Progress').
   * Validates: Requirements 7.7
   */
  describe('Property 46: Dashboard analytics accuracy', () => {
    it('should calculate correct daily metrics', () => {
      fc.assert(
        fc.property(
          fc.record({
            appointmentCount: fc.integer({ min: 0, max: 20 }),
            paymentAmount: fc.float({ min: 0, max: 5000, noNaN: true }),
            pendingTreatments: fc.integer({ min: 0, max: 10 }),
          }),
          (data) => {
            const user = createTestUser();
            const patient = createTestPatient();
            const today = new Date();
            today.setHours(12, 0, 0, 0);

            // Create appointments for today
            for (let i = 0; i < data.appointmentCount; i++) {
              const startTime = new Date(today);
              startTime.setHours(9 + i, 0, 0, 0);

              appointmentService.createAppointment(
                {
                  patientId: patient.id,
                  dentistId: user.id,
                  startTime,
                  duration: 30,
                  appointmentType: 'Checkup',
                },
                user.id
              );
            }

            // Create payment for today
            if (data.paymentAmount > 0) {
              const treatmentPlan = treatmentService.createTreatmentPlan(
                patient.id,
                [
                  {
                    code: 'T001',
                    description: 'Test Treatment',
                    estimatedCost: data.paymentAmount,
                  },
                ],
                user.id
              );

              treatmentService.updateTreatmentStatus(
                treatmentPlan.treatments[0].id,
                'Completed',
                user.id
              );

              const invoice = billingService.createInvoice(
                {
                  patientId: patient.id,
                  treatmentIds: [treatmentPlan.treatments[0].id],
                  taxRate: 0,
                },
                user.id
              );

              billingService.recordPayment(
                invoice.id,
                {
                  amount: data.paymentAmount,
                  method: 'Cash',
                  date: today,
                },
                user.id
              );
            }

            // Create pending treatments
            for (let i = 0; i < data.pendingTreatments; i++) {
              treatmentService.createTreatmentPlan(
                patient.id,
                [
                  {
                    code: `T${i}`,
                    description: `Pending Treatment ${i}`,
                    estimatedCost: 100,
                  },
                ],
                user.id
              );
            }

            // Get dashboard analytics
            const analytics = reportService.getDashboardAnalytics(today);

            // Verify metrics
            expect(analytics.appointmentCount).toBe(data.appointmentCount);
            expect(Math.abs(analytics.dailyRevenue - data.paymentAmount)).toBeLessThan(0.01);
            expect(analytics.pendingTreatments).toBe(data.pendingTreatments);
            expect(analytics.date.toDateString()).toBe(today.toDateString());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 47: KPI calculation correctness
   * For any dataset, KPIs should be mathematically correct:
   * - average treatment value = total revenue / treatment count
   * - patient retention rate = returning patients / total patients
   * - appointment utilization = completed appointments / scheduled appointments
   * Validates: Requirements 7.8
   */
  describe('Property 47: KPI calculation correctness', () => {
    it('should calculate correct KPIs', () => {
      fc.assert(
        fc.property(
          fc.record({
            treatmentCount: fc.integer({ min: 1, max: 10 }),
            treatmentValue: fc.float({ min: 50, max: 500, noNaN: true }),
            completedAppointments: fc.integer({ min: 1, max: 10 }),
            totalAppointments: fc.integer({ min: 1, max: 10 }),
          }),
          (data) => {
            const user = createTestUser();
            const patient1 = createTestPatient();
            const patient2 = createTestPatient();

            const startDate = new Date('2024-06-01');
            const endDate = new Date('2024-06-30');

            let totalRevenue = 0;

            // Create treatments and payments
            for (let i = 0; i < data.treatmentCount; i++) {
              const treatmentPlan = treatmentService.createTreatmentPlan(
                patient1.id,
                [
                  {
                    code: `T${i}`,
                    description: `Treatment ${i}`,
                    estimatedCost: data.treatmentValue,
                  },
                ],
                user.id
              );

              treatmentService.updateTreatmentStatus(
                treatmentPlan.treatments[0].id,
                'Completed',
                user.id
              );

              const invoice = billingService.createInvoice(
                {
                  patientId: patient1.id,
                  treatmentIds: [treatmentPlan.treatments[0].id],
                  taxRate: 0,
                },
                user.id
              );

              billingService.recordPayment(
                invoice.id,
                {
                  amount: data.treatmentValue,
                  method: 'Cash',
                  date: new Date('2024-06-15'),
                },
                user.id
              );

              totalRevenue += data.treatmentValue;
            }

            // Create appointments for utilization calculation
            const appointmentDate = new Date('2024-06-15T10:00:00');
            for (let i = 0; i < data.totalAppointments; i++) {
              const appt = appointmentService.createAppointment(
                {
                  patientId: i % 2 === 0 ? patient1.id : patient2.id,
                  dentistId: user.id,
                  startTime: new Date(appointmentDate.getTime() + i * 60 * 60 * 1000),
                  duration: 30,
                  appointmentType: 'Checkup',
                },
                user.id
              );

              // Mark some as completed
              if (i < data.completedAppointments) {
                db.executeUpdate('UPDATE appointments SET status = ? WHERE id = ?', [
                  'Completed',
                  appt.id,
                ]);
              }
            }

            // Calculate KPIs
            const kpis = reportService.calculateKPIs({ start: startDate, end: endDate });

            // Verify average treatment value
            const expectedAvgValue = totalRevenue / data.treatmentCount;
            expect(Math.abs(kpis.averageTreatmentValue - expectedAvgValue)).toBeLessThan(0.01);

            // Verify appointment utilization
            const expectedUtilization = (data.completedAppointments / data.totalAppointments) * 100;
            expect(Math.abs(kpis.appointmentUtilization - expectedUtilization)).toBeLessThan(0.01);

            // Verify patient retention rate (both patients have appointments, patient1 has multiple)
            const expectedRetention = 50; // 1 out of 2 patients has multiple appointments
            expect(Math.abs(kpis.patientRetentionRate - expectedRetention)).toBeLessThan(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
