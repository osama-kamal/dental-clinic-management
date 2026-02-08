import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Typography,
  Chip,
  TablePagination,
  CircularProgress,
  Alert,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Add, Edit, Visibility, FilterList } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show';
  reason?: string;
}

interface AppointmentListProps {
  onAppointmentClick?: (appointment: Appointment) => void;
  onAddAppointment?: () => void;
  onEditAppointment?: (appointment: Appointment) => void;
}

/**
 * Appointment List Component
 * Display filterable appointment list
 * Support filtering by date range, dentist, status, patient
 * Requirements: 12.2
 */
export const AppointmentList: React.FC<AppointmentListProps> = ({
  onAppointmentClick,
  onAddAppointment,
  onEditAppointment,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: '',
    patientName: '',
    dentistName: '',
  });

  useEffect(() => {
    loadAppointments();
  }, [filters]);

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const searchQuery: any = {};

      if (filters.startDate && filters.endDate) {
        searchQuery.startDate = filters.startDate;
        searchQuery.endDate = filters.endDate;
      }
      if (filters.status) {
        searchQuery.status = filters.status;
      }
      if (filters.patientName) {
        searchQuery.patientName = filters.patientName;
      }
      if (filters.dentistName) {
        searchQuery.dentistName = filters.dentistName;
      }

      const response = await ipcClient.searchAppointments(searchQuery);
      if (response.success && response.data) {
        setAppointments(response.data);
      } else {
        setError(response.error || 'Failed to load appointments');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: keyof typeof filters) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFilters({ ...filters, [field]: event.target.value });
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: '',
      patientName: '',
      dentistName: '',
    });
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'Scheduled':
        return 'info';
      case 'Confirmed':
        return 'success';
      case 'Completed':
        return 'default';
      case 'Cancelled':
        return 'error';
      case 'No-Show':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Appointments</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={onAddAppointment}>
            New Appointment
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={handleFilterChange('status') as any}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Scheduled">Scheduled</MenuItem>
                  <MenuItem value="Confirmed">Confirmed</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                  <MenuItem value="No-Show">No-Show</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Patient Name"
                value={filters.patientName}
                onChange={handleFilterChange('patientName')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Dentist Name"
                value={filters.dentistName}
                onChange={handleFilterChange('dentistName')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} display="flex" justifyContent="flex-end">
              <Button onClick={clearFilters} size="small">
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Dentist</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((appointment) => (
                    <TableRow key={appointment.id} hover>
                      <TableCell>
                        {new Date(appointment.appointmentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {appointment.startTime} - {appointment.endTime}
                      </TableCell>
                      <TableCell>{appointment.patientName}</TableCell>
                      <TableCell>{appointment.dentistName}</TableCell>
                      <TableCell>{appointment.reason || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={appointment.status}
                          color={getStatusColor(appointment.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => onAppointmentClick?.(appointment)}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onEditAppointment?.(appointment)}
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {appointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No appointments found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={appointments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
    </Box>
  );
};
