import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Add, Delete, Save, Cancel } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';
import { TreatmentTemplateSelector } from './TreatmentTemplateSelector';
import { ToothChart } from './ToothChart';

interface Treatment {
  templateId?: string;
  treatmentCode: string;
  description: string;
  estimatedCost: number;
  estimatedDuration: number;
  tooth?: string;
  notes?: string;
}

interface TreatmentPlanFormProps {
  patientId: string;
  patientName: string;
  onClose: (saved: boolean) => void;
}

/**
 * Treatment Plan Form Component
 * Implements treatment plan creation
 * Add treatment selection from template library
 * Display total estimated cost
 * Requirements: 4.1, 4.2, 4.6, 14.2
 */
export const TreatmentPlanForm: React.FC<TreatmentPlanFormProps> = ({
  patientId,
  patientName,
  onClose,
}) => {
  const { user } = useAuth();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddTemplate = (template: any) => {
    const newTreatment: Treatment = {
      templateId: template.id,
      treatmentCode: template.code,
      description: template.description,
      estimatedCost: template.defaultCost,
      estimatedDuration: template.estimatedDuration,
      notes: '',
    };
    setTreatments([...treatments, newTreatment]);
    setShowTemplateSelector(false);
  };

  const handleRemoveTreatment = (index: number) => {
    setTreatments(treatments.filter((_, i) => i !== index));
  };

  const handleUpdateTreatment = (index: number, field: keyof Treatment, value: any) => {
    const updated = [...treatments];
    updated[index] = { ...updated[index], [field]: value };
    setTreatments(updated);
  };

  const calculateTotalCost = (): number => {
    return treatments.reduce((sum, t) => sum + t.estimatedCost, 0);
  };

  const calculateTotalDuration = (): number => {
    return treatments.reduce((sum, t) => sum + t.estimatedDuration, 0);
  };

  const handleSubmit = async () => {
    if (treatments.length === 0) {
      setError('Please add at least one treatment');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await ipcClient.createTreatmentPlan(patientId, treatments, user.id);

      if (response.success) {
        onClose(true);
      } else {
        setError(response.error || 'Failed to create treatment plan');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (showTemplateSelector) {
    return (
      <TreatmentTemplateSelector
        onSelect={handleAddTemplate}
        onClose={() => setShowTemplateSelector(false)}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Create Treatment Plan</Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Patient: {patientName}
          </Typography>
        </Box>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Treatments</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowTemplateSelector(true)}
          >
            Add Treatment
          </Button>
        </Box>

        {treatments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No treatments added yet. Click "Add Treatment" to select from templates.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Tooth</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell align="right">Duration (min)</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {treatments.map((treatment, index) => (
                  <TableRow key={index}>
                    <TableCell>{treatment.treatmentCode}</TableCell>
                    <TableCell>{treatment.description}</TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={treatment.tooth || ''}
                        onChange={(e) => handleUpdateTreatment(index, 'tooth', e.target.value)}
                        placeholder="e.g., #14"
                        style={{
                          width: '60px',
                          padding: '4px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <input
                        type="number"
                        value={treatment.estimatedCost}
                        onChange={(e) =>
                          handleUpdateTreatment(index, 'estimatedCost', parseFloat(e.target.value))
                        }
                        style={{
                          width: '80px',
                          padding: '4px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          textAlign: 'right',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">{treatment.estimatedDuration}</TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={treatment.notes || ''}
                        onChange={(e) => handleUpdateTreatment(index, 'notes', e.target.value)}
                        placeholder="Notes..."
                        style={{
                          width: '150px',
                          padding: '4px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleRemoveTreatment(index)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {treatments.length > 0 && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Total Treatments:</Typography>
            <Chip label={treatments.length} color="primary" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography>Total Duration:</Typography>
            <Typography fontWeight="bold">{calculateTotalDuration()} minutes</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Total Estimated Cost:</Typography>
            <Typography variant="h6" color="primary">
              ${calculateTotalCost().toFixed(2)}
            </Typography>
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={() => onClose(false)} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          onClick={handleSubmit}
          disabled={loading || treatments.length === 0}
        >
          {loading ? 'Creating...' : 'Create Treatment Plan'}
        </Button>
      </Box>
    </Box>
  );
};
