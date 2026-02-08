/**
 * Database Initialization Script
 * Creates database schema and default admin user
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Database path
const dbDir = path.join(process.env.APPDATA || process.env.HOME, 'dental-clinic-management', 'database');
const dbPath = path.join(dbDir, 'clinic.db');

console.log('🔧 Initializing database...');
console.log('📁 Database path:', dbPath);

// Create directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
}

// Create database connection
const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');
console.log('✅ Enabled WAL mode');

// Create tables
console.log('📋 Creating tables...');

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Administrator', 'Dentist', 'Receptionist')),
    email TEXT,
    phone TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Patients table
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_history TEXT,
    allergies TEXT,
    medications TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Tables created');

// Create default admin user
console.log('👤 Creating default admin user...');

const adminId = 'admin-' + Date.now();
const passwordHash = bcrypt.hashSync('admin123', 10);

try {
  const stmt = db.prepare(`
    INSERT INTO users (id, username, password_hash, first_name, last_name, role, email)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(adminId, 'admin', passwordHash, 'System', 'Administrator', 'Administrator', 'admin@clinic.com');
  
  console.log('✅ Admin user created successfully!');
  console.log('');
  console.log('🔐 Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('');
  console.log('⚠️  IMPORTANT: Change the password after first login!');
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    console.log('ℹ️  Admin user already exists');
  } else {
    console.error('❌ Error creating admin user:', error.message);
  }
}

// Close database
db.close();

console.log('');
console.log('🎉 Database initialization complete!');
console.log('');
console.log('📍 Database location:', dbPath);
console.log('');
console.log('🚀 You can now start the application with: npm run dev');
