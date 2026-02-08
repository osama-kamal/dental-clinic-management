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
import { Add, Edit, History, Warning, FilterList } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface InventoryItem {
  id: string;
  itemName: string;
  category: string;
  currentQuantity: number;
  minimumThreshold: number;
  unitCost: number;
  unit: string;
  supplier?: string;
  lastRestocked?: string;
}

interface InventoryListProps {
  onAddItem?: () => void;
  onEditItem?: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  onAdjustStock?: (item: InventoryItem) => void;
}

/**
 * Inventory List Component
 * Display searchable inventory with filters
 * Show low stock warnings prominently
 * Requirements: 6.3, 6.8
 */
export const InventoryList: React.FC<InventoryListProps> = ({
  onAddItem,
  onEditItem,
  onViewHistory,
  onAdjustStock,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    itemName: '',
    category: '',
    stockLevel: '', // 'all', 'low', 'normal'
  });

  useEffect(() => {
    loadInventory();
  }, [filters]);

  const loadInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.searchInventory(filters);
      if (response.success && response.data) {
        setItems(response.data);
      } else {
        setError(response.error || 'Failed to load inventory');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = (item: InventoryItem): boolean => {
    return item.currentQuantity <= item.minimumThreshold;
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.currentQuantity === 0) return 'error';
    if (isLowStock(item)) return 'warning';
    return 'success';
  };

  const getStockStatusLabel = (item: InventoryItem) => {
    if (item.currentQuantity === 0) return 'Out of Stock';
    if (isLowStock(item)) return 'Low Stock';
    return 'In Stock';
  };

  const calculateValue = (item: InventoryItem): number => {
    return item.currentQuantity * item.unitCost;
  };

  const filteredItems = items.filter((item) => {
    if (filters.stockLevel === 'low' && !isLowStock(item)) return false;
    if (filters.stockLevel === 'normal' && isLowStock(item)) return false;
    return true;
  });

  const lowStockCount = items.filter(isLowStock).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Inventory Management</Typography>
          {lowStockCount > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning />
                <Typography>
                  {lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low on stock
                </Typography>
              </Box>
            </Alert>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={onAddItem}>
            Add Item
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Item Name"
                value={filters.itemName}
                onChange={(e) => setFilters({ ...filters, itemName: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  <MenuItem value="Dental Materials">Dental Materials</MenuItem>
                  <MenuItem value="Instruments">Instruments</MenuItem>
                  <MenuItem value="Medications">Medications</MenuItem>
                  <MenuItem value="Consumables">Consumables</MenuItem>
                  <MenuItem value="Equipment">Equipment</MenuItem>
                  <MenuItem value="Office Supplies">Office Supplies</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Stock Level</InputLabel>
                <Select
                  value={filters.stockLevel}
                  onChange={(e) => setFilters({ ...filters, stockLevel: e.target.value })}
                  label="Stock Level"
                >
                  <MenuItem value="">All Items</MenuItem>
                  <MenuItem value="low">Low Stock Only</MenuItem>
                  <MenuItem value="normal">Normal Stock Only</MenuItem>
                </Select>
              </FormControl>
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
                  <TableCell>Item Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Min. Threshold</TableCell>
                  <TableCell align="right">Unit Cost</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((item) => (
                    <TableRow 
                      key={item.id} 
                      hover
                      sx={{ 
                        backgroundColor: isLowStock(item) ? 'rgba(255, 152, 0, 0.08)' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isLowStock(item) && <Warning color="warning" fontSize="small" />}
                          <Typography fontWeight={isLowStock(item) ? 'bold' : 'normal'}>
                            {item.itemName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          fontWeight={isLowStock(item) ? 'bold' : 'normal'}
                          color={item.currentQuantity === 0 ? 'error' : 'inherit'}
                        >
                          {item.currentQuantity} {item.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.minimumThreshold} {item.unit}</TableCell>
                      <TableCell align="right">${item.unitCost.toFixed(2)}</TableCell>
                      <TableCell align="right">${calculateValue(item).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStockStatusLabel(item)} 
                          color={getStockStatusColor(item)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => onEditItem?.(item)} title="Edit">
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => onAdjustStock?.(item)}
                          title="Adjust Stock"
                        >
                          <Add />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => onViewHistory?.(item)}
                          title="View History"
                        >
                          <History />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary">No inventory items found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredItems.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </Paper>
      )}
    </Box>
  );
};
