import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppShell } from './components/layout/AppShell';
import { PatientList } from './components/patients/PatientList';
import { AppointmentCalendar } from './components/appointments/AppointmentCalendar';
import { TreatmentList } from './components/treatments/TreatmentList';
import { ToothChartExample } from './components/treatments/ToothChartExample';
import { InvoiceList } from './components/billing/InvoiceList';
import { InvoiceForm } from './components/billing/InvoiceForm';
import { InvoicePreview } from './components/billing/InvoicePreview';
import { PaymentForm } from './components/billing/PaymentForm';
import { InventoryList } from './components/inventory/InventoryList';
import { InventoryForm } from './components/inventory/InventoryForm';
import { StockAdjustmentForm } from './components/inventory/StockAdjustmentForm';
import { InventoryTransactionHistory } from './components/inventory/InventoryTransactionHistory';
import { ReportDashboard } from './components/reports/ReportDashboard';
import { ReportGenerator } from './components/reports/ReportGenerator';
import { ReportViewer } from './components/reports/ReportViewer';
import { Box, Typography } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Placeholder components for other modules
const Dashboard = () => <ReportDashboard />;

const Appointments = () => <AppointmentCalendar />;

const Treatments = () => <ToothChartExample />;

const Billing = () => {
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);

  const handleAddInvoice = () => {
    setShowInvoiceForm(true);
  };

  const handleCloseInvoiceForm = (saved: boolean) => {
    setShowInvoiceForm(false);
    if (saved) {
      // Refresh invoice list
    }
  };

  const handleViewInvoice = (invoice: any) => {
    setSelectedInvoiceId(invoice.id);
    setShowInvoicePreview(true);
  };

  const handleCloseInvoicePreview = () => {
    setShowInvoicePreview(false);
    setSelectedInvoiceId(null);
  };

  const handleRecordPayment = (invoice: any) => {
    setSelectedInvoiceForPayment(invoice);
  };

  const handleClosePaymentForm = (updated: boolean) => {
    setSelectedInvoiceForPayment(null);
    if (updated) {
      // Refresh invoice list
    }
  };

  if (showInvoiceForm) {
    return <InvoiceForm onClose={handleCloseInvoiceForm} />;
  }

  return (
    <>
      <InvoiceList
        onAddInvoice={handleAddInvoice}
        onViewInvoice={handleViewInvoice}
        onRecordPayment={handleRecordPayment}
      />
      <InvoicePreview
        invoiceId={selectedInvoiceId}
        open={showInvoicePreview}
        onClose={handleCloseInvoicePreview}
      />
      <PaymentForm
        invoice={selectedInvoiceForPayment}
        open={!!selectedInvoiceForPayment}
        onClose={handleClosePaymentForm}
      />
    </>
  );
};

const Inventory = () => {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [itemForHistory, setItemForHistory] = useState<any>(null);

  const handleAddItem = () => {
    setSelectedItem(null);
    setShowItemForm(true);
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setShowItemForm(true);
  };

  const handleCloseItemForm = (saved: boolean) => {
    setShowItemForm(false);
    setSelectedItem(null);
    if (saved) {
      // Refresh inventory list
    }
  };

  const handleAdjustStock = (item: any) => {
    setSelectedItem(item);
    setShowAdjustmentForm(true);
  };

  const handleCloseAdjustmentForm = (updated: boolean) => {
    setShowAdjustmentForm(false);
    setSelectedItem(null);
    if (updated) {
      // Refresh inventory list
    }
  };

  const handleViewHistory = (item: any) => {
    setItemForHistory(item);
    setShowHistory(true);
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
    setItemForHistory(null);
  };

  return (
    <>
      <InventoryList
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onAdjustStock={handleAdjustStock}
        onViewHistory={handleViewHistory}
      />
      <InventoryForm
        item={selectedItem}
        open={showItemForm}
        onClose={handleCloseItemForm}
      />
      <StockAdjustmentForm
        item={selectedItem}
        open={showAdjustmentForm}
        onClose={handleCloseAdjustmentForm}
      />
      <InventoryTransactionHistory
        item={itemForHistory}
        open={showHistory}
        onClose={handleCloseHistory}
      />
    </>
  );
};

const Reports = () => {
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [reportType, setReportType] = useState<any>(null);

  const handleReportGenerated = (report: any, type: any) => {
    setGeneratedReport(report);
    setReportType(type);
  };

  return (
    <Box>
      <ReportGenerator onReportGenerated={handleReportGenerated} />
      {generatedReport && reportType && (
        <ReportViewer report={generatedReport} reportType={reportType} />
      )}
    </Box>
  );
};

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'patients':
        return <PatientList />;
      case 'appointments':
        return <Appointments />;
      case 'treatments':
        return <Treatments />;
      case 'billing':
        return <Billing />;
      case 'inventory':
        return <Inventory />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppShell currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
