import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import { Search, Close, Add } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface Template {
  id: string;
  code: string;
  description: string;
  category: string;
  defaultCost: number;
  estimatedDuration: number;
}

interface TreatmentTemplateSelectorProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

/**
 * Treatment Template Selector Component
 * Browse and select treatment templates
 * Display template details (code, description, cost, duration)
 * Requirements: 14.2, 14.5, 14.6
 */
export const TreatmentTemplateSelector: React.FC<TreatmentTemplateSelectorProps> = ({
  onSelect,
  onClose,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedCategory, templates]);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.getAllTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
        setFilteredTemplates(response.data);
      } else {
        setError(response.error || 'Failed to load templates');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.code.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const getCategories = (): string[] => {
    const categories = new Set(templates.map((t) => t.category));
    return ['All', ...Array.from(categories).sort()];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Select Treatment Template</Typography>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by code, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {getCategories().map((category) => (
            <Chip
              key={category}
              label={category}
              onClick={() => setSelectedCategory(category)}
              color={selectedCategory === category ? 'primary' : 'default'}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredTemplates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No templates found. Try adjusting your search or filters.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="right">Duration (min)</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTemplates.map((template) => (
                <TableRow key={template.id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{template.code}</Typography>
                  </TableCell>
                  <TableCell>{template.description}</TableCell>
                  <TableCell>
                    <Chip label={template.category} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">${template.defaultCost.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell align="right">{template.estimatedDuration}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => onSelect(template)}
                    >
                      Add
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredTemplates.length} of {templates.length} templates
        </Typography>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Box>
  );
};
