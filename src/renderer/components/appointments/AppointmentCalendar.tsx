import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Add,
  CalendarMonth,
} from '@mui/icons-material';
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

type ViewMode = 'day' | 'week' | 'month';

interface AppointmentCalendarProps {
  onAppointmentClick?: (appointment: Appointment) => void;
  onAddAppointment?: () => void;
}

/**
 * Appointment Calendar Component
 * Implements calendar view with daily, weekly, monthly options
 * Color-codes appointments by status
 * Requirements: 3.4, 3.5
 */
export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  onAppointmentClick,
  onAddAppointment,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [currentDate, viewMode]);

  const loadAppointments = async () => {
    setLoading(true);
    setError('');
    try {
      const { startDate, endDate } = getDateRange();
      const response = await ipcClient.getAppointmentsByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );

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

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day;
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(diff + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    return { startDate: start, endDate: end };
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'Scheduled':
        return '#2196f3'; // Blue
      case 'Confirmed':
        return '#4caf50'; // Green
      case 'Completed':
        return '#9e9e9e'; // Gray
      case 'Cancelled':
        return '#f44336'; // Red
      case 'No-Show':
        return '#ff9800'; // Orange
      default:
        return '#757575';
    }
  };

  const formatDateHeader = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else if (viewMode === 'week') {
      const { startDate, endDate } = getDateRange();
      return `${startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
  };

  const renderDayView = () => {
    const dayAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      return aptDate.toDateString() === currentDate.toDateString();
    });

    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

    return (
      <Box sx={{ overflowY: 'auto', maxHeight: 600 }}>
        {hours.map((hour) => {
          const hourAppointments = dayAppointments.filter((apt) => {
            const startHour = parseInt(apt.startTime.split(':')[0]);
            return startHour === hour;
          });

          return (
            <Box
              key={hour}
              sx={{
                display: 'flex',
                borderBottom: '1px solid',
                borderColor: 'divider',
                minHeight: 60,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  p: 1,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {hour}:00
                </Typography>
              </Box>
              <Box sx={{ flex: 1, p: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {hourAppointments.map((apt) => (
                  <Tooltip
                    key={apt.id}
                    title={`${apt.patientName} - ${apt.dentistName}`}
                  >
                    <Chip
                      label={`${apt.startTime} - ${apt.patientName}`}
                      onClick={() => onAppointmentClick?.(apt)}
                      sx={{
                        bgcolor: getStatusColor(apt.status),
                        color: 'white',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderWeekView = () => {
    const { startDate } = getDateRange();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      return day;
    });

    return (
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
        {weekDays.map((day) => {
          const dayAppointments = appointments.filter((apt) => {
            const aptDate = new Date(apt.appointmentDate);
            return aptDate.toDateString() === day.toDateString();
          });

          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <Paper
              key={day.toISOString()}
              sx={{
                minWidth: 150,
                flex: 1,
                p: 2,
                bgcolor: isToday ? 'primary.light' : 'background.paper',
              }}
            >
              <Typography
                variant="subtitle2"
                align="center"
                sx={{ mb: 1, fontWeight: isToday ? 'bold' : 'normal' }}
              >
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                {day.getDate()}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {dayAppointments.map((apt) => (
                  <Chip
                    key={apt.id}
                    label={`${apt.startTime} ${apt.patientName}`}
                    size="small"
                    onClick={() => onAppointmentClick?.(apt)}
                    sx={{
                      bgcolor: getStatusColor(apt.status),
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      '&:hover': { opacity: 0.8 },
                    }}
                  />
                ))}
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
        }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Box key={day} sx={{ p: 1, textAlign: 'center', fontWeight: 'bold' }}>
            <Typography variant="caption">{day}</Typography>
          </Box>
        ))}
        {days.map((day, index) => {
          if (!day) {
            return <Box key={`empty-${index}`} />;
          }

          const dayAppointments = appointments.filter((apt) => {
            const aptDate = new Date(apt.appointmentDate);
            return aptDate.toDateString() === day.toDateString();
          });

          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <Paper
              key={day.toISOString()}
              sx={{
                p: 1,
                minHeight: 80,
                bgcolor: isToday ? 'primary.light' : 'background.paper',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => {
                setCurrentDate(day);
                setViewMode('day');
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: isToday ? 'bold' : 'normal', mb: 0.5 }}
              >
                {day.getDate()}
              </Typography>
              {dayAppointments.length > 0 && (
                <Chip
                  label={dayAppointments.length}
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Paper>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarMonth color="primary" fontSize="large" />
          <Typography variant="h4">Appointments</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={onAddAppointment}>
          New Appointment
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={navigatePrevious}>
              <ChevronLeft />
            </IconButton>
            <Button startIcon={<Today />} onClick={goToToday} variant="outlined" size="small">
              Today
            </Button>
            <IconButton onClick={navigateNext}>
              <ChevronRight />
            </IconButton>
          </Box>

          <Typography variant="h6">{formatDateHeader()}</Typography>

          <ButtonGroup>
            <Button
              variant={viewMode === 'day' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </ButtonGroup>
        </Box>

        {/* Status Legend */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show'] as const).map(
            (status) => (
              <Chip
                key={status}
                label={status}
                size="small"
                sx={{
                  bgcolor: getStatusColor(status),
                  color: 'white',
                }}
              />
            )
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </>
        )}
      </Paper>
    </Box>
  );
};
