import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { Warning } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientName: string;
  total: number;
}

interface DiscountFormProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: (updated: boolean) => void;
}

export const DiscountForm: React.FC<DiscountFormProps> = ({ invoice, open, onClose }) => {
  const { user } = useAuth();
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requiresAuthorization = discountPercentage > 10;

  const handleSubmit = async () => {
    if (!invoice || !user) return;
    if (discountPercentage <= 0 || discountPercentage > 100) {
      setError('Invalid discount percentage');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the discount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await ipcClient.applyDiscount(
        invoice.id,
        { discountPercentage, reason },
        user.id
      );

      if (response.success) {
        onClose(true);
      } else {
        setError(response.error || 'Failed to apply discount');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  const discountAmount = (invoice.total * discountPercentage) / 100;
  const newTotal = invoice.total - discountAmount;

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Apply Discount</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Invoice</Typography>
          <Typography variant="body1" fontWeight="bold">
            {invoice.invoiceNumber} - {invoice.patientName}
          </Typography>
          <Typography variant="h6" sx={{ mt: 1 }}>
            Original Total: ${invoice.total.toFixed(2)}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {requiresAuthorization && (
          <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">Authorization Required</Typography>
            <Typography variant="body2">
              Discounts over 10% require administrator authorization.
              {user?.role !== 'Administrator' && ' Please contact an administrator.'}
            </Typography>
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Discount Percentage"
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(parseFloat(e.target.value))}
              disabled={loading}
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              InputProps={{ endAdornment: <Typography>%</Typography> }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={3}
              label="Reason for Discount"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="Explain why this discount is being applied..."
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Original Total:</Typography>
                <Typography>${invoice.total.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Discount ({discountPercentage}%):</Typography>
                <Typography color="error">-${discountAmount.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">New Total:</Typography>
                <Typography variant="h6" color="primary">${newTotal.toFixed(2)}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            loading ||
            discountPercentage <= 0 ||
            !reason.trim() ||
            (requiresAuthorization && user?.role !== 'Administrator')
          }
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Applying...' : 'Apply Discount'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
