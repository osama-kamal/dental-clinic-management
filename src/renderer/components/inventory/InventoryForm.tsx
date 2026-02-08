import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface InventoryItem {
  id?: string;
  itemName: string;
  category: string;
  currentQuantity: number;
  minimumThreshold: number;
  unitCost: number;
  unit: string;
  supplier?: string;
  description?: string;
}

interface InventoryFormProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: (saved: boolean) => void;
}

/**
 * Inventory Form Component
 * Implement item creation and editing
 * Add validation for required fields
 * Requirements: 6.1
 */
export const InventoryForm: React.FC<InventoryFormProps> = ({ item, open, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<InventoryItem>({
    itemName: '',
    category: '',
    currentQuantity: 0,
    minimumThreshold: 0,
    unitCost: 0,
    unit: '',
    supplier: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        itemName: '',
        category: '',
        currentQuantity: 0,
        minimumThreshold: 0,
        unitCost: 0,
        unit: '',
        supplier: '',
        description: '',
      });
    }
    setError('');
  }, [item, open]);

  const handleChange = (field: keyof InventoryItem, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const validate = (): boolean => {
    if (!formData.itemName.trim()) {
      setError('Item name is required');
      return false;
    }
    if (!formData.category) {
      setError('Category is required');
      return false;
    }
    if (!formData.unit.trim()) {
      setError('Unit is required');
      return false;
    }
    if (formData.currentQuantity < 0) {
      setError('Quantity cannot be negative');
      return false;
    }
    if (formData.minimumThreshold < 0) {
      setError('Minimum threshold cannot be negative');
      return false;
    }
    if (formData.unitCost < 0) {
      setError('Unit cost cannot be negative');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !user) return;

    setLoading(true);
    setError('');

    try {
      let response;
      if (item?.id) {
        // Update existing item
        response = await ipcClient.updateInventoryItem(item.id, formData);
      } else {
        // Create new item
        response = await ipcClient.createInventoryItem(formData, user.id);
      }

      if (response.success) {
        onClose(true);
      } else {
        setError(response.error || 'Failed to save item');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle>{item ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Item Name"
              value={formData.itemName}
              onChange={(e) => handleChange('itemName', e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                disabled={loading}
                label="Category"
              >
                <MenuItem value="Dental Materials">Dental Materials</MenuItem>
                <MenuItem value="Instruments">Instruments</MenuItem>
                <MenuItem value="Medications">Medications</MenuItem>
                <MenuItem value="Consumables">Consumables</MenuItem>
                <MenuItem value="Equipment">Equipment</MenuItem>
                <MenuItem value="Office Supplies">Office Supplies</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Current Quantity"
              type="number"
              value={formData.currentQuantity}
              onChange={(e) => handleChange('currentQuantity', parseFloat(e.target.value) || 0)}
              disabled={loading}
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Minimum Threshold"
              type="number"
              value={formData.minimumThreshold}
              onChange={(e) => handleChange('minimumThreshold', parseFloat(e.target.value) || 0)}
              disabled={loading}
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Unit Cost"
              type="number"
              value={formData.unitCost}
              onChange={(e) => handleChange('unitCost', parseFloat(e.target.value) || 0)}
              disabled={loading}
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{ startAdornment: '$' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Unit"
              value={formData.unit}
              onChange={(e) => handleChange('unit', e.target.value)}
              disabled={loading}
              placeholder="e.g., pieces, boxes, ml"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Supplier"
              value={formData.supplier}
              onChange={(e) => handleChange('supplier', e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
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
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
