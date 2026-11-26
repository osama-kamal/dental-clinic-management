/** @jest-environment jsdom */
/// <reference types="@testing-library/jest-dom" />
/**
 * Property-Based Tests for Loading Indicator Component
 * Requirements: 9.2
 */

import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { LoadingIndicator, ProgressBar } from './LoadingIndicator';

describe('LoadingIndicator Property Tests', () => {
  /**
   * Property 53: Long operation progress indicator
   * Validates: Requirements 9.2
   * 
   * For any long-running operation, a progress indicator must be displayed
   * to inform the user that the system is processing their request.
   */
  test('Property 53: displays progress indicator for long operations', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.option(fc.string().filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
          variant: fc.constantFrom('circular' as const, 'linear' as const),
          size: fc.option(fc.integer({ min: 20, max: 100 }), { nil: undefined }),
          fullScreen: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (props) => {
          const { container } = render(<LoadingIndicator {...props} />);
          
          // Progress indicator must be present
          const progressElement = props.variant === 'circular'
            ? container.querySelector('.MuiCircularProgress-root')
            : container.querySelector('.MuiLinearProgress-root');
          
          expect(progressElement).toBeInTheDocument();
          
          // If message is provided, it must be displayed
          if (props.message) {
            expect(screen.getAllByText(props.message)[0]).toBeInTheDocument();
          }
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });

  test('Property 53b: progress bar shows accurate percentage', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.integer({ min: 0, max: 100 }),
          message: fc.option(fc.string().filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
          showPercentage: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (props) => {
          render(<ProgressBar {...props} />);
          
          // Progress bar must be present
          const progressBar = document.querySelector('.MuiLinearProgress-root');
          expect(progressBar).toBeInTheDocument();
          
          // If showPercentage is true (default), percentage must be displayed
          if (props.showPercentage !== false) {
            const percentageText = `${Math.round(props.value)}%`;
            expect(screen.getAllByText(percentageText)[0]).toBeInTheDocument();
          }
          
          // If message is provided, it must be displayed
          if (props.message) {
            expect(screen.getAllByText(props.message)[0]).toBeInTheDocument();
          }
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });

  test('Property 53c: loading indicator is always visible when rendered', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.option(fc.string().filter((s) => s.trim().length > 0).map((s) => s.replace(/\s+/g, ' ').trim()), { nil: undefined }),
          variant: fc.constantFrom('circular' as const, 'linear' as const),
        }),
        (props) => {
          const { container } = render(<LoadingIndicator {...props} />);
          
          // Loading indicator must be visible (not hidden)
          const progressElement = props.variant === 'circular'
            ? container.querySelector('.MuiCircularProgress-root')
            : container.querySelector('.MuiLinearProgress-root');
          
          expect(progressElement).toBeVisible();
        }
      ).afterEach(() => { cleanup(); }),
      { numRuns: 100 }
    );
  });
});
