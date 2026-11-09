-- =============================================================================
-- Na'Guará — Sistema de Avaliação de Produtos
-- Banco: PostgreSQL
--
-- Os produtos são cadastrados manualmente via banco de dados
-- (veja db/seed.sql). O site apenas exibe e recebe avaliações.
-- =============================================================================

-- Produtos vendidos pela Na'Guará (cadastrados manualmente)
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        TEXT        NOT NULL UNIQUE,
    description TEXT,                                  -- Descrição curta exibida no site
    category    TEXT        NOT NULL DEFAULT 'Prato',  -- Ex.: Arepa, Tequeño
    image_url   TEXT,                                  -- Foto opcional do produto
    active      BOOLEAN     NOT NULL DEFAULT TRUE,     -- Aparece no site quando TRUE
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);

-- Uma avaliação = 1 cliente + 1 comentário/sugestão + N itens avaliados
CREATE TABLE IF NOT EXISTS reviews (
    id         SERIAL PRIMARY KEY,
    full_name  TEXT        NOT NULL,
    comment    TEXT,                                  -- Comentários e/ou sugestões
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews (created_at DESC);

-- Notas por produto avaliado (todos os aspectos obrigatórios, escala 1–5)
CREATE TABLE IF NOT EXISTS review_items (
    id              SERIAL PRIMARY KEY,
    review_id       INTEGER  NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    product_id      INTEGER  NOT NULL REFERENCES products(id),
    sabor           SMALLINT NOT NULL CHECK (sabor           BETWEEN 1 AND 5),
    temperatura     SMALLINT NOT NULL CHECK (temperatura     BETWEEN 1 AND 5),
    apresentacao    SMALLINT NOT NULL CHECK (apresentacao    BETWEEN 1 AND 5),
    atendimento     SMALLINT NOT NULL CHECK (atendimento     BETWEEN 1 AND 5),
    custo_beneficio SMALLINT NOT NULL CHECK (custo_beneficio BETWEEN 1 AND 5),

    -- O mesmo produto não pode ser avaliado duas vezes na mesma avaliação
    UNIQUE (review_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_review_items_review  ON review_items (review_id);
CREATE INDEX IF NOT EXISTS idx_review_items_product ON review_items (product_id);
