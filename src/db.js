// =============================================================================
// Camada de acesso ao banco de dados (PostgreSQL via `pg`)
// =============================================================================

const { Pool } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Evita travar o servidor caso a rede/SGDB caia
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Nome da URL ocultada em logs
pool.on('error', () => {});

/**
 * Garante que o schema existe e popula a tabela de produtos.
 * Idempotente: CREATE TABLE IF NOT EXISTS + seed sem duplicatas.
 */
async function ensureSchema() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'db', 'seed.sql');
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));
  await pool.query(fs.readFileSync(seedPath, 'utf8'));
}

/** Verifica rapidamente se o banco responde. */
async function ping() {
  await pool.query('SELECT 1');
}

// ------------------------- Consultas usadas pela aplicação -------------------

/** Produtos ativos (aparecem no formulário de avaliação). */
async function listActiveProducts() {
  const { rows } = await pool.query(
    `SELECT id, name, description, category, image_url
       FROM products
      WHERE active = TRUE
      ORDER BY category, name`,
  );
  return rows;
}

/** Produtos por ID — usado para validar o que veio do formulário. */
async function getActiveProductsByIds(ids) {
  const { rows } = await pool.query(
    `SELECT id, name
       FROM products
      WHERE active = TRUE AND id = ANY ($1::int[])`,
    [ids],
  );
  return rows;
}

/**
 * Nota média de cada produto (+ quantidade de avaliações).
 * Usado na listagem da home.
 */
async function listProductsSummary() {
  const { rows } = await pool.query(
    `SELECT p.id,
            p.name,
            p.description,
            p.category,
            p.image_url,
            ROUND(AVG(r.sabor + r.temperatura + r.apresentacao + r.atendimento + r.custo_beneficio) / 5.0, 1) AS avg_rating,
            COUNT(DISTINCT r.review_id) AS review_count
       FROM products p
       LEFT JOIN review_items r ON r.product_id = p.id
      WHERE p.active = TRUE
      GROUP BY p.id
      ORDER BY p.category, p.name`,
  );
  return rows;
}

/** Últimas avaliações publicadas (aggrega produtos por avaliação). */
async function listRecentReviews(limit = 5) {
  const reviews = (await pool.query(
    `SELECT id, full_name, comment, created_at
       FROM reviews
      WHERE comment IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  )).rows;

  const products = (await pool.query(
    `SELECT ri.review_id, p.name
       FROM review_items ri
       JOIN products p ON p.id = ri.product_id
      WHERE ri.review_id = ANY ($1::int[])
      ORDER BY ri.id`,
    [reviews.map(r => r.id)],
  )).rows;

  for (const review of reviews) {
    review.products = products
      .filter(rp => rp.review_id === review.id)
      .map(rp => rp.name);
  }
  return reviews;
}

/**
 * Grava uma avaliação completa em transação:
 * 1 review + N itens (um por produto, com as 5 notas cada).
 */
async function createReview({ fullName, comment, items }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [review] } = await client.query(
      `INSERT INTO reviews (full_name, comment)
       VALUES ($1, $2)
       RETURNING id,
                 created_at`,
      [fullName, comment],
    );

    const productIds = items.map(i => i.productId);
    const sabor          = items.map(i => i.ratings.sabor);
    const temperatura    = items.map(i => i.ratings.temperatura);
    const apresentacao   = items.map(i => i.ratings.apresentacao);
    const atendimento    = items.map(i => i.ratings.atendimento);
    const custoBeneficio = items.map(i => i.ratings.custo_beneficio);

    await client.query(
      `INSERT INTO review_items
        (review_id, product_id, sabor, temperatura, apresentacao, atendimento, custo_beneficio)
       SELECT $1, p_id, s, t, a, at, cb
         FROM UNNEST(
           $2::int[], $3::int[], $4::int[], $5::int[], $6::int[], $7::int[]
         ) AS x(p_id, s, t, a, at, cb)`,
      [review.id, productIds, sabor, temperatura, apresentacao, atendimento, custoBeneficio],
    );

    await client.query('COMMIT');
    return review;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  ensureSchema,
  ping,
  listActiveProducts,
  getActiveProductsByIds,
  listProductsSummary,
  listRecentReviews,
  createReview,
};
