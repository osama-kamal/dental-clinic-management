import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface Treatment {
  id: string;
  treatmentCode: string;
  description: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  estimatedCost: number;
  estimatedDuration: number;
}

interface TreatmentStatusUpdaterProps {
  treatment: Treatment | null;
  open: boolean;
  onClose: (updated: boolean) => void;
}

/**
 * Treatment Status Updater Component
 * Update treatment status (Planned → In Progress → Completed)
 * Record completion metadata
 * Requirements: 4.4
 */
export const TreatmentStatusUpdater: React.FC<TreatmentStatusUpdaterProps> = ({
  treatment,
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<Treatment['status']>(treatment?.status || 'Planned');
  const [actualCost, setActualCost] = useState(treatment?.estimatedCost || 0);
  const [actualDuration, setActualDuration] = useState(treatment?.estimatedDuration || 0);
  const [notes, setNotes] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!treatment || !user) return;

    setLoading(true);
    setError('');

    try {
      if (status === 'Completed') {
        // Parse materials used
        const materials = materialsUsed
          .split(',')
          .map((m) => m.trim())
          .filter((m) => m.length > 0)
          .map((m) => {
            const [itemName, quantity] = m.split(':').map((s) => s.trim());
            return {
              itemName: itemName || m,
              quantity: quantity ? parseInt(quantity) : 1,
            };
          });

        const response = await ipcClient.completeTreatment(treatment.id, materials, user.id);

        if (!response.success) {
          setError(response.error || 'Failed to complete treatment');
          setLoading(false);
          return;
        }
      } else {
        const response = await ipcClient.updateTreatmentStatus(treatment.id, status, user.id);

        if (!response.success) {
          setError(response.error || 'Failed to update status');
          setLoading(false);
          return;
        }
      }

      onClose(true);
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (!treatment) return null;

  const getAvailableStatuses = (): Treatment['status'][] => {
    switch (treatment.status) {
      case 'Planned':
        return ['Planned', 'In Progress', 'Cancelled'];
      case 'In Progress':
        return ['In Progress', 'Completed', 'Cancelled'];
      case 'Completed':
        return ['Completed'];
      case 'Cancelled':
        return ['Cancelled'];
      default:
        return ['Planned'];
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Update Treatment Status</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Treatment
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {treatment.treatmentCode} - {treatment.description}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as Treatment['status'])}
                label="Status"
                disabled={loading}
              >
                {getAvailableStatuses().map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {status === 'Completed' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Actual Cost"
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(parseFloat(e.target.value))}
                  disabled={loading}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Actual Duration (minutes)"
                  type="number"
                  value={actualDuration}
                  onChange={(e) => setActualDuration(parseInt(e.target.value))}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Materials Used"
                  value={materialsUsed}
                  onChange={(e) => setMaterialsUsed(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., Composite Resin:1, Anesthetic:2"
                  helperText="Format: Item Name:Quantity, separated by commas"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Completion Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                />
              </Grid>
            </>
          )}

          {status === 'Cancelled' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Cancellation Reason"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                required
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || (status === 'Cancelled' && !notes.trim())}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
