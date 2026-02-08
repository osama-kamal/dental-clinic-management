import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseManager } from '../database/DatabaseManager';
import { setupIpcHandlers } from './ipc/ipcHandlers';
import { logger } from './utils/logger';

let mainWindow: BrowserWindow | null = null;
let dbManager: DatabaseManager | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle unsaved changes confirmation
  // Requirements: 11.5
  mainWindow.on('close', async (event) => {
    // Check if there are unsaved changes
    // This would be tracked by the renderer process
    if (mainWindow) {
      event.preventDefault();
      
      const { dialog } = require('electron');
      const choice = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Cancel', 'Quit Without Saving'],
        title: 'Confirm',
        message: 'Are you sure you want to quit? Any unsaved changes will be lost.',
      });

      if (choice.response === 1) {
        // User chose to quit without saving
        mainWindow.destroy();
      }
      // If choice.response === 0, user cancelled, do nothing
    }
  });
}

async function initializeDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'database');
    const dbPath = path.join(dbDir, 'clinic.db');
    const backupDir = path.join(userDataPath, 'backups');
    
    // Ensure database directory exists
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    dbManager = new DatabaseManager(dbPath, backupDir);
    
    // Initialize database with schema and migrations
    // Requirements: 11.1, 11.2
    await dbManager.initialize();
    
    // Create default admin user if no users exist
    const bcrypt = require('bcrypt');
    const { randomUUID } = require('crypto');
    const users = dbManager.executeQuery('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      const now = new Date().toISOString();
      const passwordHash = await bcrypt.hash('admin123', 10);
      dbManager.executeUpdate(
        `INSERT INTO users (id, username, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [randomUUID(), 'admin', passwordHash, 'Admin', 'User', 'Administrator', now, now]
      );
      logger.info('Default admin user created');
    }
    
    // Validate database integrity
    // Requirements: 8.8, 8.9
    const isValid = dbManager.validateIntegrity();
    if (!isValid) {
      throw new Error('Database integrity check failed');
    }
    
    // Start automatic daily backup at 2:00 AM
    // Requirements: 8.4, 8.5
    dbManager.startAutomaticBackup({ hour: 2, minute: 0 });
    
    logger.info('Database initialized successfully', { dbPath });
    return true;
  } catch (error) {
    logger.error('Database initialization failed', { error });
    console.error('Database error:', error);
    // Requirements: 11.3
    return false;
  }
}

app.on('ready', async () => {
  // Initialize database before creating window
  // Requirements: 11.1
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    // Show error dialog and quit
    // Requirements: 11.3
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Database Initialization Failed',
      'The application database could not be initialized. Please check the logs and try again.'
    );
    app.quit();
    return;
  }

  // Set up IPC handlers
  if (dbManager) {
    setupIpcHandlers(ipcMain, dbManager);
  }

  // Create window
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  // Close database connections gracefully
  // Requirements: 11.4
  if (dbManager) {
    dbManager.close();
    logger.info('Database connections closed');
  }
});

// Global error handlers
// Requirements: 11.6, 11.7
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  // In production, we might want to show an error dialog and restart
  // Requirements: 11.8
  if (process.env.NODE_ENV === 'production') {
    app.relaunch();
    app.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

export { dbManager, mainWindow };
