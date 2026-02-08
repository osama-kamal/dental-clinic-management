import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface Patient {
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
}

interface PatientFormProps {
  patient: Patient | null;
  onClose: (saved: boolean) => void;
}

export const PatientForm: React.FC<PatientFormProps> = ({ patient, onClose }) => {
  const [formData, setFormData] = useState<Patient>({
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    dateOfBirth: patient?.dateOfBirth || '',
    phone: patient?.phone || '',
    email: patient?.email || '',
    address: patient?.address || '',
    emergencyContact: patient?.emergencyContact || '',
    emergencyPhone: patient?.emergencyPhone || '',
    medicalHistory: patient?.medicalHistory || '',
    allergies: patient?.allergies || '',
    medications: patient?.medications || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Patient) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (patient?.id) {
        response = await ipcClient.updatePatient(patient.id, formData);
      } else {
        response = await ipcClient.createPatient(formData);
      }

      if (response.success) {
        onClose(true);
      } else {
        setError(response.error || 'Failed to save patient');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {patient ? 'Edit Patient' : 'Add New Patient'}
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

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="First Name"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange('dateOfBirth')}
                error={!!errors.dateOfBirth}
                helperText={errors.dateOfBirth}
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Phone"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={handleChange('address')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={formData.emergencyContact}
                onChange={handleChange('emergencyContact')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={formData.emergencyPhone}
                onChange={handleChange('emergencyPhone')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Medical History"
                value={formData.medicalHistory}
                onChange={handleChange('medicalHistory')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Allergies"
                value={formData.allergies}
                onChange={handleChange('allergies')}
                disabled={loading}
                helperText="List any known allergies"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Current Medications"
                value={formData.medications}
                onChange={handleChange('medications')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => onClose(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Patient'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};
