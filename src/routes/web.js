// =============================================================================
// Rotas web (EJS monolítico):
//   GET  /                  → página inicial (produtos + últimas avaliações)
//   GET  /avaliar           → formulário de avaliação
//   POST /avaliar           → grava a avaliação (nome, produtos, notas, comentário)
//   GET  /avaliar/obrigado  → tela de confirmação
// =============================================================================

const express = require('express');
const db = require('../db');
const config = require('../config');

module.exports = function buildWebRoutes(submitLimiter) {
  const router = express.Router();

  // ---------------------------------------------------------------------------
  // Home
  // ---------------------------------------------------------------------------
  router.get('/', async (req, res, next) => {
    try {
      const [products, reviews] = await Promise.all([
        db.listProductsSummary(),
        db.listRecentReviews(5),
      ]);
      res.render('index', { title: "Na'Guará — Avalie nossos produtos", products, reviews });
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------------------
  // Formulário
  // ---------------------------------------------------------------------------
  router.get('/avaliar', async (req, res, next) => {
    try {
      const products = await db.listActiveProducts();
      res.render('avaliar', { title: "Avalie os produtos — Na'Guará", products, errors: null, values: null });
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------------------
  // Envio da avaliação
  // ---------------------------------------------------------------------------
  router.post('/avaliar', submitLimiter, async (req, res, next) => {
    const values = {
      fullName: typeof req.body.full_name === 'string' ? req.body.full_name : '',
      comment: typeof req.body.comment === 'string' ? req.body.comment : '',
      // notas enviadas, no formato plano item_<id>_<aspecto>
      item: (productId, key) => req.body[`item_${productId}_${key}`],
    };

    let payload;
    try {
      payload = await parseAndValidate(req.body);
    } catch (errors) {
      // `errors` é um array de mensagens de validação (ou um erro inesperado)
      if (!(errors instanceof Array)) {
        console.error('Erro inesperado na validação do POST /avaliar:', errors);
        return next(errors);
      }
      const products = await db.listActiveProducts().catch(() => []);
      return res.status(422).render('avaliar', { title: "Avalie os produtos — Na'Guará", products, errors, values });
    }

    const { fullName, comment, items } = payload;

    try {
      const review = await db.createReview({ fullName, comment, items });
      res.redirect(`/avaliar/obrigado?ref=${review.id}`);
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------------------
  // Confirmação
  // ---------------------------------------------------------------------------
  router.get('/avaliar/obrigado', (req, res) => {
    // `ref` é apenas cosmético (nº da avaliação) e só é aceito se numérico
    const ref = /^\d+$/.test(String(req.query.ref || '')) ? req.query.ref : null;
    res.render('obrigado', { title: "Obrigado — Na'Guará", ref });
  });

  return router;
};

// =============================================================================
// Validação dos dados do formulário
// =============================================================================

/**
 * Transforma `req.body` no payload persistido:
 *   { fullName: string, comment: string|null,
 *     items: [{ productId, ratings: { sabor, temperatura, apresentacao, atendimento, custo_beneficio } }] }
 *
 * Lança um array de mensagens de erro em caso de problema (HTTP 422).
 */
async function parseAndValidate(body) {
  const errors = [];
  const fullName = sanitizeText(body.full_name, 5, 120);
  if (fullName === null) {
    errors.push('Informe seu nome completo (de 5 a 120 caracteres).');
  }

  const commentRaw = sanitizeComment(body.comment);
  if (commentRaw === null) {
    errors.push(`O comentário deve ter no máximo ${2000} caracteres.`);
  }

  // Produtos marcados: body.picked[] = [productId, …], notas: body.item_<id>_<aspecto>
  const picked = [].concat(
    typeof body.picked === 'string' ? [body.picked] : Array.isArray(body.picked) ? body.picked : [],
  );
  const productIds = [...new Set(picked
    .map(v => Number.parseInt(v, 10))
    .filter(v => Number.isInteger(v) && v > 0))];
  const itemNames = productId => key => `item_${productId}_${key}`;

  if (productIds.length === 0) {
    errors.push('Selecione pelo menos um produto para avaliar.');
  } else if (productIds.length > 10) {
    errors.push('Você pode avaliar no máximo 10 produtos por avaliação.');
  } else {
    // Tudo precisa ser um produto existente e ativo
    const known = await db.getActiveProductsByIds(productIds);
    const knownIds = new Set(known.map(p => p.id));
    if (!productIds.every(id => knownIds.has(id))) {
      errors.push('Produto inexistente ou indisponível.');
    }

    if (errors.length === 0) {
      for (const productId of productIds) {
        for (const key of config.aspectKeys) {
          const note = Number.parseInt(body[itemNames(productId)(key)], 10);
          if (!Number.isInteger(note) || note < 1 || note > 5) {
            errors.push(`Dê uma nota de 1 a 5 em "${labelOf(key)}" para todos os produtos.`);
            break;
          }
        }
        if (errors.length > 0) break;
      }
    }
  }

  if (errors.length > 0) {
    throw errors;
  }

  return {
    fullName,
    comment: commentRaw === '' ? null : commentRaw,
    items: productIds.map(productId => {
      const ratings = {};
      for (const key of config.aspectKeys) {
        ratings[key] = Number.parseInt(body[itemNames(productId)(key)], 10);
      }
      return { productId, ratings };
    }),
  };
}

/** Normaliza e valida texto (pedidos de nome, mínimo de caracteres). */
function sanitizeText(value, min, max) {
  if (typeof value !== 'string') return null;
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length < min || collapsed.length > max) return null;
  return collapsed;
}

/** Comentário opcional: normaliza espaços em branco e limita tamanho. */
function sanitizeComment(value) {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned.length > 2000 ? null : cleaned;
}

function labelOf(key) {
  const found = config.aspects.find(a => a.key === key);
  return found ? found.label.toLowerCase() : key;
}
