// =============================================================================
// Server bootstrap: sobe o Express e garante o schema do banco
// =============================================================================

const config = require('./config');
const db = require('./db');
const createApp = require('./app');

const app = createApp();

async function main() {
  // Aplica migrations/seed (idempotente) — mantém o servidor de pé mesmo se o
  // banco ainda não estiver disponível; a validação em cima de cada rota garante UX
  try {
    await db.ensureSchema();
    console.log("✔ Schema do banco verificado (products/reviews/review_items).");
  } catch (err) {
    console.warn(
      `! Não foi possível garantir o schema agora (${err.code || ''} ${err.message}).` +
      ' O banco será verificado por requisição.',
    );
  }

  app.listen(config.port, () => {
    console.log(`✔ Na'Guará — Avaliações rodando em http://localhost:${config.port}`);
    console.log(`  Ambiente: ${config.env}`);
  });
}

// Encerramento gracioso (Ctrl+C / docker stop)
process.on('SIGTERM', () => {
  console.log('Encerrando…');
  process.exit(0);
});

main();
