import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface InvoiceFormProps {
  patientId?: string;
  treatmentPlanId?: string;
  onClose: (saved: boolean) => void;
}

/**
 * Invoice Form Component
 * Implement invoice creation from treatments
 * Calculate totals automatically
 * Requirements: 5.1, 5.3
 */
export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  patientId: initialPatientId,
  treatmentPlanId,
  onClose,
}) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId || '');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (treatmentPlanId) {
      loadTreatmentPlan();
    }
  }, [treatmentPlanId]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const response = await ipcClient.searchPatients({});
      if (response.success && response.data) {
        setPatients(response.data);
      }
    } catch (err) {
      setError('Failed to load patients');
    } finally {
      setLoadingData(false);
    }
  };

  const loadTreatmentPlan = async () => {
    if (!treatmentPlanId) return;

    try {
      const response = await ipcClient.getTreatmentPlan(treatmentPlanId);
      if (response.success && response.data) {
        const plan = response.data;
        const invoiceItems: InvoiceItem[] = plan.treatments.map((t: any) => ({
          description: `${t.treatmentCode} - ${t.description}${t.tooth ? ` (Tooth ${t.tooth})` : ''}`,
          quantity: 1,
          unitPrice: t.actualCost || t.estimatedCost,
          total: t.actualCost || t.estimatedCost,
        }));
        setItems(invoiceItems);
      }
    } catch (err) {
      setError('Failed to load treatment plan');
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate total
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }

    setItems(updated);
  };

  const calculateSubtotal = (): number => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = (): number => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async () => {
    if (!patientId) {
      setError('Please select a patient');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const invoiceData = {
        patientId,
        items,
        subtotal: calculateSubtotal(),
        taxRate,
        taxAmount: calculateTax(),
        total: calculateTotal(),
        notes,
      };

      const response = await ipcClient.createInvoice(invoiceData, user.id);

      if (response.success) {
        onClose(true);
      } else {
        setError(response.error || 'Failed to create invoice');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Create Invoice</Typography>
        <Button variant="outlined" startIcon={<Cancel />} onClick={() => onClose(false)}>
          Cancel
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Patient Information
        </Typography>
        <FormControl fullWidth required>
          <InputLabel>Patient</InputLabel>
          <Select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={loading || !!initialPatientId}
            label="Patient"
          >
            {patients.map((patient) => (
              <MenuItem key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Invoice Items</Typography>
          <Button variant="outlined" onClick={handleAddItem} disabled={loading}>
            Add Item
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="40%">Description</TableCell>
                <TableCell width="15%" align="right">Quantity</TableCell>
                <TableCell width="20%" align="right">Unit Price</TableCell>
                <TableCell width="20%" align="right">Total</TableCell>
                <TableCell width="5%" align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      disabled={loading}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                      disabled={loading}
                      inputProps={{ min: 1, style: { textAlign: 'right' } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      disabled={loading}
                      inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">${item.total.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(index)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      No items added. Click "Add Item" to add invoice items.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Tax Rate (%)"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                disabled={loading}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Subtotal:</Typography>
                <Typography fontWeight="bold">${calculateSubtotal().toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Tax ({taxRate}%):</Typography>
                <Typography fontWeight="bold">${calculateTax().toFixed(2)}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary">
                  ${calculateTotal().toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={() => onClose(false)} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSubmit}
          disabled={loading || items.length === 0 || !patientId}
        >
          {loading ? 'Creating...' : 'Create Invoice'}
        </Button>
      </Box>
    </Box>
  );
};
