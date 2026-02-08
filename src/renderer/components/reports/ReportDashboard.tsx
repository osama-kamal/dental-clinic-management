import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  CalendarToday,
  People,
  AttachMoney,
  Assignment,
  Inventory,
} from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface DashboardAnalytics {
  dailyRevenue: number;
  appointmentCount: number;
  pendingTreatments: number;
  totalPatients: number;
  lowStockItems: number;
  completedAppointments: number;
}

interface KPIData {
  averageTreatmentValue: number;
  patientRetentionRate: number;
  appointmentUtilization: number;
}

/**
 * Report Dashboard Component
 * Display KPI overview (daily revenue, appointment count, pending treatments)
 * Show key performance indicators
 * Requirements: 7.7, 7.8
 */
export const ReportDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load dashboard analytics
      const analyticsResponse = await ipcClient.getDashboardAnalytics(today);
      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
      }

      // Load KPIs
      const kpiResponse = await ipcClient.getKPIs({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: today,
      });
      if (kpiResponse.success && kpiResponse.data) {
        setKpis(kpiResponse.data);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Overview of today's activities and key performance indicators
      </Typography>

      {/* Today's Metrics */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Today's Metrics
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Daily Revenue
                  </Typography>
                  <Typography variant="h5" color="primary">
                    ${analytics?.dailyRevenue.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CalendarToday color="info" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Appointments
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {analytics?.appointmentCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics?.completedAppointments || 0} completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assignment color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Treatments
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {analytics?.pendingTreatments || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="success" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Patients
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {analytics?.totalPatients || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Inventory color="error" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Low Stock Items
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {analytics?.lowStockItems || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Key Performance Indicators */}
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Key Performance Indicators (Last 30 Days)
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUp color="primary" sx={{ mr: 1 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Average Treatment Value
              </Typography>
            </Box>
            <Typography variant="h4" color="primary">
              ${kpis?.averageTreatmentValue.toFixed(2) || '0.00'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Per treatment plan
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People color="success" sx={{ mr: 1 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Patient Retention Rate
              </Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {kpis?.patientRetentionRate.toFixed(1) || '0.0'}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Returning patients
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarToday color="info" sx={{ mr: 1 }} />
              <Typography variant="subtitle1" fontWeight="bold">
                Appointment Utilization
              </Typography>
            </Box>
            <Typography variant="h4" color="info.main">
              {kpis?.appointmentUtilization.toFixed(1) || '0.0'}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Scheduled vs available slots
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="body2" color="text.secondary" align="center">
        Use the Reports section to generate detailed reports and export data
      </Typography>
    </Box>
  );
};
