import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Typography,
  Chip,
  TablePagination,
  CircularProgress,
  Alert,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Add, Visibility, Payment, PictureAsPdf, FilterList } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  invoiceDate: string;
  total: number;
  balance: number;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
}

interface InvoiceListProps {
  onAddInvoice?: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onRecordPayment?: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  onAddInvoice,
  onViewInvoice,
  onRecordPayment,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    patientName: '',
  });

  useEffect(() => {
    loadInvoices();
  }, [filters]);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.searchInvoices(filters);
      if (response.success && response.data) {
        setInvoices(response.data);
      } else {
        setError(response.error || 'Failed to load invoices');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (invoiceId: string) => {
    try {
      const response = await ipcClient.generateInvoicePDF(invoiceId);
      if (response.success) {
        // PDF generated successfully
        alert('PDF generated successfully');
      } else {
        setError(response.error || 'Failed to generate PDF');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Partially Paid':
        return 'warning';
      case 'Unpaid':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Invoices</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={onAddInvoice}>
            New Invoice
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Partially Paid">Partially Paid</MenuItem>
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Patient Name"
                value={filters.patientName}
                onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
                size="small"
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                      <TableCell>{invoice.patientName}</TableCell>
                      <TableCell align="right">${invoice.total.toFixed(2)}</TableCell>
                      <TableCell align="right">${invoice.balance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip label={invoice.status} color={getStatusColor(invoice.status)} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => onViewInvoice?.(invoice)}>
                          <Visibility />
                        </IconButton>
                        {invoice.status !== 'Paid' && (
                          <IconButton size="small" onClick={() => onRecordPayment?.(invoice)}>
                            <Payment />
                          </IconButton>
                        )}
                        <IconButton size="small" onClick={() => handleExportPDF(invoice.id)}>
                          <PictureAsPdf />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No invoices found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={invoices.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}
    </Box>
  );
};
