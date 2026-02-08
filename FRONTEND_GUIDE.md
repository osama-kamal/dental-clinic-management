# Frontend Development Guide

## Overview

This guide explains the frontend architecture of the Dental Clinic Management System and how to extend it with new features.

## Architecture

### Technology Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Material-UI (MUI)** - Component library
- **Electron** - Desktop application framework

### Project Structure

```
src/renderer/
├── api/
│   └── ipcClient.ts          # IPC communication wrapper
├── components/
│   ├── auth/
│   │   └── LoginScreen.tsx   # Authentication UI
│   ├── layout/
│   │   └── AppShell.tsx      # Main application layout
│   └── patients/             # Patient management (COMPLETE EXAMPLE)
│       ├── PatientList.tsx   # List view with search & pagination
│       ├── PatientForm.tsx   # Create/edit form
│       └── PatientDetail.tsx # Detail view
├── context/
│   └── AuthContext.tsx       # Authentication state management
├── App.tsx                   # Main application component
└── main.tsx                  # Application entry point
```

## Key Components

### 1. IPC Client (`src/renderer/api/ipcClient.ts`)

Type-safe wrapper for communicating with the Electron main process.

**Usage Example:**
```typescript
import { ipcClient } from '../api/ipcClient';

// Call backend service
const response = await ipcClient.createPatient(patientData);
if (response.success) {
  console.log('Patient created:', response.data);
} else {
  console.error('Error:', response.error);
}
```

**Available Methods:**
- Authentication: `login`, `logout`, `validateSession`, `createUser`, `changePassword`
- Patients: `createPatient`, `getPatient`, `updatePatient`, `deletePatient`, `searchPatients`
- Appointments: `createAppointment`, `getAppointment`, `updateAppointment`, `cancelAppointment`, `searchAppointments`
- Treatments: `createTreatmentPlan`, `getTreatmentPlan`, `updateTreatmentStatus`, `completeTreatment`
- Billing: `createInvoice`, `getInvoice`, `recordPayment`, `applyDiscount`, `generateInvoicePDF`
- Inventory: `createInventoryItem`, `getInventoryItem`, `updateInventoryItem`, `adjustInventoryQuantity`
- Reports: `getDailyAppointmentReport`, `getRevenueReport`, `getVisitHistoryReport`, `getDashboardAnalytics`
- Clinical Notes: `createClinicalNote`, `getClinicalNote`, `updateClinicalNote`, `getClinicalNotesByPatient`
- Attachments: `uploadAttachment`, `getAttachment`, `getAttachmentsByPatient`

### 2. Authentication Context (`src/renderer/context/AuthContext.tsx`)

Manages user authentication state and permissions.

**Usage Example:**
```typescript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  if (!hasPermission('patients:write')) {
    return <div>Access denied</div>;
  }

  return <div>Welcome, {user.firstName}!</div>;
}
```

**Role-Based Permissions:**
- **Administrator**: All permissions
- **Dentist**: patients, appointments, treatments, clinical notes (read/write)
- **Receptionist**: patients (basic), appointments, billing (read/write)

### 3. App Shell (`src/renderer/components/layout/AppShell.tsx`)

Main application layout with navigation sidebar and header.

**Features:**
- Responsive drawer navigation
- Role-based menu visibility
- User profile menu
- Page title display

### 4. Patient Management (Complete Example)

The patient management module demonstrates the complete pattern for building feature modules.

#### PatientList Component
- Displays paginated table of patients
- Search functionality with real-time filtering
- Action buttons (view, edit)
- Allergy warning indicators

#### PatientForm Component
- Create and edit patients
- Form validation
- Error handling
- Loading states

#### PatientDetail Component
- Complete patient information display
- Allergy warnings
- Medical history
- Placeholder sections for related data (appointments, treatments)

## How to Add New Features

### Step 1: Create Component Files

Create a new folder under `src/renderer/components/` for your feature:

```
src/renderer/components/appointments/
├── AppointmentList.tsx
├── AppointmentForm.tsx
├── AppointmentCalendar.tsx
└── AppointmentDetail.tsx
```

### Step 2: Follow the Pattern

