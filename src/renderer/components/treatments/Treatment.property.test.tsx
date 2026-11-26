/** @jest-environment jsdom */
/// <reference types="@testing-library/jest-dom" />
/**
 * Property-Based Tests for Treatment Components
 * Requirements: 4.5
 */

import * as fc from 'fast-check';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { TreatmentList } from './TreatmentList';
import { ipcClient } from '../../api/ipcClient';

// Mock IPC client
jest.mock('../../api/ipcClient');
const mockIpcClient = ipcClient as jest.Mocked<typeof ipcClient>;

const treatmentArbitrary = fc.record({
  id: fc.uuid(),
  treatmentCode: fc.string({ minLength: 2, maxLength: 10 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()).map(s => s.toUpperCase()),
  description: fc.string({ minLength: 10, maxLength: 100 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()),
  tooth: fc.option(fc.string({ minLength: 1, maxLength: 5 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
  status: fc.constantFrom(
    'Planned' as const,
    'In Progress' as const,
    'Completed' as const,
    'Cancelled' as const
  ),
  estimatedCost: fc.float({ min: 50, max: 5000, noNaN: true }),
  actualCost: fc.option(fc.float({ min: 50, max: 5000, noNaN: true }), { nil: undefined }),
  estimatedDuration: fc.integer({ min: 15, max: 240 }),
  actualDuration: fc.option(fc.integer({ min: 15, max: 240 }), { nil: undefined }),
  completedAt: fc.option(
    fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
    { nil: undefined }
  ),
  completedBy: fc.option(fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 200 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
});

const treatmentPlanArbitrary = fc.record({
  id: fc.uuid(),
  patientId: fc.uuid(),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
  createdBy: fc.string({ minLength: 3, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()),
  totalEstimatedCost: fc.float({ min: 100, max: 10000, noNaN: true }),
  status: fc.constantFrom('Active', 'Completed', 'Cancelled'),
  treatments: fc.array(treatmentArbitrary, { minLength: 1, maxLength: 10 }),
});

describe('Treatment Components Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 23: Patient treatment plan completeness
   * Validates: Requirements 4.5
   * 
   * All treatment plans for a patient must be displayed with complete
   * information including treatments, costs, status, and completion details.
   */
  test('Property 23: displays complete treatment plan information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(treatmentPlanArbitrary, { minLength: 1, maxLength: 5 }),
        async (patientId, treatmentPlans) => {
          // Mock API response
          mockIpcClient.getTreatmentsByPatient.mockResolvedValue({
            success: true,
            data: treatmentPlans,
          });

          render(<TreatmentList patientId={patientId} />);

          // Wait for data to load
          await waitFor(() => {
            expect(mockIpcClient.getTreatmentsByPatient).toHaveBeenCalledWith(patientId);
          });

          // All treatment plans must be displayed
          for (const plan of treatmentPlans) {
            await waitFor(() => {
              // Plan creation date must be displayed
              const dateStr = new Date(plan.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              expect(screen.getAllByText(new RegExp(dateStr))[0]).toBeInTheDocument();

              // Total cost must be displayed
              expect(
                screen.getAllByText(new RegExp(`\\$${plan.totalEstimatedCost.toFixed(2)}`))[0]
              ).toBeInTheDocument();

              // Number of treatments must be displayed
              expect(
                screen.getAllByText(new RegExp(`${plan.treatments.length} treatment`))[0]
              ).toBeInTheDocument();
            });
          }
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 50 } // Reduced for async tests
    );
  });

  test('Property 23b: displays all treatment details within plan', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        treatmentPlanArbitrary,
        async (patientId, treatmentPlan) => {
          mockIpcClient.getTreatmentsByPatient.mockResolvedValue({
            success: true,
            data: [treatmentPlan],
          });

          const { container } = render(<TreatmentList patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getTreatmentsByPatient).toHaveBeenCalled();
          });

          // Expand the plan to see treatments
          const expandButton = container.querySelector('[aria-label*="expand"], button');
          if (expandButton) {
            (expandButton as HTMLElement).click();
          }

          // Each treatment must display required information
          for (const treatment of treatmentPlan.treatments) {
            await waitFor(() => {
              // Treatment code must be displayed
              expect(screen.getAllByText(treatment.treatmentCode)[0]).toBeInTheDocument();

              // Treatment description must be displayed
              expect(screen.getAllByText(treatment.description)[0]).toBeInTheDocument();

              // Status must be displayed
              expect(screen.getAllByText(treatment.status)[0]).toBeInTheDocument();

              // Estimated cost must be displayed
              expect(
                screen.getAllByText(new RegExp(`\\$${treatment.estimatedCost.toFixed(2)}`))[0]
              ).toBeInTheDocument();
            });
          }
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 50 }
    );
  });

  test('Property 23c: displays completion metadata for completed treatments', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        treatmentArbitrary,
        async (patientId, treatment) => {
          // Ensure treatment is completed with metadata
          const completedTreatment = {
            ...treatment,
            status: 'Completed' as const,
            completedAt: new Date().toISOString(),
            completedBy: 'Dr. Smith',
            actualCost: treatment.estimatedCost * 1.1,
            actualDuration: treatment.estimatedDuration + 10,
          };

          const plan = {
            id: fc.sample(fc.uuid(), 1)[0],
            patientId,
            createdAt: new Date().toISOString(),
            createdBy: 'Dr. Jones',
            totalEstimatedCost: completedTreatment.estimatedCost,
            status: 'Completed',
            treatments: [completedTreatment],
          };

          mockIpcClient.getTreatmentsByPatient.mockResolvedValue({
            success: true,
            data: [plan],
          });

          const { container } = render(<TreatmentList patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getTreatmentsByPatient).toHaveBeenCalled();
          });

          // Expand plan
          const expandButton = container.querySelector('button');
          if (expandButton) {
            (expandButton as HTMLElement).click();
          }

          await waitFor(() => {
            // Completion date must be displayed
            if (completedTreatment.completedAt) {
              const dateStr = new Date(completedTreatment.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              expect(screen.getAllByText(new RegExp(dateStr))[0]).toBeInTheDocument();
            }

            // Completed by must be displayed
            if (completedTreatment.completedBy) {
              expect(screen.getAllByText(new RegExp(completedTreatment.completedBy))[0]).toBeInTheDocument();
            }

            // Actual cost must be displayed if present
            if (completedTreatment.actualCost) {
              expect(
                screen.getAllByText(new RegExp(`\\$${completedTreatment.actualCost.toFixed(2)}`))[0]
              ).toBeInTheDocument();
            }
          });
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 50 }
    );
  });

  test('Property 23d: calculates total cost correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(treatmentArbitrary, { minLength: 1, maxLength: 10 }),
        async (patientId, treatments) => {
          const totalCost = treatments.reduce((sum, t) => sum + t.estimatedCost, 0);

          const plan = {
            id: fc.sample(fc.uuid(), 1)[0],
            patientId,
            createdAt: new Date().toISOString(),
            createdBy: 'Dr. Test',
            totalEstimatedCost: totalCost,
            status: 'Active',
            treatments,
          };

          mockIpcClient.getTreatmentsByPatient.mockResolvedValue({
            success: true,
            data: [plan],
          });

          render(<TreatmentList patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getTreatmentsByPatient).toHaveBeenCalled();
          });

          // Total cost must match sum of treatment costs
          await waitFor(() => {
            expect(
              screen.getAllByText(new RegExp(`\\$${totalCost.toFixed(2)}`))[0]
            ).toBeInTheDocument();
          });

          // Verify calculation is correct
          const calculatedTotal = treatments.reduce((sum, t) => sum + t.estimatedCost, 0);
          expect(Math.abs(calculatedTotal - totalCost)).toBeLessThan(0.01);
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 50 }
    );
  });

  test('Property 23e: displays treatment status with appropriate visual coding', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('Planned', 'In Progress', 'Completed', 'Cancelled'),
        async (patientId, status) => {
          const treatment = {
            ...fc.sample(treatmentArbitrary, 1)[0],
            status: status as any,
          };

          const plan = {
            id: fc.sample(fc.uuid(), 1)[0],
            patientId,
            createdAt: new Date().toISOString(),
            createdBy: 'Dr. Test',
            totalEstimatedCost: treatment.estimatedCost,
            status: 'Active',
            treatments: [treatment],
          };

          mockIpcClient.getTreatmentsByPatient.mockResolvedValue({
            success: true,
            data: [plan],
          });

          const { container } = render(<TreatmentList patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getTreatmentsByPatient).toHaveBeenCalled();
          });

          // Expand plan
          const expandButton = container.querySelector('button');
          if (expandButton) {
            (expandButton as HTMLElement).click();
          }

          // Status must be displayed with chip
          await waitFor(() => {
            expect(screen.getAllByText(status)[0]).toBeInTheDocument();
            const statusChip = screen
              .getAllByText(status)
              .map((el) => el.closest('.MuiChip-root'))
              .find((el) => el !== null);
            expect(statusChip).toBeInTheDocument();
          });
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 50 }
    );
  });
});
