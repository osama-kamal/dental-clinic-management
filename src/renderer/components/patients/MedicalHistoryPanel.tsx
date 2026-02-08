import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Alert,
  Grid,
} from '@mui/material';
import { Warning, LocalHospital } from '@mui/icons-material';

interface MedicalHistoryPanelProps {
  medicalHistory?: string;
  allergies?: string;
  medications?: string;
  showCriticalAlert?: boolean;
}

/**
 * Medical History Panel Component
 * Displays medical conditions, medications, and allergies
 * Shows critical condition alerts
 * Requirements: 13.1, 13.4
 */
export const MedicalHistoryPanel: React.FC<MedicalHistoryPanelProps> = ({
  medicalHistory,
  allergies,
  medications,
  showCriticalAlert = false,
}) => {
  // Check for critical conditions in medical history
  const criticalKeywords = [
    'diabetes',
    'heart disease',
    'asthma',
    'epilepsy',
    'hemophilia',
    'pacemaker',
    'blood thinner',
    'severe',
    'critical',
  ];

  const hasCriticalCondition =
    showCriticalAlert ||
    (medicalHistory &&
      criticalKeywords.some((keyword) =>
        medicalHistory.toLowerCase().includes(keyword)
      )) ||
    (allergies &&
      criticalKeywords.some((keyword) => allergies.toLowerCase().includes(keyword)));

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LocalHospital color="primary" />
        <Typography variant="h6">Medical Information</Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {hasCriticalCondition && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Critical Medical Condition Alert
          </Typography>
          <Typography variant="body2">
            This patient has critical medical conditions that require special attention.
            Review medical history and allergies carefully.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Medical History
          </Typography>
          {medicalHistory && medicalHistory.trim().length > 0 ? (
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1,
              }}
            >
              {medicalHistory}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No medical history recorded
            </Typography>
          )}
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Known Allergies
          </Typography>
          {allergies && allergies.trim().length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {allergies.split(',').map((allergy, index) => (
                <Chip
                  key={index}
                  label={allergy.trim()}
                  color="warning"
                  icon={<Warning />}
                  sx={{ fontWeight: 'bold' }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No known allergies
            </Typography>
          )}
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Current Medications
          </Typography>
          {medications && medications.trim().length > 0 ? (
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                p: 2,
                bgcolor: 'background.default',
                borderRadius: 1,
              }}
            >
              {medications}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No current medications
            </Typography>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};
