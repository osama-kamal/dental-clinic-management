# Setup Guide for Dental Clinic Management System

## Prerequisites

### Required Software

1. **Node.js 20+**
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Visual Studio Build Tools** (Windows only, required for better-sqlite3)
   - Download from: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload
   - **Important**: Must include Windows SDK
   - Alternative: Install full Visual Studio 2022 with C++ development tools

4. **Python 3.x** (required for node-gyp)
   - Download from: https://www.python.org/downloads/
   - Verify installation: `python --version`

### macOS/Linux Additional Requirements

For macOS:
```bash
xcode-select --install
```

For Linux (Ubuntu/Debian):
```bash
sudo apt-get install build-essential python3
```

For Linux (Fedora/RHEL):
```bash
sudo dnf install gcc-c++ make python3
```

## Installation Steps

### 1. Clone or Download the Project

```bash
cd dental-clinic-management
```

### 2. Install Dependencies

```bash
npm install
```

**Note**: The installation may take 5-10 minutes as it needs to compile native modules (better-sqlite3).

### 3. Verify Installation

Check that key dependencies are installed:

```bash
npm list better-sqlite3
npm list electron
npm list react
npm list fast-check
```

## Troubleshooting

### Issue: better-sqlite3 fails to install on Windows

**Error**: `gyp ERR! find VS could not find any Visual Studio installation to use`

**Solution**:
1. Install Visual Studio Build Tools 2022
2. During installation, select "Desktop development with C++"
3. Ensure "Windows SDK" is checked
4. Restart your terminal/command prompt
5. Run `npm install` again

### Issue: Python not found

**Error**: `gyp ERR! find Python`

**Solution**:
1. Install Python 3.x from python.org
2. During installation, check "Add Python to PATH"
3. Restart your terminal
4. Verify: `python --version`

### Issue: Permission errors on macOS/Linux

**Solution**:
```bash
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Issue: Node version mismatch

**Solution**:
- Ensure you're using Node.js 20 or higher
- Use nvm (Node Version Manager) to switch versions:
  ```bash
  nvm install 20
  nvm use 20
  ```

## Development Workflow

### Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```
   This starts the Vite dev server for the React renderer process.

2. **In a separate terminal, start Electron**:
   ```bash
   npm start
   ```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Building for Production

```bash
# Build the application
npm run build

# Package for distribution
npm run package
```

This will create distributable packages in the `release/` directory for your platform.

## Project Structure Verification

After installation, verify the following directories exist:

```
dental-clinic-management/
├── node_modules/          # Dependencies (created after npm install)
├── src/
│   ├── main/             # Electron main process
│   ├── renderer/         # React application
│   ├── database/         # Database management
│   ├── shared/           # Shared types
│   └── test/             # Test utilities
├── dist/                 # Build output (created after npm run build)
└── package.json
```

## Next Steps

After successful installation:

1. Review the README.md for project overview
2. Check the requirements.md in `.kiro/specs/dental-clinic-management/`
3. Review the design.md for architecture details
4. Run the tests to verify everything works: `npm test`
5. Start development: `npm run dev` then `npm start`

## Getting Help

If you encounter issues not covered in this guide:

1. Check the error logs in the terminal
2. Review the npm debug log (path shown in error message)
3. Ensure all prerequisites are properly installed
4. Try deleting `node_modules` and running `npm install` again
5. Check that your Node.js version is 20 or higher

## Environment Variables

The application uses the following environment variables:

- `NODE_ENV`: Set to 'development' or 'production'
- No other environment variables are required for basic operation

## Database Location

The SQLite database will be created at:
- **Windows**: `%APPDATA%/dental-clinic-management/dental-clinic.db`
- **macOS**: `~/Library/Application Support/dental-clinic-management/dental-clinic.db`
- **Linux**: `~/.config/dental-clinic-management/dental-clinic.db`

## Logs Location

Application logs are stored at:
- **Windows**: `%APPDATA%/dental-clinic-management/logs/app.log`
- **macOS**: `~/Library/Logs/dental-clinic-management/app.log`
- **Linux**: `~/.config/dental-clinic-management/logs/app.log`
