import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  AttachFile,
  PictureAsPdf,
  Image as ImageIcon,
  Visibility,
  CloudUpload,
  Delete,
} from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';
import { useAuth } from '../../context/AuthContext';

interface Attachment {
  id: string;
  patientId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface AttachmentViewerProps {
  patientId: string;
}

/**
 * Attachment Viewer Component
 * Display attachments inline (JPEG, PNG, PDF)
 * Support file upload
 * Requirements: 13.6, 13.7, 13.8
 */
export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ patientId }) => {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [attachmentData, setAttachmentData] = useState<string | null>(null);

  useEffect(() => {
    loadAttachments();
  }, [patientId]);

  const loadAttachments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.getAttachmentMetadata(patientId);
      if (response.success && response.data) {
        setAttachments(response.data);
      } else {
        setError(response.error || 'Failed to load attachments');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and PDF files are supported');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
        const response = await ipcClient.uploadAttachment(
          {
            patientId,
            filename: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileData: base64Data,
          },
          user.id
        );

        if (response.success) {
          loadAttachments();
        } else {
          setError(response.error || 'Failed to upload file');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Upload error');
      setUploading(false);
    }
  };

  const handleViewAttachment = async (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setViewDialog(true);
    setAttachmentData(null);

    try {
      const response = await ipcClient.getAttachment(attachment.id);
      if (response.success && response.data) {
        setAttachmentData(response.data.fileData);
      } else {
        setError(response.error || 'Failed to load attachment');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const response = await ipcClient.deleteAttachment(attachmentId);
      if (response.success) {
        loadAttachments();
      } else {
        setError(response.error || 'Failed to delete attachment');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') return <PictureAsPdf color="error" />;
    if (fileType.startsWith('image/')) return <ImageIcon color="primary" />;
    return <AttachFile />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachFile color="primary" />
          <Typography variant="h6">Attachments</Typography>
          <Chip label={attachments.length} size="small" color="primary" />
        </Box>
        <Button
          variant="contained"
          component="label"
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </Button>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        Supported formats: JPEG, PNG, PDF (max 10MB)
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : attachments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No attachments yet. Upload files using the button above.
        </Typography>
      ) : (
        <List>
          {attachments.map((attachment, index) => (
            <React.Fragment key={attachment.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                secondaryAction={
                  <Box>
                    <IconButton edge="end" onClick={() => handleViewAttachment(attachment)}>
                      <Visibility />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteAttachment(attachment.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemIcon>{getFileIcon(attachment.fileType)}</ListItemIcon>
                <ListItemText
                  primary={attachment.filename}
                  secondary={
                    <>
                      {formatFileSize(attachment.fileSize)} • Uploaded by {attachment.uploadedBy} on{' '}
                      {formatDate(attachment.uploadedAt)}
                    </>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedAttachment?.filename}</DialogTitle>
        <DialogContent>
          {!attachmentData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedAttachment?.fileType === 'application/pdf' ? (
            <embed
              src={attachmentData}
              type="application/pdf"
              width="100%"
              height="600px"
            />
          ) : (
            <img
              src={attachmentData}
              alt={selectedAttachment?.filename}
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
