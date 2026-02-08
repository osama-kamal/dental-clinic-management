import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Paper,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { PictureAsPdf, Close, Print } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountPercentage?: number;
  discountAmount?: number;
  total: number;
  balance: number;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  notes?: string;
  payments?: Payment[];
}

interface InvoicePreviewProps {
  invoiceId: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Invoice Preview Component
 * Display printable invoice view
 * Add PDF export button
 * Requirements: 5.8
 */
export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoiceId, open, onClose }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (invoiceId && open) {
      loadInvoice();
    }
  }, [invoiceId, open]);

  const loadInvoice = async () => {
    if (!invoiceId) return;

    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.getInvoice(invoiceId);
      if (response.success && response.data) {
        setInvoice(response.data);
      } else {
        setError(response.error || 'Failed to load invoice');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!invoiceId) return;

    setExporting(true);
    setError('');
    try {
      const response = await ipcClient.generateInvoicePDF(invoiceId);
      if (response.success) {
        alert('PDF generated successfully');
      } else {
        setError(response.error || 'Failed to generate PDF');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Invoice Preview</Typography>
          <Button startIcon={<Close />} onClick={onClose}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 4 }} id="invoice-content">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              INVOICE
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="h6" color="primary">
                  Dental Clinic Management System
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  123 Medical Street
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  City, State 12345
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Phone: (555) 123-4567
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography variant="h6">
                  Invoice #: {invoice.invoiceNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {invoice.status}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Patient Information */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Bill To:
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {invoice.patientName}
            </Typography>
            {invoice.patientPhone && (
              <Typography variant="body2" color="text.secondary">
                Phone: {invoice.patientPhone}
              </Typography>
            )}
            {invoice.patientEmail && (
              <Typography variant="body2" color="text.secondary">
                Email: {invoice.patientEmail}
              </Typography>
            )}
          </Box>

          {/* Invoice Items */}
          <TableContainer sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="right"><strong>Quantity</strong></TableCell>
                  <TableCell align="right"><strong>Unit Price</strong></TableCell>
                  <TableCell align="right"><strong>Total</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">${item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Box sx={{ width: '300px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal:</Typography>
                <Typography>${invoice.subtotal.toFixed(2)}</Typography>
              </Box>
              {invoice.discountPercentage && invoice.discountPercentage > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Discount ({invoice.discountPercentage}%):</Typography>
                  <Typography>-${invoice.discountAmount?.toFixed(2) || '0.00'}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Tax ({invoice.taxRate}%):</Typography>
                <Typography>${invoice.taxAmount.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary">
                  ${invoice.total.toFixed(2)}
                </Typography>
              </Box>
              {invoice.payments && invoice.payments.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Payments:
                  </Typography>
                  {invoice.payments.map((payment) => (
                    <Box key={payment.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(payment.paymentDate).toLocaleDateString()} - {payment.paymentMethod}
                      </Typography>
                      <Typography variant="body2">-${payment.amount.toFixed(2)}</Typography>
                    </Box>
                  ))}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Balance Due:</Typography>
                    <Typography variant="h6" color={invoice.balance > 0 ? 'error' : 'success'}>
                      ${invoice.balance.toFixed(2)}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {/* Notes */}
          {invoice.notes && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Notes:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoice.notes}
              </Typography>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Thank you for your business!
            </Typography>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={handlePrint}
        >
          Print
        </Button>
        <Button
          variant="contained"
          startIcon={exporting ? <CircularProgress size={20} /> : <PictureAsPdf />}
          onClick={handleExportPDF}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Export PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
