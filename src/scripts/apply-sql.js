// Script utilitário: aplica db/schema.sql seguido de db/seed.sql
// Uso: npm run db:setup

const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');

async function main() {
  const dir = path.join(__dirname, '..', '..', 'db');
  await db.ensureSchema();
  console.log('✔ db/schema.sql aplicado.');
  const seed = fs.readFileSync(path.join(dir, 'seed.sql'), 'utf8');
  if (seed.trim()) {
    await db.pool.query(seed);
    console.log('✔ db/seed.sql aplicado (produtos cadastrados).');
  }
  await db.pool.end();
}

main().catch(err => {
  console.error('Falhou ao aplicar o banco:', err.message);
  process.exit(1);
});
