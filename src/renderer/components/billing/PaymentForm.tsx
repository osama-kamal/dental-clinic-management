import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  total: number;
  balance: number;
}

interface PaymentFormProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: (updated: boolean) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ invoice, open, onClose }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(invoice?.balance || 0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!invoice || !user) return;
    if (amount <= 0 || amount > invoice.balance) {
      setError('Invalid payment amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await ipcClient.recordPayment(
        invoice.id,
        { amount, paymentMethod, reference, notes },
        user.id
      );

      if (response.success) {
        onClose(true);
      } else {
        setError(response.error || 'Failed to record payment');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Invoice</Typography>
          <Typography variant="body1" fontWeight="bold">
            {invoice.invoiceNumber} - {invoice.patientName}
          </Typography>
          <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
            Balance Due: ${invoice.balance.toFixed(2)}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Payment Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              disabled={loading}
              inputProps={{ min: 0, max: invoice.balance, step: 0.01 }}
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
                label="Payment Method"
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Credit Card">Credit Card</MenuItem>
                <MenuItem value="Debit Card">Debit Card</MenuItem>
                <MenuItem value="Check">Check</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Reference Number"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={loading}
              placeholder="Check #, Transaction ID, etc."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || amount <= 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Recording...' : 'Record Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
