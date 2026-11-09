// =============================================================================
// Aplicação Express — servidor monolítico (rotas + views + estáticos)
// =============================================================================

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
const config = require('./config');
const db = require('./db');
const webRoutes = require('./routes/web');

function createApp() {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));

  // Segurança e compressão de resposta
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());

  // Formulários enviados via POST (application/x-www-form-urlencoded)
  app.use(express.urlencoded({ extended: true, limit: '200kb' }));

  // Arquivos estáticos
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.env === 'production' ? '7d' : 0,
  }));
  // O banner da marca vive em /images na raiz do projeto
  app.use('/img', express.static(path.join(__dirname, '..', 'images'), {
    maxAge: config.env === 'production' ? '7d' : 0,
  }));

  // Torna dados básicos e helpers disponíveis em todas as views
  app.locals.site = {
    name: "Na'Guará",
    tagline: 'Comida Venezolana',
  };
  app.locals.config = config; // aspectos de avaliação usados nas views

  // Dispara throttling apenas no envio de avaliações (anti-spam)
  const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,                  // até 10 avaliações por IP por janela
    standardHeaders: true,
    legacyHeaders: false,
    message:
      'Você enviou muitas avaliações em pouco tempo. Tente novamente mais tarde.',
  });

  app.use('/', dbAwareRouter());
  app.use('/', webRoutes(submitLimiter));

  return app;
}

/**
 * Router que valida a conexão com o banco antes das rotas dinâmicas.
 * Se o banco estiver fora do ar, devolve a página de erro amigável.
 */
function dbAwareRouter() {
  const router = express.Router();
  router.use((req, res, next) => {
    db.ping()
      .then(() => next())
      .catch(() => {
        res.status(503).render('error', {
          title: 'Manutenção',
          code: 503,
          message:
            'Estamos com dificuldades para falar com o banco de dados. ' +
            'Por favor, tente novamente em alguns minutos.',
        });
      });
  });
  return router;
}

module.exports = createApp;
