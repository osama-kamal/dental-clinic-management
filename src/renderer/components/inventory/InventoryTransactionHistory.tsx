import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Box,
  Paper,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { ipcClient } from '../../api/ipcClient';

interface Transaction {
  id: string;
  transactionType: string;
  quantityChange: number;
  quantityAfter: number;
  reason: string;
  transactionDate: string;
  userId: string;
  userName?: string;
}

interface InventoryItem {
  id: string;
  itemName: string;
  currentQuantity: number;
  unit: string;
}

interface InventoryTransactionHistoryProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Inventory Transaction History Component
 * Display transaction log for each item
 * Show transaction type, quantity change, reason, user
 * Requirements: 6.2, 6.5
 */
export const InventoryTransactionHistory: React.FC<InventoryTransactionHistoryProps> = ({ 
  item, 
  open, 
  onClose 
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item && open) {
      loadTransactionHistory();
    }
  }, [item, open]);

  const loadTransactionHistory = async () => {
    if (!item) return;

    setLoading(true);
    setError('');
    try {
      const response = await ipcClient.getInventoryTransactionHistory(item.id);
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        setError(response.error || 'Failed to load transaction history');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'Purchase':
      case 'Restock':
      case 'Adjustment':
        return 'success';
      case 'Usage':
      case 'Damage':
      case 'Expired':
        return 'error';
      case 'Transfer':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatQuantityChange = (change: number): string => {
    return change > 0 ? `+${change}` : `${change}`;
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Transaction History</Typography>
            <Typography variant="body2" color="text.secondary">
              {item.itemName} - Current Stock: {item.currentQuantity} {item.unit}
            </Typography>
          </Box>
          <Button startIcon={<Close />} onClick={onClose}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">After</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {new Date(transaction.transactionDate).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.transactionType} 
                        color={getTransactionTypeColor(transaction.transactionType)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        color={transaction.quantityChange > 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {formatQuantityChange(transaction.quantityChange)} {item.unit}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {transaction.quantityAfter} {item.unit}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {transaction.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {transaction.userName || transaction.userId}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">No transaction history</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
