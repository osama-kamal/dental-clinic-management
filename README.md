# Dental Clinic Management System

**Production-ready offline desktop application for dental clinic management**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/dental-clinic-management)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE.txt)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/yourusername/dental-clinic-management)

## Overview

A comprehensive, offline-first desktop application built with Electron, React, and TypeScript for managing dental clinic operations. Features include patient management, appointment scheduling, treatment planning with interactive tooth chart, billing, inventory management, and analytics.

## Key Features

### 🦷 Patient Management
- Complete patient records with medical history
- Allergy warnings and critical condition alerts
- Clinical notes with modification history
- Document attachments (JPEG, PNG, PDF)
- Advanced search and filtering

### 📅 Appointment Scheduling
- Interactive calendar (day/week/month views)
- Real-time conflict detection
- Color-coded status indicators
- Automated reminders (24 hours before)
- Comprehensive filtering options

### 🔬 Treatment Planning
- Interactive tooth chart (32 teeth)
- Treatment template library
- Automatic cost calculation
- Status tracking (Planned → In Progress → Completed)
- Complete treatment history

### 💰 Billing & Invoicing
- Automated invoice generation
- Multiple payment methods
- Discount management with authorization
- PDF export for printing
- Payment history tracking

### 📦 Inventory Management
- Real-time stock tracking
- Low stock warnings
- Transaction history
- Stock adjustment with authorization
- Category-based organization

### 📊 Reports & Analytics
- Dashboard with KPIs
- Daily appointment reports
- Revenue analysis
- Patient visit history
- Inventory reports
- PDF/CSV export

### 🔒 Security & Access Control
- Role-based permissions (Administrator, Dentist, Receptionist)
- Bcrypt password hashing
- Session management (30-minute timeout)
- Audit trail for all actions

### 💾 Data Management
- Automatic daily backups
- 30-day backup retention
- Database integrity checks
- Easy restore functionality
- SQLite with WAL mode

## Technology Stack

- **Frontend**: React 18, TypeScript, Material-UI
- **Backend**: Electron, Node.js
- **Database**: SQLite (better-sqlite3)
- **Testing**: Jest, fast-check (Property-Based Testing)
- **Build**: Vite, electron-builder

## System Requirements

### Minimum
- Windows 10 (64-bit) or Windows 11
- 4GB RAM
- 500MB free disk space
- 1366x768 screen resolution
- Intel Core i3 or equivalent

### Recommended
- Windows 11 (64-bit)
- 8GB RAM
- 2GB free disk space
- 1920x1080 screen resolution
- Intel Core i5 or equivalent
- SSD for better performance

## Installation

### For End Users

1. Download the installer: `Dental-Clinic-Management-Setup-1.0.0.exe`
2. Run the installer and follow the prompts
3. Launch the application
4. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`
5. **Change the password immediately**

For detailed installation instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

### For Developers

```bash
# Clone repository
git clone <repository-url>
cd dental-clinic-management

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for Windows
npm run package:win

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Development

### Project Structure

```
dental-clinic-management/
├── src/
│   ├── main/              # Electron main process
│   │   ├── ipc/           # IPC handlers
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Authentication middleware
│   │   └── utils/         # Utilities
│   ├── renderer/          # React frontend
│   │   ├── components/    # UI components
│   │   ├── context/       # React context
│   │   └── api/           # IPC client
│   ├── database/          # Database manager
│   └── shared/            # Shared types
├── .kiro/specs/           # Specification documents
├── dist/                  # Build output
├── release/               # Packaged applications
└── tests/                 # Test files
```

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run package:win      # Package for Windows
npm run package:mac      # Package for macOS
npm run package:linux    # Package for Linux
npm run dist             # Package for all platforms
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run lint             # Lint code
```

## Testing

The application includes comprehensive testing:

- **83 Property-Based Tests**: Validate universal correctness properties
- **Unit Tests**: Test specific functionality
- **Integration Tests**: Test end-to-end workflows

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Documentation

- [Production Checklist](PRODUCTION_CHECKLIST.md) - Pre-deployment checklist
- [Deployment Guide](DEPLOYMENT.md) - Installation and deployment instructions
- [Frontend Guide](FRONTEND_GUIDE.md) - Frontend development patterns

## Features in Detail

### Offline-First Architecture
- No internet connection required
- All data stored locally in SQLite
- Fast and responsive
- Complete privacy and security

### Property-Based Testing
- 83 correctness properties validated
- Automated test generation with fast-check
- High confidence in code correctness
- Catches edge cases automatically

### Performance Optimizations
- UI responds within 100ms
- Database operations in main process
- Pagination for large datasets
- Virtual scrolling for performance
- Optimized queries with indexes

### Data Integrity
- ACID transactions
- Referential integrity enforced
- Optimistic locking for concurrency
- Automatic rollback on errors
- Database integrity checks

## Security

- **Authentication**: Bcrypt password hashing (cost factor 10)
- **Authorization**: Role-based access control
- **Session Management**: 30-minute timeout
- **Data Protection**: Local storage only
- **Audit Trail**: All actions logged
- **Backup**: Automatic daily backups

## Building for Production

```bash
# Build and package for Windows
npm run package:win

# Output will be in release/ directory
# File: Dental-Clinic-Management-Setup-1.0.0.exe
# Size: ~200-250MB
```

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for complete build checklist.

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Version History

### Version 1.0.0 (Initial Release)
- Complete patient management system
- Appointment scheduling with calendar
- Treatment planning with interactive tooth chart
- Billing and invoicing with PDF export
- Inventory management with alerts
- Reports and analytics dashboard
- Offline operation
- Automatic backups
- Role-based access control
- 83 property-based tests

---

**Made with ❤️ for dental clinics**
