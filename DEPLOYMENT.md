# Deployment Instructions - Dental Clinic Management System

## Overview

This document provides step-by-step instructions for building, packaging, and deploying the Dental Clinic Management System for production use in dental clinics.

## Prerequisites

### Development Environment
- Node.js 18+ installed
- npm 9+ installed
- Git installed
- Windows 10/11 for Windows builds
- macOS for Mac builds (optional)
- Linux for Linux builds (optional)

### Build Tools
- electron-builder installed (included in devDependencies)
- TypeScript compiler
- Vite bundler

## Build Process

### Step 1: Prepare Source Code

```bash
# Clone repository (if not already done)
git clone <repository-url>
cd dental-clinic-management

# Install dependencies
npm install

# Verify installation
npm run lint
npm test
```

### Step 2: Update Version

Update version in `package.json`:
```json
{
  "version": "1.0.0"
}
```

### Step 3: Build Application

#### For Windows (Recommended for dental clinics)
```bash
# Build and package for Windows
npm run package:win
```

This will create:
- `release/Dental Clinic Management-Setup-1.0.0.exe` (NSIS installer)

#### For macOS
```bash
# Build and package for macOS
npm run package:mac
```

This will create:
- `release/Dental Clinic Management-1.0.0.dmg`

#### For Linux
```bash
# Build and package for Linux
npm run package:linux
```

This will create:
- `release/Dental Clinic Management-1.0.0.AppImage`
- `release/dental-clinic-management_1.0.0_amd64.deb`

#### For All Platforms
```bash
# Build for all platforms
npm run dist
```

### Step 4: Verify Build

1. Navigate to `release/` directory
2. Check file sizes (should be 200-250MB)
3. Verify installer exists
4. Test installation on clean machine

## Installation Instructions

### For End Users (Dental Clinics)

#### Windows Installation

1. **Download Installer**
   - Obtain `Dental Clinic Management-Setup-1.0.0.exe`
   - Verify file integrity (checksum if provided)

2. **Run Installer**
   - Double-click the installer
   - If Windows SmartScreen appears, click "More info" → "Run anyway"
   - Choose installation directory (default: `C:\Program Files\Dental Clinic Management`)
   - Select "Create desktop shortcut"
   - Click "Install"

3. **First Launch**
   - Launch application from desktop shortcut or Start menu
   - Application will initialize database on first run
   - Login screen will appear

4. **Initial Setup**
   - Login with default credentials:
     - Username: `admin`
     - Password: `admin123`
   - **IMPORTANT**: Change password immediately
   - Create additional users (dentists, receptionists)
   - Configure backup location
   - Import treatment templates (if provided)

### System Requirements

**Minimum Requirements:**
- Windows 10 (64-bit) or Windows 11
- 4GB RAM
- 500MB free disk space
- 1366x768 screen resolution
- Intel Core i3 or equivalent processor

**Recommended Requirements:**
- Windows 11 (64-bit)
- 8GB RAM
- 2GB free disk space (for database growth)
- 1920x1080 screen resolution
- Intel Core i5 or equivalent processor
- SSD for better performance

## Configuration

### Database Location

Default database location:
```
%APPDATA%\dental-clinic-management\database\clinic.db
```

To change location, edit configuration file:
```
%APPDATA%\dental-clinic-management\config.json
```

### Backup Configuration

Default backup location:
```
%APPDATA%\dental-clinic-management\backups\
```

Backup schedule:
- Automatic daily backups at 2:00 AM
- Retention: 30 days
- Manual backups available anytime

To configure:
1. Login as Administrator
2. Go to Settings → Backup
3. Set backup time and location
4. Test backup functionality

### User Management

#### Create Users

1. Login as Administrator
2. Go to Settings → User Management
3. Click "Add User"
4. Fill in details:
   - Username
   - Password (minimum 8 characters)
   - First Name / Last Name
   - Role (Administrator, Dentist, Receptionist)
5. Save

#### User Roles

**Administrator:**
- Full system access
- User management
- System configuration
- Backup/restore
- All reports

**Dentist:**
- Patient management
- Appointment scheduling
- Treatment planning
- Clinical notes
- View reports

**Receptionist:**
- Basic patient info
- Appointment scheduling
- Billing and invoicing
- Payment recording
- Basic reports

### Treatment Templates

Import default treatment templates:
1. Login as Administrator
2. Go to Settings → Treatment Templates
3. Click "Import Templates"
4. Select provided template file
5. Review and confirm

## Production Deployment

### For IT Administrators

#### Silent Installation

For deploying to multiple machines:

```bash
# Silent install
Dental-Clinic-Management-Setup-1.0.0.exe /S

# Silent install with custom directory
Dental-Clinic-Management-Setup-1.0.0.exe /S /D=C:\CustomPath
```

#### Group Policy Deployment

1. Copy installer to network share
2. Create GPO for software installation
3. Assign to target computers
4. Application will install on next reboot

#### Network Deployment Script

```powershell
# deploy.ps1
$installer = "\\server\share\Dental-Clinic-Management-Setup-1.0.0.exe"
$computers = Get-Content "computers.txt"

foreach ($computer in $computers) {
    Copy-Item $installer "\\$computer\c$\temp\"
    Invoke-Command -ComputerName $computer -ScriptBlock {
        Start-Process "C:\temp\Dental-Clinic-Management-Setup-1.0.0.exe" -ArgumentList "/S" -Wait
    }
}
```

