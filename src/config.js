// =============================================================================
// Configuração compartilhada da aplicação
// =============================================================================

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',

  port: Number(process.env.PORT) || 3000,

  // Conexão com o PostgreSQL
  databaseUrl: process.env.DATABASE_URL ||
    'postgresql://naguara:naguara@localhost:5432/naguara',
};

// Aspectos avaliados em estrelas (escala 1 a 5) — usados no formulário,
// na validação, no SQL e na exibição das notas
config.aspects = [
  { key: 'sabor',           label: 'Sabor' },
  { key: 'temperatura',     label: 'Temperatura' },
  { key: 'apresentacao',    label: 'Apresentação' },
  { key: 'atendimento',     label: 'Atendimento' },
  { key: 'custo_beneficio', label: 'Custo-benefício' },
];

const aspectKeys = config.aspects.map(a => a.key);
config.aspectKeys = aspectKeys;

module.exports = config;
