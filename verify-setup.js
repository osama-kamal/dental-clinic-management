/**
 * Verification script to check project setup
 * Run with: node verify-setup.js
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, errorMsg) {
  if (condition) {
    checks.push({ name, status: '✓', passed: true });
    passed++;
  } else {
    checks.push({ name, status: '✗', passed: false, error: errorMsg });
    failed++;
  }
}

console.log('Verifying Dental Clinic Management System Setup...\n');

// Check configuration files
check(
  'package.json exists',
  fs.existsSync('package.json'),
  'package.json not found'
);

check(
  'tsconfig.json exists',
  fs.existsSync('tsconfig.json'),
  'tsconfig.json not found'
);

check(
  'tsconfig.main.json exists',
  fs.existsSync('tsconfig.main.json'),
  'tsconfig.main.json not found'
);

check(
  'jest.config.js exists',
  fs.existsSync('jest.config.js'),
  'jest.config.js not found'
);

check(
  'vite.config.ts exists',
  fs.existsSync('vite.config.ts'),
  'vite.config.ts not found'
);

// Check directory structure
check(
  'src/main directory exists',
  fs.existsSync('src/main'),
  'src/main directory not found'
);

check(
  'src/renderer directory exists',
  fs.existsSync('src/renderer'),
  'src/renderer directory not found'
);

check(
  'src/database directory exists',
  fs.existsSync('src/database'),
  'src/database directory not found'
);

check(
  'src/shared directory exists',
  fs.existsSync('src/shared'),
  'src/shared directory not found'
);

check(
  'src/test directory exists',
  fs.existsSync('src/test'),
  'src/test directory not found'
);

// Check main process files
check(
  'main.ts exists',
  fs.existsSync('src/main/main.ts'),
  'src/main/main.ts not found'
);

check(
  'preload.ts exists',
  fs.existsSync('src/main/preload.ts'),
  'src/main/preload.ts not found'
);

check(
  'IPC handlers exist',
  fs.existsSync('src/main/ipc/ipcHandlers.ts'),
  'src/main/ipc/ipcHandlers.ts not found'
);

check(
  'Logger utility exists',
  fs.existsSync('src/main/utils/logger.ts'),
  'src/main/utils/logger.ts not found'
);

// Check database files
check(
  'DatabaseManager exists',
  fs.existsSync('src/database/DatabaseManager.ts'),
  'src/database/DatabaseManager.ts not found'
);

check(
  'DatabaseManager tests exist',
  fs.existsSync('src/database/DatabaseManager.test.ts'),
  'src/database/DatabaseManager.test.ts not found'
);

// Check renderer files
check(
  'React App.tsx exists',
  fs.existsSync('src/renderer/App.tsx'),
  'src/renderer/App.tsx not found'
);

check(
  'React main.tsx exists',
  fs.existsSync('src/renderer/main.tsx'),
  'src/renderer/main.tsx not found'
);

check(
  'index.html exists',
  fs.existsSync('index.html'),
  'index.html not found'
);

// Check shared files
check(
  'Shared types exist',
  fs.existsSync('src/shared/types.ts'),
  'src/shared/types.ts not found'
);

// Check test files
check(
  'Test setup exists',
  fs.existsSync('src/test/setup.ts'),
  'src/test/setup.ts not found'
);

check(
  'Example property test exists',
  fs.existsSync('src/test/example.property.test.ts'),
  'src/test/example.property.test.ts not found'
);

check(
  'Integration test exists',
  fs.existsSync('src/test/setup.integration.test.ts'),
  'src/test/setup.integration.test.ts not found'
);

// Check package.json content
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  
  check(
    'Package name is correct',
    pkg.name === 'dental-clinic-management',
    'Package name mismatch'
  );
  
  check(
    'better-sqlite3 dependency exists',
    pkg.dependencies && pkg.dependencies['better-sqlite3'],
    'better-sqlite3 not in dependencies'
  );
  
  check(
    'electron devDependency exists',
    pkg.devDependencies && pkg.devDependencies['electron'],
    'electron not in devDependencies'
  );
  
  check(
    'react dependency exists',
    pkg.dependencies && pkg.dependencies['react'],
    'react not in dependencies'
  );
  
  check(
    'fast-check dependency exists',
    pkg.dependencies && pkg.dependencies['fast-check'],
    'fast-check not in dependencies'
  );
  
  check(
    'jest devDependency exists',
    pkg.devDependencies && pkg.devDependencies['jest'],
    'jest not in devDependencies'
  );
  
  check(
    'typescript devDependency exists',
    pkg.devDependencies && pkg.devDependencies['typescript'],
    'typescript not in devDependencies'
  );
}

// Print results
console.log('Configuration Files:');
checks.slice(0, 5).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\nDirectory Structure:');
checks.slice(5, 10).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\nMain Process Files:');
checks.slice(10, 14).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\nDatabase Files:');
checks.slice(14, 16).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\nRenderer Files:');
checks.slice(16, 19).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\nShared Files:');
checks.slice(19, 20).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\nTest Files:');
checks.slice(20, 23).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\nPackage Dependencies:');
checks.slice(23).forEach(c => {
  console.log(`  ${c.status} ${c.name}`);
  if (!c.passed && c.error) console.log(`    Error: ${c.error}`);
});

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✓ Project setup is complete!');
  console.log('\nNext steps:');
  console.log('  1. Install dependencies: npm install');
  console.log('  2. Run tests: npm test');
  console.log('  3. Start development: npm run dev (then npm start in another terminal)');
  process.exit(0);
} else {
  console.log('\n✗ Project setup is incomplete. Please review the errors above.');
  process.exit(1);
}
