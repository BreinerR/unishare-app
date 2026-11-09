const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initializeDatabase() {
  console.log('--- Iniciando inicialización de esquema en PostgreSQL ---');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(sql);
    console.log('✓ Tablas y tipos de UniShare inicializados exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error ejecutando schema.sql:', error.message);
    process.exit(1);
  }
}

initializeDatabase();