Use the patient management components as a reference:

1. **List Component**: Display data in a table with search and pagination
2. **Form Component**: Create/edit forms with validation
3. **Detail Component**: Display complete information with related data

### Step 3: Use IPC Client

All backend communication goes through the IPC client:

```typescript
import { ipcClient } from '../../api/ipcClient';

const response = await ipcClient.createAppointment(appointmentData, userId);
```

### Step 4: Handle Loading and Errors

Always handle loading states and errors:

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

try {
  setLoading(true);
  const response = await ipcClient.someMethod();
  if (response.success) {
    // Handle success
  } else {
    setError(response.error || 'Operation failed');
  }
} catch (err) {
  setError('Connection error');
} finally {
  setLoading(false);
}
```

### Step 5: Add to Navigation

Update `src/renderer/App.tsx` to add your new component:

```typescript
// Import your component
import { AppointmentList } from './components/appointments/AppointmentList';

// Add to renderPage function
const renderPage = () => {
  switch (currentPage) {
    case 'appointments':
      return <AppointmentList />;
    // ... other cases
  }
};
```

The navigation menu in AppShell will automatically show the link based on user permissions.

## Common Patterns

### 1. Data Fetching

```typescript
useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  setLoading(true);
  try {
    const response = await ipcClient.getData();
    if (response.success) {
      setData(response.data);
    }
  } finally {
    setLoading(false);
  }
};
```

### 2. Form Submission

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validate()) return;
  
  setLoading(true);
  try {
    const response = await ipcClient.saveData(formData);
    if (response.success) {
      onClose(true); // Close form and refresh parent
    } else {
      setError(response.error);
    }
  } finally {
    setLoading(false);
  }
};
```

### 3. Search with Debouncing

```typescript
const [searchQuery, setSearchQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery) {
      performSearch(searchQuery);
    }
  }, 300);
  
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### 4. Pagination

```typescript
const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(10);

<TablePagination
  rowsPerPageOptions={[10, 25, 50, 100]}
  component="div"
  count={data.length}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={(_, newPage) => setPage(newPage)}
  onRowsPerPageChange={(e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  }}
/>
```

## Material-UI Components

Common MUI components used in this project:

- **Layout**: `Box`, `Container`, `Grid`, `Paper`, `Divider`
- **Typography**: `Typography`, `Chip`
- **Inputs**: `TextField`, `Button`, `IconButton`, `Select`, `Checkbox`
- **Data Display**: `Table`, `TableContainer`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TablePagination`
- **Feedback**: `Alert`, `CircularProgress`, `Snackbar`
- **Navigation**: `Drawer`, `AppBar`, `Toolbar`, `Menu`, `MenuItem`

## Best Practices

1. **Type Safety**: Always define TypeScript interfaces for your data
2. **Error Handling**: Handle all possible error states
3. **Loading States**: Show loading indicators for async operations
4. **Validation**: Validate forms before submission
5. **Accessibility**: Use semantic HTML and ARIA labels
6. **Responsive Design**: Use MUI's Grid system for responsive layouts
7. **Code Reuse**: Extract common patterns into reusable components
8. **Permissions**: Check user permissions before showing sensitive UI

## Testing

When implementing new features, ensure:

1. All IPC calls work correctly
2. Forms validate properly
3. Error messages display correctly
4. Loading states work
5. Pagination works with large datasets
6. Search functionality works
7. Role-based access control is enforced

## Next Steps

The following modules need to be implemented following the patient management pattern:

- **Task 21**: Appointment scheduling UI (calendar view, conflict detection)
- **Task 22**: Treatment planning UI (template selection, cost calculation)
- **Task 23**: Billing and invoicing UI (invoice generation, payment recording)
- **Task 24**: Inventory management UI (stock tracking, low stock warnings)
- **Task 25**: Reports and analytics UI (dashboard, report generation, export)

Each module should follow the same structure as the patient management module for consistency.

## Support

For questions or issues:
1. Review the patient management components as reference
2. Check the IPC client for available backend methods
3. Refer to Material-UI documentation: https://mui.com/
4. Check the design document in `.kiro/specs/dental-clinic-management/design.md`
