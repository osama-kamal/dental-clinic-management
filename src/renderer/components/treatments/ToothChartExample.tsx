import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { ToothChart } from './ToothChart';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

type ToothStatusValue = 'cavity' | 'filled';

/**
 * Tooth chart treatment planning.
 * Pick a patient, select teeth, enter the treatment and cost, and save a treatment plan.
 * Teeth with a saved treatment are coloured: planned work shows as "cavity", completed as "filled".
 */
export const ToothChartExample: React.FC = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [treatmentType, setTreatmentType] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [toothStatuses, setToothStatuses] = useState<
    { toothNumber: number; status: ToothStatusValue; treatment?: string }[]
  >([]);

  useEffect(() => {
    ipcClient.searchPatients({}).then((res) => {
      if (res.success && Array.isArray(res.data)) setPatients(res.data);
    });
  }, []);

  const loadStatuses = async (id: string) => {
    if (!id) {
      setToothStatuses([]);
      return;
    }
    const res = await ipcClient.getTreatmentsByPatient(id);
    const statuses: { toothNumber: number; status: ToothStatusValue; treatment?: string }[] = [];
    if (res.success && Array.isArray(res.data)) {
      for (const plan of res.data) {
        for (const t of plan.treatments || []) {
          const match = /tooth (\d+)/i.exec(t.description || '');
          if (match && t.status !== 'Cancelled') {
            statuses.push({
              toothNumber: Number(match[1]),
              status: t.status === 'Completed' ? 'filled' : 'cavity',
              treatment: t.description,
            });
          }
        }
      }
    }
    setToothStatuses(statuses);
  };

  useEffect(() => {
    loadStatuses(patientId);
  }, [patientId]);

  const handleToothSelect = (toothNumber: number) => {
    setSelectedTeeth((prev) =>
      prev.includes(toothNumber) ? prev.filter((t) => t !== toothNumber) : [...prev, toothNumber]
    );
  };

  const handleClearSelection = () => setSelectedTeeth([]);

  const handleSave = async () => {
    setMessage(null);
    if (!patientId) return setMessage({ type: 'error', text: 'Select a patient first' });
    if (!treatmentType.trim()) return setMessage({ type: 'error', text: 'Enter a treatment type' });
    const unitCost = Number(cost);
    if (!(unitCost >= 0) || cost === '') return setMessage({ type: 'error', text: 'Enter a cost' });
    if (!user) return setMessage({ type: 'error', text: 'Not signed in' });

    const treatments = [...selectedTeeth]
      .sort((a, b) => a - b)
      .map((tooth) => ({
        code: `T${tooth}`,
        description: `${treatmentType.trim()} (tooth ${tooth})`,
        estimatedCost: unitCost,
        notes: notes.trim() || undefined,
      }));

    setSaving(true);
    try {
      const res = await ipcClient.createTreatmentPlan(patientId, treatments, user.id);
      if (res.success) {
        setMessage({ type: 'success', text: `Treatment plan saved (${treatments.length} treatment(s))` });
        setSelectedTeeth([]);
        setTreatmentType('');
        setCost('');
        setNotes('');
        await loadStatuses(patientId);
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save treatment plan' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tooth Chart - Treatment Planning
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <ToothChart
            selectedTeeth={selectedTeeth}
            toothStatuses={toothStatuses}
            onToothSelect={handleToothSelect}
            selectable={true}
            showLabels={true}
            numberingSystem="universal"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Treatment Details
            </Typography>

            <TextField
              select
              fullWidth
              size="small"
              label="Patient"
              margin="normal"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              {patients.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </MenuItem>
              ))}
            </TextField>

            {message && (
              <Alert severity={message.type} sx={{ mt: 1 }}>
                {message.text}
              </Alert>
            )}

            {selectedTeeth.length > 0 ? (
              <>
                <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                  Selected Teeth: {[...selectedTeeth].sort((a, b) => a - b).join(', ')}
                </Typography>

                <TextField
                  fullWidth
                  label="Treatment Type"
                  placeholder="e.g., Filling, Crown, Extraction"
                  margin="normal"
                  value={treatmentType}
                  onChange={(e) => setTreatmentType(e.target.value)}
                />

                <TextField
                  fullWidth
                  type="number"
                  label="Cost per tooth"
                  margin="normal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  placeholder="Add treatment notes..."
                  margin="normal"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="contained" fullWidth onClick={handleSave} disabled={saving}>
                    Save Treatment Plan
                  </Button>
                  <Button variant="outlined" onClick={handleClearSelection}>
                    Clear
                  </Button>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Click on teeth to select them for treatment
              </Typography>
            )}
          </Paper>

          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Legend
            </Typography>
            <Typography variant="body2" gutterBottom>
              • Click teeth to select for treatment
            </Typography>
            <Typography variant="body2" gutterBottom>
              • Orange: planned treatment, grey: completed
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
