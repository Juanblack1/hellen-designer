# Hellen Martins Brows

Site publico e PWA de gestao admin-first para o studio Hellen Martins Brows, construido com React, Vite, Supabase Auth/Postgres e deploy na Vercel.

Live: https://hellen-brows.vercel.app

GitHub: https://github.com/Juanblack1/hellen-brows

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth e Postgres com RLS
- Vercel Functions para checkout e webhook
- Asaas Checkout hospedado para sinal de reserva
- Vitest + GitHub Actions para verificacao continua
- CSS autoral com direcao beauty editorial
- PWA instalavel com manifest, service worker e atalhos de app
- Vercel para hospedagem

## Escopo atual

Nesta fase, a cliente usa a landing publica para conhecer servicos e chamar a Hellen pelo WhatsApp. O sistema operacional e privado para admin: calendario, clientes, pagamentos, produtos, estoque, relatorios e configuracoes. A area da cliente e o checkout autenticado ficam preparados no codigo para uma etapa futura, mas nao sao destaque publico agora.

## Variaveis de ambiente

Crie `.env.local` a partir de `.env.example`.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_PUBLIC_SITE_URL=https://hellen-brows.vercel.app
VITE_BOOKING_WHATSAPP=5511999999999
SUPABASE_DB_URL=<postgres-connection-string>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
PUBLIC_SITE_URL=https://hellen-brows.vercel.app
ASAAS_API_BASE_URL=https://api-sandbox.asaas.com
ASAAS_API_KEY=<server-only-asaas-api-key>
ASAAS_WEBHOOK_TOKEN=<server-only-asaas-webhook-token>
```

`VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL` e `VITE_PUBLIC_SITE_URL` sao usados no cliente. A seguranca dos dados depende das politicas RLS em `supabase/schema.sql`. Nunca exponha `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, access tokens ou senhas no repositorio.

## Pagamentos

O sinal de reserva usa Asaas Checkout hospedado. O site nao coleta dados de cartao; a cliente e redirecionada para o Asaas, e o status volta pelo webhook.

No painel admin, configure:

- se o sinal esta ativo;
- valor do sinal;
- tempo de expiracao do checkout.

Configure no Asaas um webhook de Checkout apontando para:

```text
https://hellen-brows.vercel.app/api/asaas-webhook
```

Eventos: `CHECKOUT_CREATED`, `CHECKOUT_CANCELED`, `CHECKOUT_EXPIRED`, `CHECKOUT_PAID`. O token configurado no webhook deve ser o mesmo valor de `ASAAS_WEBHOOK_TOKEN`.

Notas operacionais:

- `/api/create-deposit-checkout` reaproveita checkout pendente ativo e bloqueia multiplos pagamentos pendentes para o mesmo agendamento.
- `/api/asaas-webhook` e idempotente, reprocessa evento duplicado ainda nao finalizado e valida pagamento pago com consulta server-to-server ao Asaas.
- Eventos e respostas do provedor sao salvos com payload redigido; falhas de processamento ficam em `processing_error`.
- Se um pagamento expirar, use a funcao `expire_overdue_deposits()` ou altere o status pelo painel admin para liberar o horario.
- Em rollback, desative `deposit_required` no painel admin antes de remover variaveis do Asaas.

## Auth

No Supabase Dashboard, em Authentication > URL Configuration:

- Site URL: `https://hellen-brows.vercel.app`
- Redirect URL: `https://hellen-brows.vercel.app/auth?mode=sign-in`
- Redirect URL: `https://hellen-brows.vercel.app/auth?mode=reset-password`

Se os templates de email forem personalizados, use `{{ .RedirectTo }}` nos links de confirmacao e recuperacao, nao `{{ .SiteURL }}`. Isso evita links apontando para `localhost`.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Rotas

- `/`: vitrine publica.
- `/app`: apresentacao do aplicativo instalavel para gestao admin.
- `/servicos`: catalogo publico de servicos, valores e duracao.
- `/agendamento`: chamada publica para agendar pelo WhatsApp.
- `/confirmacao`: confirmacao visual depois do pedido de horario.
- `/auth`: entrada e recuperacao de senha para acesso admin.
- `/cliente`: pagina futura da cliente; hoje orienta atendimento pelo WhatsApp.
- `/admin`: dashboard administrativo.
- `/admin/agenda`: calendario operacional e bloqueios.
- `/admin/agendamentos`: lista completa de horarios, status, remarcacao e notas.
- `/admin/clientes`: fichas, historico e preferencias das clientes.
- `/admin/whatsapp`: fila manual de mensagens.
- `/admin/servicos`: catalogo, precos e fotos.
- `/admin/pagamentos`: financeiro por atendimento.
- `/admin/produtos`: produtos, estoque e movimentacoes.
- `/admin/relatorios`: indicadores simples.
- `/admin/configuracoes`: politicas, sinal e dados operacionais.

## Aplicativo instalavel

O projeto inclui `public/manifest.webmanifest` e `public/sw.js`, entao a rota `/app` pode ser instalada pelo navegador como aplicativo no celular, tablet ou desktop. O app usa a mesma base em nuvem da versao web e, nesta fase, prioriza painel admin, agenda operacional e CRM de clientes cadastradas.

## Banco de dados

Com `SUPABASE_DB_URL` definido em um ambiente seguro, aplique o schema:

```bash
npm run db:push
```

O schema cria e protege as tabelas operacionais de clientes, pagamentos, produtos e movimentacoes de estoque. Ele tambem faz backfill de `clients` a partir dos agendamentos existentes. Como novas tabelas no Supabase podem exigir grants explicitos para a Data API, `supabase/schema.sql` inclui `GRANT` para as novas tabelas junto com RLS.

Depois que a primeira conta admin existir no Supabase Auth, promova-a pelo SQL editor do Supabase. Use `owner` para a conta que pode gerenciar outros admins e `admin` para operacao diaria:

```sql
insert into public.admin_profiles (user_id, role)
values ('AUTH_USER_ID_AQUI', 'owner')
on conflict (user_id) do nothing;
```

## Verificacao

```bash
npm run lint
npm test
npm run build
```

O workflow `.github/workflows/ci.yml` executa install, lint, testes e build em pushes e pull requests.

## Documentos

- `docs/prd.md`
- `docs/techspec.md`
- `docs/tasks.md`
- `docs/plans/2026-05-19-hellen-brows-design.md`
- `docs/visual-prompts.md`
