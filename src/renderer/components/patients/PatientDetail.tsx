import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import { ArrowBack, Edit, Warning } from '@mui/icons-material';

interface Patient {
  id: string;
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

interface PatientDetailProps {
  patient: Patient;
  onClose: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onClose }) => {
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={onClose}>
            Back
          </Button>
          <Typography variant="h4">
            {patient.firstName} {patient.lastName}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Edit />}>
          Edit
        </Button>
      </Box>

      {patient.allergies && (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Allergy Warning
          </Typography>
          <Typography>{patient.allergies}</Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Patient ID
                </Typography>
                <Typography variant="body1">{patient.id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Date of Birth
                </Typography>
                <Typography variant="body1">
                  {new Date(patient.dateOfBirth).toLocaleDateString()} ({calculateAge(patient.dateOfBirth)} years)
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body1">{patient.phone}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1">{patient.email || '-'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1">{patient.address || '-'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Emergency Contact
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Contact Name
                </Typography>
                <Typography variant="body1">{patient.emergencyContact || '-'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Contact Phone
                </Typography>
                <Typography variant="body1">{patient.emergencyPhone || '-'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Medical Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Medical History
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {patient.medicalHistory || 'No medical history recorded'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Allergies
                </Typography>
                {patient.allergies ? (
                  <Chip label={patient.allergies} color="warning" />
                ) : (
                  <Typography variant="body1">No known allergies</Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current Medications
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {patient.medications || 'No current medications'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Treatment History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography color="text.secondary">
              Treatment history will be displayed here (Task 22)
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Appointments
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography color="text.secondary">
              Appointment history will be displayed here (Task 21)
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
