import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Add, Notes } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface ClinicalNote {
  id: string;
  patientId: string;
  noteText: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

interface ClinicalNotesPanelProps {
  patientId: string;
}

/**
 * Clinical Notes Panel Component
 * Display and create clinical notes with rich text
 * Show note history with timestamps
 * Requirements: 13.2, 13.3, 13.5
 */
export const ClinicalNotesPanel: React.FC<ClinicalNotesPanelProps> = ({ patientId }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [patientId]);

  const loadNotes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.getClinicalNotesByPatient(patientId);
      if (response.success && response.data) {
        setNotes(response.data);
      } else {
        setError(response.error || 'Failed to load clinical notes');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setSaving(true);
    setError('');
    try {
      const response = await ipcClient.createClinicalNote(
        {
          patientId,
          noteText: newNote,
        },
        user.id
      );

      if (response.success) {
        setNewNote('');
        loadNotes();
      } else {
        setError(response.error || 'Failed to save note');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Notes color="primary" />
        <Typography variant="h6">Clinical Notes</Typography>
        <Chip label={notes.length} size="small" color="primary" />
      </Box>
      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Add new note */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Add a new clinical note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          disabled={saving}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <Add />}
          onClick={handleAddNote}
          disabled={!newNote.trim() || saving}
        >
          {saving ? 'Saving...' : 'Add Note'}
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Notes history */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : notes.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No clinical notes yet. Add the first note above.
        </Typography>
      ) : (
        <List>
          {notes.map((note, index) => (
            <React.Fragment key={note.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">
                        {note.createdBy}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(note.createdAt)}
                        {note.updatedAt && note.updatedAt !== note.createdAt && (
                          <> (edited: {formatDate(note.updatedAt)})</>
                        )}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        p: 2,
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        mt: 1,
                      }}
                    >
                      {note.noteText}
                    </Typography>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};
