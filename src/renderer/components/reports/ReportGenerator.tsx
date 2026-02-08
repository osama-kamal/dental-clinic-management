import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Assessment, PictureAsPdf, TableChart } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

type ReportType = 'daily-appointments' | 'revenue' | 'visit-history' | 'inventory';

interface ReportGeneratorProps {
  onReportGenerated?: (report: any, reportType: ReportType) => void;
}

/**
 * Report Generator Component
 * Select report type and parameters
 * Generate appointment, revenue, visit history, inventory reports
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ onReportGenerated }) => {
  const [reportType, setReportType] = useState<ReportType>('daily-appointments');
  const [parameters, setParameters] = useState({
    date: new Date().toISOString().split('T')[0],
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'date',
    patientId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<any>(null);

  const handleParameterChange = (field: string, value: any) => {
    setParameters({ ...parameters, [field]: value });
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);

    try {
      let response;

      switch (reportType) {
        case 'daily-appointments':
          response = await ipcClient.getDailyAppointmentReport(parameters.date);
          break;
        case 'revenue':
          response = await ipcClient.getRevenueReport(
            { startDate: parameters.startDate, endDate: parameters.endDate },
            parameters.groupBy
          );
          break;
        case 'visit-history':
          if (!parameters.patientId) {
            setError('Please enter a patient ID');
            setLoading(false);
            return;
          }
          response = await ipcClient.getVisitHistoryReport(parameters.patientId);
          break;
        case 'inventory':
          response = await ipcClient.getInventoryReport();
          break;
        default:
          setError('Invalid report type');
          setLoading(false);
          return;
      }

      if (response.success && response.data) {
        setReport(response.data);
        onReportGenerated?.(response.data, reportType);
      } else {
        setError(response.error || 'Failed to generate report');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;

    try {
      const response = await ipcClient.exportReportToPDF(report, reportType);
      if (response.success) {
        alert('Report exported to PDF successfully');
      } else {
        setError(response.error || 'Failed to export PDF');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleExportCSV = async () => {
    if (!report) return;

    try {
      const response = await ipcClient.exportReportToCSV(report, reportType);
      if (response.success) {
        alert('Report exported to CSV successfully');
      } else {
        setError(response.error || 'Failed to export CSV');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const renderParameterFields = () => {
    switch (reportType) {
      case 'daily-appointments':
        return (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={parameters.date}
              onChange={(e) => handleParameterChange('date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        );

      case 'revenue':
        return (
          <>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={parameters.startDate}
                onChange={(e) => handleParameterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={parameters.endDate}
                onChange={(e) => handleParameterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Group By</InputLabel>
                <Select
                  value={parameters.groupBy}
                  onChange={(e) => handleParameterChange('groupBy', e.target.value)}
                  label="Group By"
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="dentist">Dentist</MenuItem>
                  <MenuItem value="treatment">Treatment Type</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        );

      case 'visit-history':
        return (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Patient ID"
              value={parameters.patientId}
              onChange={(e) => handleParameterChange('patientId', e.target.value)}
              placeholder="Enter patient ID"
            />
          </Grid>
        );

      case 'inventory':
        return (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              No parameters required for inventory report
            </Typography>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Report Generator
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Generate and export various reports
      </Typography>

      {error && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Report Type</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                label="Report Type"
              >
                <MenuItem value="daily-appointments">Daily Appointments Report</MenuItem>
                <MenuItem value="revenue">Revenue Report</MenuItem>
                <MenuItem value="visit-history">Patient Visit History</MenuItem>
                <MenuItem value="inventory">Inventory Report</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {renderParameterFields()}

          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Assessment />}
              onClick={handleGenerateReport}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {report && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Report Generated</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={handleExportPDF}
              >
                Export PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<TableChart />}
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
            </Box>
          </Box>
          <Alert severity="success">
            Report generated successfully. Use the export buttons to save the report.
          </Alert>
        </Paper>
      )}
    </Box>
  );
};