## Updates and Maintenance

### Updating the Application

1. **Backup Current Data**
   - Go to Settings → Backup
   - Create manual backup
   - Verify backup file created

2. **Uninstall Old Version**
   - Go to Control Panel → Programs
   - Uninstall "Dental Clinic Management"
   - Database and backups are preserved

3. **Install New Version**
   - Run new installer
   - Database will be migrated automatically
   - Verify all data intact

### Database Maintenance

#### Optimize Database

Run monthly:
```sql
VACUUM;
ANALYZE;
```

Or use built-in tool:
1. Settings → Database
2. Click "Optimize Database"
3. Wait for completion

#### Check Database Integrity

```sql
PRAGMA integrity_check;
```

Or use built-in tool:
1. Settings → Database
2. Click "Check Integrity"
3. Review results

### Backup and Restore

#### Manual Backup

1. Settings → Backup
2. Click "Create Backup Now"
3. Choose location
4. Wait for completion
5. Verify backup file created

#### Restore from Backup

1. Settings → Backup
2. Click "Restore from Backup"
3. Select backup file
4. Confirm restoration
5. Application will restart
6. Verify data restored

## Troubleshooting

### Common Issues

#### Application Won't Start

**Symptoms:** Double-clicking icon does nothing

**Solutions:**
1. Check Task Manager for running instances
2. Kill any hung processes
3. Restart computer
4. Reinstall application

#### Database Locked Error

**Symptoms:** "Database is locked" error message

**Solutions:**
1. Close all application instances
2. Check for background processes
3. Restart application
4. If persists, restore from backup

#### Performance Issues

**Symptoms:** Slow response, freezing

**Solutions:**
1. Check available RAM
2. Close other applications
3. Optimize database
4. Check disk space
5. Consider hardware upgrade

#### Backup Fails

**Symptoms:** Backup error message

**Solutions:**
1. Check disk space
2. Verify backup location accessible
3. Check file permissions
4. Try different backup location

### Getting Help

**Technical Support:**
- Email: support@dentalclinic.com
- Phone: [Support Number]
- Hours: Monday-Friday, 9 AM - 5 PM

**Emergency Support:**
- Phone: [Emergency Number]
- Available 24/7 for critical issues

**Documentation:**
- User Manual: [URL]
- Video Tutorials: [URL]
- FAQ: [URL]

## Security Best Practices

### Password Policy

- Minimum 8 characters
- Mix of letters, numbers, symbols
- Change every 90 days
- No password reuse
- No sharing passwords

### Access Control

- Assign minimum necessary permissions
- Review user access quarterly
- Disable inactive accounts
- Log all administrative actions

### Data Protection

- Enable automatic backups
- Store backups securely
- Test restore process monthly
- Keep backups off-site
- Encrypt sensitive data

### Physical Security

- Lock workstations when away
- Secure backup media
- Control physical access
- Monitor for unauthorized access

## Compliance

### HIPAA Compliance (if applicable)

- Implement access controls
- Audit trail enabled
- Encryption at rest
- Secure backups
- Staff training required

### Data Retention

- Patient records: 7 years minimum
- Financial records: 7 years
- Audit logs: 1 year
- Backups: 30 days rolling

## Performance Optimization

### Database Optimization

- Run VACUUM monthly
- Update statistics weekly
- Monitor database size
- Archive old records annually

### Application Performance

- Close unused windows
- Clear old logs monthly
- Limit concurrent users
- Monitor memory usage

### Hardware Recommendations

**For Small Clinics (1-2 users):**
- Intel Core i3
- 8GB RAM
- 256GB SSD
- 1080p monitor

**For Medium Clinics (3-5 users):**
- Intel Core i5
- 16GB RAM
- 512GB SSD
- Dual monitors

**For Large Clinics (6+ users):**
- Intel Core i7
- 32GB RAM
- 1TB SSD
- Dual monitors
- Dedicated backup drive

## Appendix

### File Locations

**Application:**
```
C:\Program Files\Dental Clinic Management\
```

**User Data:**
```
%APPDATA%\dental-clinic-management\
├── database\
│   └── clinic.db
├── backups\
│   └── backup-YYYY-MM-DD.db
├── logs\
│   └── app.log
└── config.json
```

### Command Line Options

```bash
# Start application
dental-clinic-management.exe

# Start with specific database
dental-clinic-management.exe --db="C:\path\to\database.db"

# Enable debug mode
dental-clinic-management.exe --debug

# Show version
dental-clinic-management.exe --version
```

### Environment Variables

```bash
# Set custom data directory
DENTAL_CLINIC_DATA_DIR=C:\CustomPath

# Enable verbose logging
DENTAL_CLINIC_LOG_LEVEL=debug

# Disable auto-updates
DENTAL_CLINIC_AUTO_UPDATE=false
```

---

**Document Version:** 1.0.0  
**Last Updated:** [Date]  
**Maintained By:** Development Team  
**Contact:** support@dentalclinic.com
