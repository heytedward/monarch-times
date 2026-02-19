const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL is not set in .env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = neon(databaseUrl);

  const migrationFile = process.argv[2] || 'api/migrations/005_reintegrate_solana.sql';
  const migrationPath = path.isAbsolute(migrationFile) ? migrationFile : path.join(__dirname, '..', migrationFile);
  console.log(`Reading migration file: ${migrationPath}`);
  
  try {
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration...');
    
    // Split by semicolon to run statements individually
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`Running: ${statement.substring(0, 50)}...`);
      await sql(statement);
    }
    
    console.log(`Migration ${path.basename(migrationPath)} executed successfully!`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
