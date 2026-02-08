import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { logger } from '../main/utils/logger';
import fs from 'fs';
import path from 'path';

export class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private backupInterval: NodeJS.Timeout | null = null;
  private backupDirectory: string;
  private SQL: any = null;

  constructor(dbPath: string, backupDirectory?: string) {
    this.dbPath = dbPath;
    this.backupDirectory = backupDirectory || path.join(path.dirname(dbPath), 'backups');
  }

  /**
   * Initialize the database connection and schema
   */
  async initialize(): Promise<void> {
    try {
      // Initialize sql.js
      this.SQL = await initSqlJs();

      // Ensure the directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Load existing database or create new one
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(buffer);
        logger.info('Loaded existing database');
      } else {
        this.db = new this.SQL.Database();
        logger.info('Created new database');
      }

      // Enable foreign keys
      if (this.db) {
        this.db.run('PRAGMA foreign_keys = ON');
      }

      // Run migrations
      await this.runMigrations();

      // Save database to disk
      this.saveDatabase();

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  /**
   * Save database to disk
   */
  private saveDatabase(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      logger.error('Failed to save database', { error });
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Create schema_version table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    // Get current schema version
    const currentVersion = this.getCurrentSchemaVersion();
    logger.info('Current schema version', { version: currentVersion });

    // Apply migrations
    const migrations = this.getMigrations();
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        logger.info('Applying migration', { version: migration.version });
        migration.up(this.db);
        this.db.run(
          'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
          [migration.version, new Date().toISOString()]
        );
        this.saveDatabase();
        logger.info('Migration applied successfully', { version: migration.version });
      }
    }
  }

  /**
   * Get current schema version
   */
  private getCurrentSchemaVersion(): number {
    if (!this.db) {
      return 0;
    }

    try {
      const result = this.db.exec('SELECT MAX(version) as version FROM schema_version');
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values[0][0] as number || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all migrations
   */
  private getMigrations(): Array<{
    version: number;
    up: (db: SqlJsDatabase) => void;
  }> {
    return [
      {
        version: 1,
        up: (db: SqlJsDatabase) => {
          // Initial schema with all tables
          db.run(`
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              username TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              first_name TEXT NOT NULL,
              last_name TEXT NOT NULL,
              role TEXT NOT NULL CHECK(role IN ('Administrator', 'Dentist', 'Receptionist')),
              email TEXT,
              is_active INTEGER DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            -- Patients table
            CREATE TABLE IF NOT EXISTS patients (
              id TEXT PRIMARY KEY,
              first_name TEXT NOT NULL,
              last_name TEXT NOT NULL,
              date_of_birth TEXT NOT NULL,
              phone TEXT NOT NULL,
              email TEXT,
              address TEXT,
              emergency_contact_name TEXT,
              emergency_contact_phone TEXT,
              allergies TEXT,
              medical_conditions TEXT,
              current_medications TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
            CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

            -- Appointments table
            CREATE TABLE IF NOT EXISTS appointments (
              id TEXT PRIMARY KEY,
              patient_id TEXT NOT NULL,
              dentist_id TEXT NOT NULL,
              start_time TEXT NOT NULL,
              duration INTEGER NOT NULL,
              appointment_type TEXT NOT NULL,
              status TEXT NOT NULL CHECK(status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled')),
              notes TEXT,
              cancellation_reason TEXT,
              created_by TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (patient_id) REFERENCES patients(id),
              FOREIGN KEY (dentist_id) REFERENCES users(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
            CREATE INDEX IF NOT EXISTS idx_appointments_dentist_time ON appointments(dentist_id, start_time);
            CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(start_time);

            -- Treatment plans table
            CREATE TABLE IF NOT EXISTS treatment_plans (
              id TEXT PRIMARY KEY,
              patient_id TEXT NOT NULL,
              created_by TEXT NOT NULL,
              total_estimated_cost REAL NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (patient_id) REFERENCES patients(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            );

            -- Treatments table
            CREATE TABLE IF NOT EXISTS treatments (
              id TEXT PRIMARY KEY,
              treatment_plan_id TEXT NOT NULL,
              code TEXT NOT NULL,
              description TEXT NOT NULL,
              estimated_cost REAL NOT NULL,
              status TEXT NOT NULL CHECK(status IN ('Planned', 'In Progress', 'Completed', 'Cancelled')),
              completed_date TEXT,
              completed_by TEXT,
              notes TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans(id),
              FOREIGN KEY (completed_by) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_treatments_plan ON treatments(treatment_plan_id);
            CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);

            -- Treatment templates table
            CREATE TABLE IF NOT EXISTS treatment_templates (
              id TEXT PRIMARY KEY,
              code TEXT UNIQUE NOT NULL,
              description TEXT NOT NULL,
              category TEXT NOT NULL,
              default_cost REAL NOT NULL,
              default_duration INTEGER,
              is_active INTEGER DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_treatment_templates_category ON treatment_templates(category);

            -- Invoices table
            CREATE TABLE IF NOT EXISTS invoices (
              id TEXT PRIMARY KEY,
              invoice_number TEXT UNIQUE NOT NULL,
              patient_id TEXT NOT NULL,
              subtotal REAL NOT NULL,
              tax_rate REAL NOT NULL,
              tax_amount REAL NOT NULL,
              discount_amount REAL DEFAULT 0,
              total_amount REAL NOT NULL,
              amount_paid REAL DEFAULT 0,
              balance REAL NOT NULL,
              status TEXT NOT NULL CHECK(status IN ('Unpaid', 'Partial', 'Paid', 'Cancelled')),
              due_date TEXT,
              created_by TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (patient_id) REFERENCES patients(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
            CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);

            -- Invoice items table
            CREATE TABLE IF NOT EXISTS invoice_items (
              id TEXT PRIMARY KEY,
              invoice_id TEXT NOT NULL,
              treatment_id TEXT NOT NULL,
              description TEXT NOT NULL,
              quantity INTEGER NOT NULL,
              unit_price REAL NOT NULL,
              total_price REAL NOT NULL,
              FOREIGN KEY (invoice_id) REFERENCES invoices(id),
              FOREIGN KEY (treatment_id) REFERENCES treatments(id)
            );

            -- Payments table
            CREATE TABLE IF NOT EXISTS payments (
              id TEXT PRIMARY KEY,
              invoice_id TEXT NOT NULL,
              amount REAL NOT NULL,
              method TEXT NOT NULL CHECK(method IN ('Cash', 'Credit Card', 'Debit Card', 'Check', 'Insurance')),
              reference TEXT,
              payment_date TEXT NOT NULL,
              recorded_by TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (invoice_id) REFERENCES invoices(id),
              FOREIGN KEY (recorded_by) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

            -- Inventory items table
            CREATE TABLE IF NOT EXISTS inventory_items (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              category TEXT NOT NULL,
              unit_of_measure TEXT NOT NULL,
              current_quantity REAL NOT NULL,
              minimum_threshold REAL NOT NULL,
              unit_cost REAL NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
            CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_items(current_quantity, minimum_threshold);

            -- Inventory transactions table
            CREATE TABLE IF NOT EXISTS inventory_transactions (
              id TEXT PRIMARY KEY,
              item_id TEXT NOT NULL,
              transaction_type TEXT NOT NULL CHECK(transaction_type IN ('Addition', 'Usage', 'Adjustment')),
              quantity_change REAL NOT NULL,
              quantity_after REAL NOT NULL,
              reason TEXT,
              reference_id TEXT,
              performed_by TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (item_id) REFERENCES inventory_items(id),
              FOREIGN KEY (performed_by) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);

            -- Clinical notes table
            CREATE TABLE IF NOT EXISTS clinical_notes (
              id TEXT PRIMARY KEY,
              patient_id TEXT NOT NULL,
              note_text TEXT NOT NULL,
              note_type TEXT NOT NULL,
              created_by TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (patient_id) REFERENCES patients(id),
              FOREIGN KEY (created_by) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);

            -- Attachments table
            CREATE TABLE IF NOT EXISTS attachments (
              id TEXT PRIMARY KEY,
              patient_id TEXT NOT NULL,
              file_name TEXT NOT NULL,
              file_type TEXT NOT NULL,
              file_data BLOB NOT NULL,
              file_size INTEGER NOT NULL,
              uploaded_by TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (patient_id) REFERENCES patients(id),
              FOREIGN KEY (uploaded_by) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_attachments_patient ON attachments(patient_id);

            -- Sessions table
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              last_activity TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
          `);
        },
      },
    ];
  }

  /**
   * Execute a query and return results
   */
  executeQuery<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const results = this.db.exec(sql, params);
      if (results.length === 0) {
        return [];
      }

      const columns = results[0].columns;
      const values = results[0].values;

      return values.map((row: any) => {
        const obj: any = {};
        columns.forEach((col: string, index: number) => {
          obj[col] = row[index];
        });
        return JSON.parse(JSON.stringify(obj)) as T; // Deep clone to plain object
      });
    } catch (error) {
      logger.error('Query execution failed', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a query and return a single result
   */
  executeQueryOne<T = any>(sql: string, params: any[] = []): T | null {
    const results = this.executeQuery<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a query that modifies data (INSERT, UPDATE, DELETE)
   */
  executeUpdate(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run(sql, params);
      this.saveDatabase();
      
      // Get changes count
      const changesResult = this.db.exec('SELECT changes() as changes');
      const changes = changesResult.length > 0 ? (changesResult[0].values[0][0] as number) : 0;
      
      // Get last insert rowid
      const rowidResult = this.db.exec('SELECT last_insert_rowid() as rowid');
      const lastInsertRowid = rowidResult.length > 0 ? (rowidResult[0].values[0][0] as number) : 0;
      
      return { changes, lastInsertRowid };
    } catch (error) {
      logger.error('Update execution failed', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute operations within a transaction
   */
  executeTransaction(operations: () => void): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run('BEGIN TRANSACTION');
      operations();
      this.db.run('COMMIT');
      this.saveDatabase();
    } catch (error) {
      this.db.run('ROLLBACK');
      logger.error('Transaction failed and was rolled back', { error });
      throw error;
    }
  }

  /**
   * Create a backup of the database
   */
  async backup(destination: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Ensure destination directory exists
      const destDir = path.dirname(destination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Export and save database
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(destination, buffer);
      
      logger.info('Database backup created', { destination });
    } catch (error) {
      logger.error('Backup failed', { destination, error });
      throw error;
    }
  }

  /**
   * Start automatic daily backup
   */
  startAutomaticBackup(backupTime: { hour: number; minute: number } = { hour: 2, minute: 0 }): void {
    // Stop existing backup schedule if any
    this.stopAutomaticBackup();

    // Calculate milliseconds until next backup time
    const now = new Date();
    const nextBackup = new Date();
    nextBackup.setHours(backupTime.hour, backupTime.minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }

    const msUntilBackup = nextBackup.getTime() - now.getTime();

    // Schedule first backup
    setTimeout(() => {
      this.performScheduledBackup();
      
      // Then schedule daily backups
      this.backupInterval = setInterval(() => {
        this.performScheduledBackup();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilBackup);

    logger.info('Automatic backup scheduled', { nextBackup: nextBackup.toISOString() });
  }

  /**
   * Stop automatic backup
   */
  stopAutomaticBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      logger.info('Automatic backup stopped');
    }
  }

  /**
   * Perform scheduled backup with timestamp
   */
  private async performScheduledBackup(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.db`;
      const backupPath = path.join(this.backupDirectory, backupFileName);

      await this.backup(backupPath);
      
      // Apply retention policy
      await this.applyBackupRetentionPolicy();
      
      logger.info('Scheduled backup completed', { backupPath });
    } catch (error) {
      logger.error('Scheduled backup failed', { error });
    }
  }

  /**
   * Apply backup retention policy (keep last 30 backups)
   */
  private async applyBackupRetentionPolicy(): Promise<void> {
    try {
      if (!fs.existsSync(this.backupDirectory)) {
        return;
      }

      // Get all backup files
      const files = fs.readdirSync(this.backupDirectory)
        .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDirectory, file),
          mtime: fs.statSync(path.join(this.backupDirectory, file)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // Sort by newest first

      // Keep only the last 30 backups
      const maxBackups = 30;
      if (files.length > maxBackups) {
        const filesToDelete = files.slice(maxBackups);
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          logger.info('Old backup deleted', { file: file.name });
        }
      }
    } catch (error) {
      logger.error('Failed to apply backup retention policy', { error });
    }
  }

  /**
   * Validate database integrity
   */
  validateIntegrity(): boolean {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = this.db.exec('PRAGMA integrity_check');
      const isValid = result.length > 0 && result[0].values[0][0] === 'ok';
      
      if (!isValid) {
        logger.error('Database integrity check failed', { result });
      }
      
      return isValid;
    } catch (error) {
      logger.error('Database integrity validation failed', { error });
      return false;
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    // Stop automatic backup
    this.stopAutomaticBackup();
    
    if (this.db) {
      // Save one last time before closing
      this.saveDatabase();
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Get the underlying database instance (use with caution)
   */
  getDatabase(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
