import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Collapse,
} from '@mui/material';
import { Add, ExpandMore, ExpandLess, Edit } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface Treatment {
  id: string;
  treatmentCode: string;
  description: string;
  tooth?: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  estimatedCost: number;
  actualCost?: number;
  estimatedDuration: number;
  actualDuration?: number;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

interface TreatmentPlan {
  id: string;
  patientId: string;
  createdAt: string;
  createdBy: string;
  totalEstimatedCost: number;
  status: string;
  treatments: Treatment[];
}

interface TreatmentListProps {
  patientId: string;
  onAddPlan?: () => void;
  onUpdateStatus?: (treatment: Treatment) => void;
}

/**
 * Treatment List Component
 * Display patient treatment history
 * Show treatment status and completion details
 * Requirements: 4.3, 4.4, 4.5
 */
export const TreatmentList: React.FC<TreatmentListProps> = ({
  patientId,
  onAddPlan,
  onUpdateStatus,
}) => {
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTreatmentPlans();
  }, [patientId]);

  const loadTreatmentPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.getTreatmentsByPatient(patientId);
      if (response.success && response.data) {
        setTreatmentPlans(response.data);
      } else {
        setError(response.error || 'Failed to load treatment plans');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Treatment['status']) => {
    switch (status) {
      case 'Planned':
        return 'info';
      case 'In Progress':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const togglePlanExpansion = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Treatment History</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={onAddPlan}>
          New Treatment Plan
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : treatmentPlans.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No treatment plans yet. Create the first treatment plan above.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {treatmentPlans.map((plan) => (
            <Paper key={plan.id} sx={{ overflow: 'hidden' }}>
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: 'background.default',
                  cursor: 'pointer',
                }}
                onClick={() => togglePlanExpansion(plan.id)}
              >
                <Box>
                  <Typography variant="h6">
                    Treatment Plan - {formatDate(plan.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created by {plan.createdBy} • {plan.treatments.length} treatment
                    {plan.treatments.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="primary">
                      ${plan.totalEstimatedCost.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Estimated Cost
                    </Typography>
                  </Box>
                  <IconButton>
                    {expandedPlan === plan.id ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>

              <Collapse in={expandedPlan === plan.id}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Tooth</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Est. Cost</TableCell>
                        <TableCell align="right">Actual Cost</TableCell>
                        <TableCell align="right">Duration (min)</TableCell>
                        <TableCell>Completed</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {plan.treatments.map((treatment) => (
                        <TableRow key={treatment.id}>
                          <TableCell>
                            <Typography fontWeight="bold">{treatment.treatmentCode}</Typography>
                          </TableCell>
                          <TableCell>{treatment.description}</TableCell>
                          <TableCell>{treatment.tooth || '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={treatment.status}
                              color={getStatusColor(treatment.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            ${treatment.estimatedCost.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            {treatment.actualCost
                              ? `$${treatment.actualCost.toFixed(2)}`
                              : '-'}
                          </TableCell>
                          <TableCell align="right">
                            {treatment.actualDuration || treatment.estimatedDuration}
                          </TableCell>
                          <TableCell>
                            {treatment.completedAt ? (
                              <Box>
                                <Typography variant="caption" display="block">
                                  {formatDate(treatment.completedAt)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  by {treatment.completedBy}
                                </Typography>
                              </Box>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {treatment.status !== 'Completed' &&
                              treatment.status !== 'Cancelled' && (
                                <IconButton
                                  size="small"
                                  onClick={() => onUpdateStatus?.(treatment)}
                                >
                                  <Edit />
                                </IconButton>
                              )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {plan.treatments.some((t) => t.notes) && (
                  <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Notes:
                    </Typography>
                    {plan.treatments
                      .filter((t) => t.notes)
                      .map((t) => (
                        <Typography key={t.id} variant="body2" sx={{ mb: 1 }}>
                          • {t.treatmentCode}: {t.notes}
                        </Typography>
                      ))}
                  </Box>
                )}
              </Collapse>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};
