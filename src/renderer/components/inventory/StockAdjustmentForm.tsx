import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface InventoryItem {
  id: string;
  itemName: string;
  currentQuantity: number;
  unit: string;
}

interface StockAdjustmentFormProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: (updated: boolean) => void;
}

/**
 * Stock Adjustment Form Component
 * Record quantity adjustments with reason
 * Require authorization
 * Requirements: 6.6
 */
export const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({ 
  item, 
  open, 
  onClose 
}) => {
  const { user } = useAuth();
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!item || !user) return;

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const adjustmentQuantity = adjustmentType === 'add' ? quantity : -quantity;
      const response = await ipcClient.adjustInventoryQuantity(
        item.id,
        adjustmentQuantity,
        reason,
        user.id
      );

      if (response.success) {
        onClose(true);
        // Reset form
        setQuantity(0);
        setReason('');
        setAdjustmentType('add');
      } else {
        setError(response.error || 'Failed to adjust stock');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewQuantity = (): number => {
    if (!item) return 0;
    return adjustmentType === 'add' 
      ? item.currentQuantity + quantity 
      : item.currentQuantity - quantity;
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Adjust Stock - {item.itemName}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Current Stock</Typography>
          <Typography variant="h6" color="primary">
            {item.currentQuantity} {item.unit}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Adjustment Type</InputLabel>
              <Select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract')}
                disabled={loading}
                label="Adjustment Type"
              >
                <MenuItem value="add">Add Stock</MenuItem>
                <MenuItem value="subtract">Remove Stock</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              disabled={loading}
              inputProps={{ min: 0, step: 1 }}
              helperText={`New quantity will be: ${calculateNewQuantity()} ${item.unit}`}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              multiline
              rows={3}
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="e.g., Received shipment, Damaged items, Inventory count correction"
            />
          </Grid>
        </Grid>

        {calculateNewQuantity() < 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Cannot remove more stock than available
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || quantity <= 0 || !reason.trim() || calculateNewQuantity() < 0}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Adjusting...' : 'Adjust Stock'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
