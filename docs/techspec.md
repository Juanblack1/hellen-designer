# Tech Spec: Hellen Designer

## Escopo Atual

O produto tem duas superficies reais:

- `/`: landing publica com marca, servicos, valores, fotos publicadas e contato por WhatsApp/Instagram.
- URL admin dedicada: painel privado para agenda, clientes, financeiro, servicos, estoque, horarios e publicacao da landing.

Nao ha area da cliente, checkout publico, Asaas, webhook de pagamento ou agendamento automatico publico nesta versao.

## Arquitetura

- React 19 + TypeScript + Vite.
- Supabase Auth, Postgres, RLS e Storage.
- Vercel hospedando a SPA.
- Admin executa CRUD pelo cliente Supabase com chave anon publica, protegido por RLS.
- Operacoes com risco de estado parcial usam funcoes SQL transacionais chamadas via RPC.

## Frontend

- `src/App.tsx`: composicao atual da landing e do admin.
- `src/domain.ts`: tipos, dados padrao e regras puras de agenda, estoque e financeiro.
- `src/lib/supabase.ts`: inicializacao condicional do Supabase client.
- `src/App.css` e `src/index.css`: tokens de tema claro/escuro, responsividade e estilos do app.
- `public/sw.js` e `public/manifest.webmanifest`: PWA basico.

## Dados

Tabelas principais:

- `admin_profiles`: usuarios autorizados a operar o painel.
- `business_profile`: conteudo principal da landing.
- `services`: procedimentos, duracao, preco e publicacao.
- `gallery_items`: imagens publicadas na landing.
- `clients`: cadastro de clientes.
- `appointments`: agenda, status e estado financeiro do atendimento.
- `payment_transactions`: historico dos recebimentos.
- `business_hours`: janela geral por dia da semana.
- `availability_rules`: turnos configuraveis por dia da semana.
- `availability_exceptions`: bloqueios, feriados, ferias e disponibilidade especial.
- `schedule_settings`: regras gerais de agenda.
- `products`: estoque atual.
- `stock_movements`: historico de entradas, usos, vendas e ajustes.

## Regras Transacionais

- Trigger `appointments_prevent_overlap`: impede novos atendimentos ativos que sobreponham outro atendimento no mesmo dia.
- RPC `record_stock_movement`: bloqueia o produto, calcula o saldo, atualiza `products` e grava `stock_movements` na mesma transacao.
- RPC `record_appointment_payment`: bloqueia o atendimento, valida saldo, atualiza o recebimento e grava `payment_transactions` na mesma transacao.

Essas funcoes verificam `app_private.is_admin()` e so devem ter `execute` concedido para `authenticated` e `service_role`.

## RLS

- Leitura publica apenas para landing publicada: `business_profile`, `services`, `gallery_items` e arquivos do bucket `landing-media`.
- Tabelas operacionais sao restritas a usuarios autenticados que existam em `admin_profiles`.
- `admin_profiles` permite leitura do proprio perfil ou de admins; insercao de novos admins fica restrita a `owner`.
- Chave anon pode ser publica; a seguranca depende das policies e das RPCs com checagem de admin.

## Deploy e CI

- Branch de producao: `master`.
- Vercel deve publicar automaticamente commits da branch `master`.
- GitHub Actions roda lint, testes, audit de dependencias runtime e build em push para `master` e em pull requests.
- Headers de seguranca ficam em `vercel.json`.

## Verificacao Local

```bash
npm run lint
npm test
npm audit --omit=dev
npm run build
```

Quando `SUPABASE_DB_URL` estiver configurado em ambiente seguro:

```bash
npm run db:push
```
