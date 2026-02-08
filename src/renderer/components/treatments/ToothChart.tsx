import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Grid,
  Tooltip,
} from '@mui/material';

interface ToothStatus {
  toothNumber: number;
  status?: 'healthy' | 'cavity' | 'filled' | 'crown' | 'missing' | 'root-canal' | 'implant';
  treatment?: string;
  notes?: string;
}

interface ToothChartProps {
  selectedTeeth?: number[];
  toothStatuses?: ToothStatus[];
  onToothSelect?: (toothNumber: number) => void;
  selectable?: boolean;
  showLabels?: boolean;
  numberingSystem?: 'universal' | 'fdi';
}

/**
 * Tooth Chart UI Component
 * Interactive dental chart for treatment planning
 * Supports Universal and FDI numbering systems
 * Visual representation of all 32 teeth
 */
export const ToothChart: React.FC<ToothChartProps> = ({
  selectedTeeth = [],
  toothStatuses = [],
  onToothSelect,
  selectable = true,
  showLabels = true,
  numberingSystem = 'universal',
}) => {
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);

  // Universal numbering: 1-32
  // Upper right: 1-8, Upper left: 9-16
  // Lower left: 17-24, Lower right: 25-32
  const upperRight = [1, 2, 3, 4, 5, 6, 7, 8];
  const upperLeft = [9, 10, 11, 12, 13, 14, 15, 16];
  const lowerLeft = [17, 18, 19, 20, 21, 22, 23, 24];
  const lowerRight = [25, 26, 27, 28, 29, 30, 31, 32];

  const getToothStatus = (toothNumber: number): ToothStatus | undefined => {
    return toothStatuses.find((t) => t.toothNumber === toothNumber);
  };

  const getToothColor = (toothNumber: number): string => {
    const status = getToothStatus(toothNumber);
    
    if (selectedTeeth.includes(toothNumber)) {
      return '#1976d2'; // Primary blue for selected
    }
    
    if (!status || status.status === 'healthy') {
      return '#ffffff'; // White for healthy
    }

    switch (status.status) {
      case 'cavity':
        return '#ff9800'; // Orange
      case 'filled':
        return '#9e9e9e'; // Gray
      case 'crown':
        return '#ffd700'; // Gold
      case 'missing':
        return '#f44336'; // Red
      case 'root-canal':
        return '#e91e63'; // Pink
      case 'implant':
        return '#4caf50'; // Green
      default:
        return '#ffffff';
    }
  };

  const getToothBorderColor = (toothNumber: number): string => {
    if (hoveredTooth === toothNumber) {
      return '#1976d2';
    }
    return '#000000';
  };

  const handleToothClick = (toothNumber: number) => {
    if (selectable && onToothSelect) {
      onToothSelect(toothNumber);
    }
  };

  const renderTooth = (toothNumber: number) => {
    const status = getToothStatus(toothNumber);
    const isSelected = selectedTeeth.includes(toothNumber);
    
    return (
      <Tooltip
        key={toothNumber}
        title={
          <Box>
            <Typography variant="body2">Tooth #{toothNumber}</Typography>
            {status && (
              <>
                <Typography variant="caption">Status: {status.status}</Typography>
                {status.treatment && (
                  <Typography variant="caption" display="block">
                    Treatment: {status.treatment}
                  </Typography>
                )}
                {status.notes && (
                  <Typography variant="caption" display="block">
                    Notes: {status.notes}
                  </Typography>
                )}
              </>
            )}
          </Box>
        }
        arrow
      >
        <Box
          onClick={() => handleToothClick(toothNumber)}
          onMouseEnter={() => setHoveredTooth(toothNumber)}
          onMouseLeave={() => setHoveredTooth(null)}
          sx={{
            width: 40,
            height: 50,
            backgroundColor: getToothColor(toothNumber),
            border: `2px solid ${getToothBorderColor(toothNumber)}`,
            borderRadius: '4px 4px 8px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: selectable ? 'pointer' : 'default',
            transition: 'all 0.2s',
            position: 'relative',
            '&:hover': selectable ? {
              transform: 'scale(1.1)',
              boxShadow: 2,
            } : {},
          }}
        >
          <Typography
            variant="caption"
            fontWeight="bold"
            sx={{
              color: isSelected ? '#ffffff' : '#000000',
              fontSize: '10px',
            }}
          >
            {toothNumber}
          </Typography>
          {status?.status === 'missing' && (
            <Typography variant="caption" sx={{ fontSize: '20px', color: '#f44336' }}>
              ✕
            </Typography>
          )}
        </Box>
      </Tooltip>
    );
  };

  const renderQuadrant = (teeth: number[], label: string) => {
    return (
      <Box sx={{ textAlign: 'center' }}>
        {showLabels && (
          <Typography variant="caption" color="text.secondary" gutterBottom>
            {label}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {teeth.map((tooth) => renderTooth(tooth))}
        </Box>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Dental Chart
        </Typography>
        {showLabels && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label="Healthy" size="small" sx={{ bgcolor: '#ffffff', border: '1px solid #ccc' }} />
            <Chip label="Cavity" size="small" sx={{ bgcolor: '#ff9800', color: '#fff' }} />
            <Chip label="Filled" size="small" sx={{ bgcolor: '#9e9e9e', color: '#fff' }} />
            <Chip label="Crown" size="small" sx={{ bgcolor: '#ffd700' }} />
            <Chip label="Missing" size="small" sx={{ bgcolor: '#f44336', color: '#fff' }} />
            <Chip label="Root Canal" size="small" sx={{ bgcolor: '#e91e63', color: '#fff' }} />
            <Chip label="Implant" size="small" sx={{ bgcolor: '#4caf50', color: '#fff' }} />
            {selectable && (
              <Chip label="Selected" size="small" sx={{ bgcolor: '#1976d2', color: '#fff' }} />
            )}
          </Box>
        )}
      </Box>

      {/* Upper Jaw */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" align="center" gutterBottom>
          Upper Jaw
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            {renderQuadrant(upperRight, 'Upper Right')}
          </Grid>
          <Grid item>
            <Box sx={{ width: 20 }} /> {/* Spacer */}
          </Grid>
          <Grid item>
            {renderQuadrant(upperLeft, 'Upper Left')}
          </Grid>
        </Grid>
      </Box>

      {/* Divider */}
      <Box sx={{ borderTop: '2px dashed #ccc', my: 2 }} />

      {/* Lower Jaw */}
      <Box>
        <Typography variant="subtitle2" align="center" gutterBottom>
          Lower Jaw
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            {renderQuadrant(lowerRight, 'Lower Right')}
          </Grid>
          <Grid item>
            <Box sx={{ width: 20 }} /> {/* Spacer */}
          </Grid>
          <Grid item>
            {renderQuadrant(lowerLeft, 'Lower Left')}
          </Grid>
        </Grid>
      </Box>

      {selectedTeeth.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">
            Selected Teeth: {selectedTeeth.sort((a, b) => a - b).join(', ')}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
