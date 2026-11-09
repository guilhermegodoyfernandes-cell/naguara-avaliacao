# Na'Guará — Avaliação de Produtos (Web PWA)

Website **monolítico** para o público avaliar os produtos da comida venezuelana
Na'Guará (arepas, empanadas e tequeños), com base no visual do banner
da marca. Stack: **Express + PostgreSQL + EJS**, renderização no servidor e
 **PWA** instalável (funciona off-line em modo leitura, responsivo no celular).

## Funcionalidades

- **Página inicial** com os produtos e as últimas avaliações publicadas.
- **Formulário de avaliação** (`/avaliar`) com:
  - Nome completo;
  - Seleção de um ou mais produtos;
  - Notas em **estrelas (1 a 5)** por produto nos aspectos:
    Sabor, Temperatura, Apresentação, Atendimento e Custo-benefício;
  - Campo de **comentários e/ou sugestões** (opcional);
  - Validação client + server + mensagem de sucesso com número de protocolo.
- **PWA**: `manifest.webmanifest`, service worker com cache offline
  (`/offline.html`), ícones gerados a partir do banner e botão
  "Instalar app".
- Produtos são **cadastrados manualmente no banco** (sem tela de admin) —
  veja `db/seed.sql`.

## Como rodar

1. Configure o PostgreSQL e copie as variáveis de ambiente:

   ```bash
   cp .env.example .env
   # edite DATABASE_URL, ex.: postgresql://usuario:senha@localhost:5432/naguara
   ```

2. Instale as dependências e aplique o schema + seed no banco:

   ```bash
   npm install
   npm run db:setup
   ```

3. Inicie o servidor:

   ```bash
   npm start        # produção
   npm run dev      # desenvolvimento (reinicia a cada mudança de arquivo)
   ```

4. Abra `http://localhost:3000` e teste o PWA pelo Chrome/Android
   (instalação) ou simule off-line pelo DevTools.

## Testando a instalação do PWA

- **Android/Chrome**: menu ⋮ → "Instalar app"/"Adicionar à tela inicial".
- **iPhone/Safari**: Compartilhar → "Adicionar à Tela de Início" (o site
  orienta o usuário com o botão "Instalar app" visível no Safari iOS).

## Estrutura

```
.
├── db/
│   ├── schema.sql             # tabelas: products, reviews, review_items
│   └── seed.sql               # cadastro manual de produtos
├── public/                    # estáticos do PWA
│   ├── css/app.css, js/app.js
│   ├── sw.js, manifest.webmanifest, offline.html
│   └── icons/                 # ícones do PWA
├── src/
│   ├── server.js              # bootstrap (aplica schema e sobe o HTTP)
│   ├── app.js                 # monta o Express (helmet, rate-limit, rotas)
│   ├── config.js              # env + aspectos avaliados
│   ├── db.js                  # pool pg e queries
│   ├── routes/web.js          # rotas GET/POST + validação
│   └── scripts/apply-sql.js   # utilitário do `npm run db:setup`
└── views/                     # EJS (index, avaliar, obrigado, error, partials)
```

## Notas técnicas

- Escala usada é 1–5 estrelas, armazenada como `SMALLINT` com `CHECK` de
  intervalo (também validada no servidor antes de inserir).
- Transação com `INSERT ... SELECT * FROM UNNEST` garante
  1 review + N itens atômicos.
- Rate limit: 10 envios de avaliação por IP a cada 15 min (anti-spam).
- O comentário é opcional; fica registrado em `reviews.comment`.
