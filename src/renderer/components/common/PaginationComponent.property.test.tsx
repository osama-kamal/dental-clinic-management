/**
 * Property-Based Tests for Pagination Component
 * Requirements: 9.7
 */

import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import { PaginationComponent, usePagination } from './PaginationComponent';
import { renderHook, act } from '@testing-library/react';

describe('PaginationComponent Property Tests', () => {
  /**
   * Property 55: Pagination for large lists
   * Validates: Requirements 9.7
   * 
   * Lists with more than 100 records must be paginated to ensure
   * UI responsiveness and good user experience.
   */
  test('Property 55: applies pagination for lists over 100 records', () => {
    fc.assert(
      fc.property(
        fc.record({
          count: fc.integer({ min: 1, max: 10000 }),
          page: fc.nat(),
          rowsPerPage: fc.constantFrom(10, 25, 50, 100),
        }),
        (props) => {
          // Ensure page is within valid range
          const validPage = Math.min(props.page, Math.floor(props.count / props.rowsPerPage));
          
          const mockPageChange = jest.fn();
          const mockRowsPerPageChange = jest.fn();
          
          render(
            <PaginationComponent
              count={props.count}
              page={validPage}
              rowsPerPage={props.rowsPerPage}
              onPageChange={mockPageChange}
              onRowsPerPageChange={mockRowsPerPageChange}
            />
          );
          
          // For lists over 100 records, pagination controls must be present
          if (props.count > 100) {
            const paginationElement = document.querySelector('.MuiTablePagination-root');
            expect(paginationElement).toBeInTheDocument();
          }
          
          // Pagination must show correct range information
          const from = validPage * props.rowsPerPage + 1;
          const to = Math.min((validPage + 1) * props.rowsPerPage, props.count);
          
          if (props.count > 10) {
            const rangeText = `${from}-${to} of ${props.count}`;
            expect(screen.getByText(rangeText)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 55b: pagination correctly slices data', () => {
    fc.assert(
      fc.property(
        fc.record({
          dataSize: fc.integer({ min: 1, max: 1000 }),
          rowsPerPage: fc.constantFrom(10, 25, 50, 100),
        }),
        (props) => {
          const { result } = renderHook(() => usePagination(props.rowsPerPage));
          
          // Create mock data
          const mockData = Array.from({ length: props.dataSize }, (_, i) => ({ id: i }));
          
          // Get paginated data for first page
          const paginatedData = result.current.getPaginatedData(mockData);
          
          // Paginated data must not exceed rowsPerPage
          expect(paginatedData.length).toBeLessThanOrEqual(props.rowsPerPage);
          
          // Paginated data must be correct slice
          const expectedLength = Math.min(props.rowsPerPage, props.dataSize);
          expect(paginatedData.length).toBe(expectedLength);
          
          // First item must be correct
          if (paginatedData.length > 0) {
            expect(paginatedData[0].id).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 55c: page change maintains data integrity', () => {
    fc.assert(
      fc.property(
        fc.record({
          dataSize: fc.integer({ min: 50, max: 500 }),
          rowsPerPage: fc.constantFrom(10, 25, 50),
          targetPage: fc.nat(),
        }),
        (props) => {
          const { result } = renderHook(() => usePagination(props.rowsPerPage));
          
          // Create mock data
          const mockData = Array.from({ length: props.dataSize }, (_, i) => ({ id: i }));
          
          // Calculate valid target page
          const maxPage = Math.floor(props.dataSize / props.rowsPerPage);
          const validTargetPage = Math.min(props.targetPage, maxPage);
          
          // Change to target page
          act(() => {
            result.current.handleChangePage(null, validTargetPage);
          });
          
          // Get paginated data
          const paginatedData = result.current.getPaginatedData(mockData);
          
          // Data must be from correct page
          const expectedFirstId = validTargetPage * props.rowsPerPage;
          if (paginatedData.length > 0) {
            expect(paginatedData[0].id).toBe(expectedFirstId);
          }
          
          // Data must not exceed page size
          expect(paginatedData.length).toBeLessThanOrEqual(props.rowsPerPage);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 55d: rows per page change resets to first page', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialRowsPerPage: fc.constantFrom(10, 25, 50),
          newRowsPerPage: fc.constantFrom(10, 25, 50, 100),
          initialPage: fc.integer({ min: 1, max: 10 }),
        }),
        (props) => {
          const { result } = renderHook(() => usePagination(props.initialRowsPerPage));
          
          // Navigate to a page other than first
          act(() => {
            result.current.handleChangePage(null, props.initialPage);
          });
          
          expect(result.current.page).toBe(props.initialPage);
          
          // Change rows per page
          act(() => {
            const event = {
              target: { value: props.newRowsPerPage.toString() },
            } as React.ChangeEvent<HTMLInputElement>;
            result.current.handleChangeRowsPerPage(event);
          });
          
          // Page must reset to 0
          expect(result.current.page).toBe(0);
          expect(result.current.rowsPerPage).toBe(props.newRowsPerPage);
        }
      ),
      { numRuns: 100 }
    );
  });
});
