import React, { useState } from 'react';
import { Box, Paper, Typography, Button, TextField, Grid } from '@mui/material';
import { ToothChart } from './ToothChart';

/**
 * Tooth Chart Example Component
 * Demonstrates how to use ToothChart in treatment planning
 */
export const ToothChartExample: React.FC = () => {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [toothStatuses] = useState([
    { toothNumber: 3, status: 'cavity' as const, notes: 'Small cavity detected' },
    { toothNumber: 14, status: 'filled' as const, treatment: 'Composite filling' },
    { toothNumber: 19, status: 'crown' as const, treatment: 'Porcelain crown' },
    { toothNumber: 30, status: 'missing' as const, notes: 'Extracted 2 years ago' },
    { toothNumber: 8, status: 'root-canal' as const, treatment: 'Root canal therapy' },
    { toothNumber: 25, status: 'implant' as const, treatment: 'Dental implant' },
  ]);

  const handleToothSelect = (toothNumber: number) => {
    setSelectedTeeth((prev) => {
      if (prev.includes(toothNumber)) {
        return prev.filter((t) => t !== toothNumber);
      } else {
        return [...prev, toothNumber];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedTeeth([]);
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

            {selectedTeeth.length > 0 ? (
              <>
                <Typography variant="body2" gutterBottom>
                  Selected Teeth: {selectedTeeth.sort((a, b) => a - b).join(', ')}
                </Typography>

                <TextField
                  fullWidth
                  label="Treatment Type"
                  placeholder="e.g., Filling, Crown, Extraction"
                  margin="normal"
                />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  placeholder="Add treatment notes..."
                  margin="normal"
                />

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="contained" fullWidth>
                    Add Treatment
                  </Button>
                  <Button variant="outlined" onClick={handleClearSelection}>
                    Clear
                  </Button>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
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
              • Hover to see tooth details
            </Typography>
            <Typography variant="body2" gutterBottom>
              • Colors indicate tooth status
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
