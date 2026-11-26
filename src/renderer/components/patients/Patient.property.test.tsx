/** @jest-environment jsdom */
/// <reference types="@testing-library/jest-dom" />
/**
 * Property-Based Tests for Patient Management UI Components
 * Requirements: 2.5, 2.8, 13.1, 13.4
 */

import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { PatientDetail } from './PatientDetail';

// Arbitraries for generating test data
const patientArbitrary = fc.record({
  id: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()),
  dateOfBirth: fc.date({ min: new Date('1920-01-01'), max: new Date('2020-01-01') })
    .map(d => d.toISOString().split('T')[0]),
  phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  address: fc.option(fc.string({ maxLength: 200 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
  emergencyContact: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
  emergencyPhone: fc.option(fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
  medicalHistory: fc.option(fc.string({ maxLength: 1000 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
  allergies: fc.option(fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
  medications: fc.option(fc.string({ maxLength: 500 }).filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
});

describe('Patient Management UI Property Tests', () => {
  /**
   * Property 10: Patient record completeness
   * Validates: Requirements 2.5
   * 
   * All patient records must include complete information including
   * personal details, medical history, allergies, and emergency contacts.
   */
  test('Property 10: displays complete patient record information', () => {
    fc.assert(
      fc.property(patientArbitrary, (patient) => {
        const mockOnClose = jest.fn();
        render(<PatientDetail patient={patient} onClose={mockOnClose} />);
        
        // Required fields must always be displayed
        expect(screen.getAllByText(`${patient.firstName} ${patient.lastName}`)[0]).toBeInTheDocument();
        expect(screen.getAllByText(patient.id)[0]).toBeInTheDocument();
        expect(screen.getAllByText(patient.phone)[0]).toBeInTheDocument();
        
        // Date of birth must be displayed
        const dobElement = screen.getAllByText(new RegExp(new Date(patient.dateOfBirth).toLocaleDateString()))[0];
        expect(dobElement).toBeInTheDocument();
        
        // Optional fields must be displayed if present, or show placeholder
        if (patient.email) {
          expect(screen.getAllByText(patient.email)[0]).toBeInTheDocument();
        }
        
        if (patient.address) {
          expect(screen.getAllByText(patient.address)[0]).toBeInTheDocument();
        }
        
        if (patient.emergencyContact) {
          expect(screen.getAllByText(patient.emergencyContact)[0]).toBeInTheDocument();
        }
        
        if (patient.emergencyPhone) {
          expect(screen.getAllByText(patient.emergencyPhone)[0]).toBeInTheDocument();
        }
        
        // Medical information sections must be present
        expect(screen.getAllByText('Medical Information')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Medical History')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Allergies')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Current Medications')[0]).toBeInTheDocument();
      }).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Allergy warning display
   * Validates: Requirements 2.8
   * 
   * If a patient has allergies, a prominent warning must be displayed
   * to alert healthcare providers.
   */
  test('Property 13: displays allergy warning when allergies present', () => {
    fc.assert(
      fc.property(patientArbitrary, (patient) => {
        const mockOnClose = jest.fn();
        render(<PatientDetail patient={patient} onClose={mockOnClose} />);
        
        if (patient.allergies && patient.allergies.trim().length > 0) {
          // Allergy warning must be prominently displayed
          expect(screen.getAllByText('Allergy Warning')[0]).toBeInTheDocument();
          expect(screen.getAllByText(patient.allergies)[0]).toBeInTheDocument();
          
          // Warning should use warning severity (check for warning icon or styling)
          const warningAlert = screen.getAllByText('Allergy Warning')[0].closest('.MuiAlert-root');
          expect(warningAlert).toHaveClass('MuiAlert-standardWarning');
        } else {
          // No allergy warning should be displayed if no allergies
          expect(screen.queryByText('Allergy Warning')).not.toBeInTheDocument();
        }
      }).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 69: Medical history completeness
   * Validates: Requirements 13.1
   * 
   * Patient medical history must include all relevant information
   * including conditions, medications, and allergies.
   */
  test('Property 69: displays complete medical history', () => {
    fc.assert(
      fc.property(patientArbitrary, (patient) => {
        const mockOnClose = jest.fn();
        render(<PatientDetail patient={patient} onClose={mockOnClose} />);
        
        // Medical history section must be present
        expect(screen.getAllByText('Medical Information')[0]).toBeInTheDocument();
        
        // Medical history content must be displayed
        if (patient.medicalHistory && patient.medicalHistory.trim().length > 0) {
          expect(screen.getAllByText(patient.medicalHistory)[0]).toBeInTheDocument();
        } else {
          expect(screen.getAllByText('No medical history recorded')[0]).toBeInTheDocument();
        }
        
        // Allergies must be displayed
        if (patient.allergies && patient.allergies.trim().length > 0) {
          // Allergies shown in chip format
          const allergyChip = screen.getAllByText(patient.allergies)[0];
          expect(allergyChip).toBeInTheDocument();
        } else {
          expect(screen.getAllByText('No known allergies')[0]).toBeInTheDocument();
        }
        
        // Medications must be displayed
        if (patient.medications && patient.medications.trim().length > 0) {
          expect(screen.getAllByText(patient.medications)[0]).toBeInTheDocument();
        } else {
          expect(screen.getAllByText('No current medications')[0]).toBeInTheDocument();
        }
      }).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 71: Critical condition alert
   * Validates: Requirements 13.4
   * 
   * Critical medical conditions must be prominently displayed
   * to ensure healthcare providers are immediately aware.
   */
  test('Property 71: displays critical condition alerts prominently', () => {
    fc.assert(
      fc.property(
        patientArbitrary,
        fc.constantFrom(
          'diabetes',
          'heart disease',
          'asthma',
          'epilepsy',
          'severe allergy',
          'hemophilia',
          'pacemaker',
          'blood thinner'
        ),
        (patient, criticalCondition) => {
          // Add critical condition to medical history or allergies
          const patientWithCritical = {
            ...patient,
            medicalHistory: patient.medicalHistory
              ? `${patient.medicalHistory}. ${criticalCondition}`
              : criticalCondition,
            allergies: patient.allergies || criticalCondition,
          };
          
          const mockOnClose = jest.fn();
          render(<PatientDetail patient={patientWithCritical} onClose={mockOnClose} />);
          
          // Critical condition must be visible in medical information
          expect(screen.getAllByText('Medical Information')[0]).toBeInTheDocument();
          
          // Allergy warning must be displayed if allergies contain critical info
          if (patientWithCritical.allergies) {
            expect(screen.getAllByText('Allergy Warning')[0]).toBeInTheDocument();
          }
          
          // Medical history must display the critical condition
          const medicalHistoryText = screen.getAllByText(new RegExp(criticalCondition, 'i'))[0];
          expect(medicalHistoryText).toBeInTheDocument();
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });

  test('Property 10b: patient age calculation is accurate', () => {
    fc.assert(
      fc.property(patientArbitrary, (patient) => {
        const mockOnClose = jest.fn();
        render(<PatientDetail patient={patient} onClose={mockOnClose} />);
        
        // Calculate expected age
        const birthDate = new Date(patient.dateOfBirth);
        const today = new Date();
        let expectedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          expectedAge--;
        }
        
        // Age must be displayed correctly
        const ageText = `${expectedAge} years`;
        expect(screen.getAllByText(new RegExp(ageText))[0]).toBeInTheDocument();
      }).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });
});
