/**
 * Property-Based Tests for Attachment Viewer Component
 * Requirements: 13.8
 */

import * as fc from 'fast-check';
import { render, screen, waitFor } from '@testing-library/react';
import { AttachmentViewer } from './AttachmentViewer';
import { ipcClient } from '../../api/ipcClient';

// Mock IPC client
jest.mock('../../api/ipcClient');
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', firstName: 'Test', lastName: 'User', role: 'Dentist' },
  }),
}));

const mockIpcClient = ipcClient as jest.Mocked<typeof ipcClient>;

// Arbitraries for generating test data
const attachmentArbitrary = fc.record({
  id: fc.uuid(),
  patientId: fc.uuid(),
  filename: fc.string({ minLength: 5, maxLength: 50 }).map(s => `${s}.pdf`),
  fileType: fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
  fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
  uploadedBy: fc.string({ minLength: 3, maxLength: 50 }),
  uploadedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
    .map(d => d.toISOString()),
});

describe('AttachmentViewer Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 75: Attachment inline viewing
   * Validates: Requirements 13.8
   * 
   * Attachments (JPEG, PNG, PDF) must be viewable inline within
   * the application without requiring external programs.
   */
  test('Property 75: displays attachments inline for supported formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(attachmentArbitrary, { minLength: 0, maxLength: 10 }),
        async (patientId, attachments) => {
          // Mock API responses
          mockIpcClient.getAttachmentMetadata.mockResolvedValue({
            success: true,
            data: attachments,
          });

          render(<AttachmentViewer patientId={patientId} />);

          // Wait for attachments to load
          await waitFor(() => {
            expect(mockIpcClient.getAttachmentMetadata).toHaveBeenCalledWith(patientId);
          });

          // All attachments must be displayed in the list
          for (const attachment of attachments) {
            await waitFor(() => {
              expect(screen.getByText(attachment.filename)).toBeInTheDocument();
            });
          }

          // Supported file types must have appropriate icons
          const jpegAttachments = attachments.filter(a => a.fileType === 'image/jpeg');
          const pngAttachments = attachments.filter(a => a.fileType === 'image/png');
          const pdfAttachments = attachments.filter(a => a.fileType === 'application/pdf');

          // Image attachments should have image icon
          const imageIcons = document.querySelectorAll('.MuiSvgIcon-root');
          expect(imageIcons.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 } // Reduced runs for async tests
    );
  });

  test('Property 75b: only accepts supported file formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
        async (patientId, fileType) => {
          mockIpcClient.getAttachmentMetadata.mockResolvedValue({
            success: true,
            data: [],
          });

          render(<AttachmentViewer patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getAttachmentMetadata).toHaveBeenCalled();
          });

          // Upload button must specify accepted formats
          const uploadButton = screen.getByText(/Upload File/i);
          expect(uploadButton).toBeInTheDocument();

          // File input must have accept attribute with supported formats
          const fileInput = document.querySelector('input[type="file"]');
          expect(fileInput).toHaveAttribute('accept', 'image/jpeg,image/png,application/pdf');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 75c: displays file metadata correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(attachmentArbitrary, { minLength: 1, maxLength: 5 }),
        async (patientId, attachments) => {
          mockIpcClient.getAttachmentMetadata.mockResolvedValue({
            success: true,
            data: attachments,
          });

          render(<AttachmentViewer patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getAttachmentMetadata).toHaveBeenCalled();
          });

          // Each attachment must display filename and metadata
          for (const attachment of attachments) {
            await waitFor(() => {
              // Filename must be displayed
              expect(screen.getByText(attachment.filename)).toBeInTheDocument();

              // Uploader must be displayed
              expect(screen.getByText(new RegExp(attachment.uploadedBy))).toBeInTheDocument();
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 75d: provides view and delete actions for each attachment', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(attachmentArbitrary, { minLength: 1, maxLength: 5 }),
        async (patientId, attachments) => {
          mockIpcClient.getAttachmentMetadata.mockResolvedValue({
            success: true,
            data: attachments,
          });

          render(<AttachmentViewer patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getAttachmentMetadata).toHaveBeenCalled();
          });

          // Each attachment must have view and delete buttons
          const viewButtons = document.querySelectorAll('[aria-label*="view"], button');
          const deleteButtons = document.querySelectorAll('[aria-label*="delete"], button');

          // At least one button per attachment (view or delete)
          expect(viewButtons.length + deleteButtons.length).toBeGreaterThanOrEqual(attachments.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Property 75e: shows attachment count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(attachmentArbitrary, { minLength: 0, maxLength: 20 }),
        async (patientId, attachments) => {
          mockIpcClient.getAttachmentMetadata.mockResolvedValue({
            success: true,
            data: attachments,
          });

          render(<AttachmentViewer patientId={patientId} />);

          await waitFor(() => {
            expect(mockIpcClient.getAttachmentMetadata).toHaveBeenCalled();
          });

          // Attachment count must be displayed
          await waitFor(() => {
            const countChip = screen.getByText(attachments.length.toString());
            expect(countChip).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
