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
} from '@mui/material';
import { Add, Edit, Visibility, Search } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';
import { PatientForm } from './PatientForm';
import { PatientDetail } from './PatientDetail';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email?: string;
  allergies?: string;
}

export const PatientList: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.searchPatients({});
      if (response.success && response.data) {
        setPatients(response.data);
      } else {
        setError(response.error || 'Failed to load patients');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadPatients();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.searchPatients({ query: searchQuery });
      if (response.success && response.data) {
        setPatients(response.data);
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = () => {
    setSelectedPatient(null);
    setShowForm(true);
  };

  const handleEditPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowForm(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetail(true);
  };

  const handleFormClose = (saved: boolean) => {
    setShowForm(false);
    setSelectedPatient(null);
    if (saved) {
      loadPatients();
    }
  };

  const handleDetailClose = () => {
    setShowDetail(false);
    setSelectedPatient(null);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (showForm) {
    return <PatientForm patient={selectedPatient} onClose={handleFormClose} />;
  }

  if (showDetail && selectedPatient) {
    return <PatientDetail patient={selectedPatient} onClose={handleDetailClose} />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Patients</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddPatient}>
          Add Patient
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Search by name, phone, email, or patient ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button variant="contained" startIcon={<Search />} onClick={handleSearch}>
            Search
          </Button>
        </Box>
      </Paper>

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
                  <TableCell>Patient ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Date of Birth</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Allergies</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patients
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((patient) => (
                    <TableRow key={patient.id} hover>
                      <TableCell>{patient.id}</TableCell>
                      <TableCell>
                        {patient.firstName} {patient.lastName}
                      </TableCell>
                      <TableCell>{new Date(patient.dateOfBirth).toLocaleDateString()}</TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>{patient.email || '-'}</TableCell>
                      <TableCell>
                        {patient.allergies ? (
                          <Chip label="Has Allergies" color="warning" size="small" />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleViewPatient(patient)}>
                          <Visibility />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleEditPatient(patient)}>
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {patients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No patients found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={patients.length}
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
