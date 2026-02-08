/**
 * Property-Based Tests for Patient Management UI Components
 * Requirements: 2.5, 2.8, 13.1, 13.4
 */

import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { PatientDetail } from './PatientDetail';

// Arbitraries for generating test data
const patientArbitrary = fc.record({
  id: fc.uuid(),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  dateOfBirth: fc.date({ min: new Date('1920-01-01'), max: new Date('2020-01-01') })
    .map(d => d.toISOString().split('T')[0]),
  phone: fc.string({ minLength: 10, maxLength: 15 }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  address: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  emergencyContact: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  emergencyPhone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
  medicalHistory: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  allergies: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  medications: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
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
        expect(screen.getByText(`${patient.firstName} ${patient.lastName}`)).toBeInTheDocument();
        expect(screen.getByText(patient.id)).toBeInTheDocument();
        expect(screen.getByText(patient.phone)).toBeInTheDocument();
        
        // Date of birth must be displayed
        const dobElement = screen.getByText(new RegExp(new Date(patient.dateOfBirth).toLocaleDateString()));
        expect(dobElement).toBeInTheDocument();
        
        // Optional fields must be displayed if present, or show placeholder
        if (patient.email) {
          expect(screen.getByText(patient.email)).toBeInTheDocument();
        }
        
        if (patient.address) {
          expect(screen.getByText(patient.address)).toBeInTheDocument();
        }
        
        if (patient.emergencyContact) {
          expect(screen.getByText(patient.emergencyContact)).toBeInTheDocument();
        }
        
        if (patient.emergencyPhone) {
          expect(screen.getByText(patient.emergencyPhone)).toBeInTheDocument();
        }
        
        // Medical information sections must be present
        expect(screen.getByText('Medical Information')).toBeInTheDocument();
        expect(screen.getByText('Medical History')).toBeInTheDocument();
        expect(screen.getByText('Allergies')).toBeInTheDocument();
        expect(screen.getByText('Current Medications')).toBeInTheDocument();
      }),
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
          expect(screen.getByText('Allergy Warning')).toBeInTheDocument();
          expect(screen.getByText(patient.allergies)).toBeInTheDocument();
          
          // Warning should use warning severity (check for warning icon or styling)
          const warningAlert = screen.getByText('Allergy Warning').closest('.MuiAlert-root');
          expect(warningAlert).toHaveClass('MuiAlert-standardWarning');
        } else {
          // No allergy warning should be displayed if no allergies
          expect(screen.queryByText('Allergy Warning')).not.toBeInTheDocument();
        }
      }),
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
        expect(screen.getByText('Medical Information')).toBeInTheDocument();
        
        // Medical history content must be displayed
        if (patient.medicalHistory && patient.medicalHistory.trim().length > 0) {
          expect(screen.getByText(patient.medicalHistory)).toBeInTheDocument();
        } else {
          expect(screen.getByText('No medical history recorded')).toBeInTheDocument();
        }
        
        // Allergies must be displayed
        if (patient.allergies && patient.allergies.trim().length > 0) {
          // Allergies shown in chip format
          const allergyChip = screen.getByText(patient.allergies);
          expect(allergyChip).toBeInTheDocument();
        } else {
          expect(screen.getByText('No known allergies')).toBeInTheDocument();
        }
        
        // Medications must be displayed
        if (patient.medications && patient.medications.trim().length > 0) {
          expect(screen.getByText(patient.medications)).toBeInTheDocument();
        } else {
          expect(screen.getByText('No current medications')).toBeInTheDocument();
        }
      }),
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
          expect(screen.getByText('Medical Information')).toBeInTheDocument();
          
          // Allergy warning must be displayed if allergies contain critical info
          if (patientWithCritical.allergies) {
            expect(screen.getByText('Allergy Warning')).toBeInTheDocument();
          }
          
          // Medical history must display the critical condition
          const medicalHistoryText = screen.getByText(new RegExp(criticalCondition, 'i'));
          expect(medicalHistoryText).toBeInTheDocument();
        }
      ),
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
        expect(screen.getByText(new RegExp(ageText))).toBeInTheDocument();
      }),
      { numRuns: 100 }
    );
  });
});
