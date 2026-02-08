import React from 'react';
import { TablePagination, Box, Typography } from '@mui/material';

interface PaginationComponentProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  rowsPerPageOptions?: number[];
  showFirstButton?: boolean;
  showLastButton?: boolean;
}

/**
 * Pagination Component
 * Applies pagination for lists over 100 records
 * Requirements: 9.7
 */
export const PaginationComponent: React.FC<PaginationComponentProps> = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100],
  showFirstButton = true,
  showLastButton = true,
}) => {
  // Show pagination only if count exceeds minimum threshold
  const shouldShowPagination = count > Math.min(...rowsPerPageOptions);

  if (!shouldShowPagination) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {count} {count === 1 ? 'item' : 'items'}
        </Typography>
      </Box>
    );
  }

  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={onPageChange}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={rowsPerPageOptions}
      showFirstButton={showFirstButton}
      showLastButton={showLastButton}
      labelRowsPerPage="Rows per page:"
      labelDisplayedRows={({ from, to, count }) =>
        `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
      }
    />
  );
};

/**
 * Hook for managing pagination state
 */
export const usePagination = (initialRowsPerPage: number = 10) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(initialRowsPerPage);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const resetPagination = () => {
    setPage(0);
  };

  const getPaginatedData = <T,>(data: T[]): T[] => {
    return data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };

  return {
    page,
    rowsPerPage,
    handleChangePage,
    handleChangeRowsPerPage,
    resetPagination,
    getPaginatedData,
  };
};
