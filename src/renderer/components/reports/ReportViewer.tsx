import React from 'react';
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
  Divider,
  Grid,
} from '@mui/material';

type ReportType = 'daily-appointments' | 'revenue' | 'visit-history' | 'inventory';

interface ReportViewerProps {
  report: any;
  reportType: ReportType;
}

/**
 * Report Viewer Component
 * Display generated reports
 * Add export to PDF and CSV buttons
 * Requirements: 7.6
 */
export const ReportViewer: React.FC<ReportViewerProps> = ({ report, reportType }) => {
  if (!report) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary" align="center">
          No report to display. Generate a report to view it here.
        </Typography>
      </Paper>
    );
  }

  const renderDailyAppointmentsReport = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Daily Appointments Report - {new Date(report.date).toLocaleDateString()}
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography variant="h4">{report.total || 0}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
              <Typography variant="body2">Completed</Typography>
              <Typography variant="h4">{report.completed || 0}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
              <Typography variant="body2">Scheduled</Typography>
              <Typography variant="h4">{report.scheduled || 0}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
              <Typography variant="body2">Cancelled</Typography>
              <Typography variant="h4">{report.cancelled || 0}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {report.appointments && report.appointments.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Dentist</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.appointments.map((apt: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{apt.time}</TableCell>
                    <TableCell>{apt.patientName}</TableCell>
                    <TableCell>{apt.dentistName}</TableCell>
                    <TableCell>{apt.appointmentType}</TableCell>
                    <TableCell>
                      <Chip label={apt.status} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const renderRevenueReport = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Revenue Report
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
        </Typography>

        <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light' }}>
          <Typography variant="body2">Total Revenue</Typography>
          <Typography variant="h3" color="primary.contrastText">
            ${report.totalRevenue?.toFixed(2) || '0.00'}
          </Typography>
        </Paper>

        {report.breakdown && report.breakdown.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{report.groupBy || 'Category'}</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.breakdown.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell align="right">${item.revenue?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="right">{item.count || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const renderVisitHistoryReport = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Patient Visit History
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Patient: {report.patientName}
        </Typography>

        {report.visits && report.visits.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Dentist</TableCell>
                  <TableCell>Treatment</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.visits.map((visit: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(visit.date).toLocaleDateString()}</TableCell>
                    <TableCell>{visit.appointmentType}</TableCell>
                    <TableCell>{visit.dentistName}</TableCell>
                    <TableCell>{visit.treatment || '-'}</TableCell>
                    <TableCell>
                      <Chip label={visit.status} size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">No visit history found</Typography>
        )}
      </Box>
    );
  };

  const renderInventoryReport = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Inventory Report
        </Typography>

        {report.summary && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Total Items</Typography>
                <Typography variant="h4">{report.summary.totalItems || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
                <Typography variant="body2">Low Stock</Typography>
                <Typography variant="h4">{report.summary.lowStockItems || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
                <Typography variant="body2">Total Value</Typography>
                <Typography variant="h4">${report.summary.totalValue?.toFixed(2) || '0.00'}</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {report.items && report.items.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {report.items.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell align="right">{item.currentQuantity} {item.unit}</TableCell>
                    <TableCell align="right">${item.unitCost?.toFixed(2)}</TableCell>
                    <TableCell align="right">${item.totalValue?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status} 
                        size="small" 
                        color={item.status === 'Low Stock' ? 'warning' : 'success'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    );
  };

  const renderReport = () => {
    switch (reportType) {
      case 'daily-appointments':
        return renderDailyAppointmentsReport();
      case 'revenue':
        return renderRevenueReport();
      case 'visit-history':
        return renderVisitHistoryReport();
      case 'inventory':
        return renderInventoryReport();
      default:
        return <Typography>Unknown report type</Typography>;
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      {renderReport()}
    </Paper>
  );
};
