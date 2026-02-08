/**
 * Property-Based Tests for Loading Indicator Component
 * Requirements: 9.2
 */

import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
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
          message: fc.option(fc.string(), { nil: undefined }),
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
            expect(screen.getByText(props.message)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 53b: progress bar shows accurate percentage', () => {
    fc.assert(
      fc.property(
        fc.record({
          value: fc.integer({ min: 0, max: 100 }),
          message: fc.option(fc.string(), { nil: undefined }),
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
            expect(screen.getByText(percentageText)).toBeInTheDocument();
          }
          
          // If message is provided, it must be displayed
          if (props.message) {
            expect(screen.getByText(props.message)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 53c: loading indicator is always visible when rendered', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.option(fc.string(), { nil: undefined }),
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
      ),
      { numRuns: 100 }
    );
  });
});
