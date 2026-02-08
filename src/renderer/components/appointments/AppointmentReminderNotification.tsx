import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { Notifications, Close } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface Reminder {
  appointmentId: string;
  patientName: string;
  appointmentDate: string;
  startTime: string;
  dentistName: string;
}

/**
 * Appointment Reminder Notification Component
 * Display reminders 24 hours before appointments
 * Requirements: 3.8
 */
export const AppointmentReminderNotification: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    // Check for reminders on mount
    checkReminders();

    // Check every 5 minutes
    const interval = setInterval(checkReminders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const checkReminders = async () => {
    try {
      const response = await ipcClient.generateReminders();
      if (response.success && response.data && response.data.length > 0) {
        setReminders(response.data);
        setShowSnackbar(true);
      }
    } catch (err) {
      console.error('Failed to check reminders:', err);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDismissReminder = (appointmentId: string) => {
    setReminders(reminders.filter((r) => r.appointmentId !== appointmentId));
  };

  const handleDismissAll = () => {
    setReminders([]);
    setShowSnackbar(false);
    handleMenuClose();
  };

  const formatReminderTime = (date: string, time: string): string => {
    const appointmentDate = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `in ${diffHours} hours`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
  };

  return (
    <>
      {/* Notification Bell Icon */}
      <IconButton color="inherit" onClick={handleMenuOpen}>
        <Badge badgeContent={reminders.length} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      {/* Reminders Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 },
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6">Upcoming Appointments</Typography>
          <Typography variant="caption" color="text.secondary">
            Reminders for appointments in the next 24 hours
          </Typography>
        </Box>
        <Divider />

        {reminders.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No upcoming appointments
            </Typography>
          </MenuItem>
        ) : (
          <>
            <List sx={{ pt: 0 }}>
              {reminders.map((reminder) => (
                <ListItem
                  key={reminder.appointmentId}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDismissReminder(reminder.appointmentId)}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  }
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={reminder.patientName}
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          {new Date(reminder.appointmentDate).toLocaleDateString()} at{' '}
                          {reminder.startTime}
                        </Typography>
                        <Typography variant="caption" color="primary">
                          {formatReminderTime(reminder.appointmentDate, reminder.startTime)}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          with {reminder.dentistName}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Divider />
            <MenuItem onClick={handleDismissAll}>
              <Typography variant="body2" color="primary">
                Dismiss All
              </Typography>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Snackbar Notification */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={10000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity="info"
          variant="filled"
          sx={{ width: '100%' }}
        >
          <AlertTitle>Upcoming Appointments</AlertTitle>
          You have {reminders.length} appointment{reminders.length > 1 ? 's' : ''} in the next 24
          hours
        </Alert>
      </Snackbar>
    </>
  );
};
