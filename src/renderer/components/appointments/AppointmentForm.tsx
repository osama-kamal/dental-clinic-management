import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface Appointment {
  id?: string;
  patientId: string;
  dentistId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
  status?: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show';
}

interface AppointmentFormProps {
  appointment: Appointment | null;
  onClose: (saved: boolean) => void;
}

/**
 * Appointment Form Component
 * Implements appointment creation and editing
 * Adds conflict detection with error display
 * Requirements: 3.1, 3.2, 3.9
 */
export const AppointmentForm: React.FC<AppointmentFormProps> = ({ appointment, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Appointment>({
    patientId: appointment?.patientId || '',
    dentistId: appointment?.dentistId || user?.id || '',
    appointmentDate: appointment?.appointmentDate || new Date().toISOString().split('T')[0],
    startTime: appointment?.startTime || '09:00',
    endTime: appointment?.endTime || '10:00',
    reason: appointment?.reason || '',
    status: appointment?.status || 'Scheduled',
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentists, setDentists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [conflictError, setConflictError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.dentistId && formData.appointmentDate && formData.startTime && formData.endTime) {
      checkConflicts();
    }
  }, [formData.dentistId, formData.appointmentDate, formData.startTime, formData.endTime]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      // Load patients
      const patientsResponse = await ipcClient.searchPatients({});
      if (patientsResponse.success && patientsResponse.data) {
        setPatients(patientsResponse.data);
      }

      // Load dentists (users with Dentist role)
      // For now, we'll use a placeholder - in real app, you'd have a getUsersByRole endpoint
      setDentists([
        { id: user?.id || '', name: `${user?.firstName} ${user?.lastName}` || 'Current User' },
      ]);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const checkConflicts = async () => {
    if (!formData.dentistId || !formData.appointmentDate || !formData.startTime || !formData.endTime) {
      return;
    }

    try {
      const response = await ipcClient.searchAppointments({
        dentistId: formData.dentistId,
        date: formData.appointmentDate,
      });

      if (response.success && response.data) {
        const existingAppointments = response.data.filter(
          (apt: any) => apt.id !== appointment?.id && apt.status !== 'Cancelled'
        );

        const hasConflict = existingAppointments.some((apt: any) => {
          const existingStart = apt.startTime;
          const existingEnd = apt.endTime;
          const newStart = formData.startTime;
          const newEnd = formData.endTime;

          // Check for time overlap
          return (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          );
        });

        if (hasConflict) {
          setConflictError(
            'Time conflict detected! This dentist already has an appointment during this time.'
          );
        } else {
          setConflictError('');
        }
      }
    } catch (err) {
      // Silently fail conflict check
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Patient is required';
    }
    if (!formData.dentistId) {
      newErrors.dentistId = 'Dentist is required';
    }
    if (!formData.appointmentDate) {
      newErrors.appointmentDate = 'Date is required';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    // Validate time range
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    // Check for conflicts
    if (conflictError) {
      newErrors.conflict = conflictError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Appointment) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
    if (field === 'dentistId' || field === 'appointmentDate' || field === 'startTime' || field === 'endTime') {
      setConflictError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (appointment?.id) {
        response = await ipcClient.updateAppointment(appointment.id, formData);
      } else {
        response = await ipcClient.createAppointment(formData, user.id);
      }

      if (response.success) {
        onClose(true);
      } else {
        setError(response.error || 'Failed to save appointment');
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
        <Typography variant="h4">
          {appointment ? 'Edit Appointment' : 'New Appointment'}
        </Typography>
        <Button variant="outlined" startIcon={<Cancel />} onClick={() => onClose(false)}>
          Cancel
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {conflictError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {conflictError}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.patientId}>
                <InputLabel>Patient</InputLabel>
                <Select
                  value={formData.patientId}
                  onChange={handleChange('patientId') as any}
                  disabled={loading}
                  label="Patient"
                >
                  {patients.map((patient) => (
                    <MenuItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </MenuItem>
                  ))}
                </Select>
                {errors.patientId && (
                  <Typography variant="caption" color="error">
                    {errors.patientId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.dentistId}>
                <InputLabel>Dentist</InputLabel>
                <Select
                  value={formData.dentistId}
                  onChange={handleChange('dentistId') as any}
                  disabled={loading}
                  label="Dentist"
                >
                  {dentists.map((dentist) => (
                    <MenuItem key={dentist.id} value={dentist.id}>
                      {dentist.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.dentistId && (
                  <Typography variant="caption" color="error">
                    {errors.dentistId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Date"
                type="date"
                value={formData.appointmentDate}
                onChange={handleChange('appointmentDate')}
                error={!!errors.appointmentDate}
                helperText={errors.appointmentDate}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
                inputProps={{
                  min: new Date().toISOString().split('T')[0],
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={handleChange('startTime')}
                error={!!errors.startTime}
                helperText={errors.startTime}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="End Time"
                type="time"
                value={formData.endTime}
                onChange={handleChange('endTime')}
                error={!!errors.endTime}
                helperText={errors.endTime}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            {appointment && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={handleChange('status') as any}
                    disabled={loading}
                    label="Status"
                  >
                    <MenuItem value="Scheduled">Scheduled</MenuItem>
                    <MenuItem value="Confirmed">Confirmed</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                    <MenuItem value="No-Show">No-Show</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for Visit"
                value={formData.reason}
                onChange={handleChange('reason')}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => onClose(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  disabled={loading || !!conflictError}
                >
                  {loading ? 'Saving...' : 'Save Appointment'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};
