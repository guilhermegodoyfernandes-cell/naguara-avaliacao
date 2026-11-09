-- =============================================================================
-- Cadastro manual de produtos (mantido diretamente no banco de dados).
-- Para adicionar um novo produto ao site, basta mais uma linha aqui.
-- =============================================================================

INSERT INTO products (name, description, category) VALUES
  ('Arepa de Carne Mechada', 'Arepa assada na chapa, recheada com carne mechada, queijo branco e abacate.', 'Arepa'),
  ('Arepa Reina Pepiada',    'O clássico: frango desfiado, abacate e maionese. Cremosa e gelada.',           'Arepa'),
  ('Arepa Dominó',           'Arepa com feijão preto temperado e queijo branco derretido.',                 'Arepa'),
  ('Arepa de Chicharrón',    'Arepa recheada com chacarina (barriga de porco crocante) e abacate.',         'Arepa'),
  ('Empanada de Queijo',     'Massa crocante de milho em formato de meia-lua com queijo derretido.',        'Empanada'),
  ('Tequeño de Queso',       'Massa dourada enrolada em queijo branco venezuelano. Crocantes e elásticos.', 'Tequeño'),
  ('Tequeño de Chocolate',   'Para fechar com chave de ouro: queijo + chocolate com açúcar na casquinha.',  'Tequeño')
ON CONFLICT (name) DO NOTHING;

-- Exemplo: adicionar um produto depois
-- INSERT INTO products (name, description, category) VALUES ('Cachapa', 'Panqueca de milho fresco com queijo de mão', 'Prato');

-- Exemplo: escondê-lo do site sem perder histórico
-- UPDATE products SET active = FALSE WHERE name = 'Arepa Dominó';
