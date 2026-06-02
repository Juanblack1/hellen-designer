# Hellen Designer

Landing publica e painel privado para Hellen Martins, designer de sobrancelhas.

## URLs

- Site publico: `https://hellen-designer.vercel.app`
- Painel admin: `https://hellen-designer-admin.vercel.app`
- GitHub: `https://github.com/Juanblack1/hellen-designer`

O produto tem apenas duas telas reais:

- `https://hellen-designer.vercel.app`: landing com marca, WhatsApp, Instagram, servicos, precos e fotos/artes publicadas.
- `https://hellen-designer-admin.vercel.app`: painel privado para Hellen gerir agenda, clientes, valores recebidos, servicos/precos e fotos da landing.

Nao existe mais area da cliente, checkout, sinal Asaas ou agendamento automatico publico. A cliente chama a Hellen pelo WhatsApp; a Hellen organiza tudo no admin. A landing publica nao mostra link para login administrativo.

## Stack

- React 19 + TypeScript + Vite
- Supabase Auth, Postgres, RLS e Storage
- Vercel para hospedagem
- Capacitor Android para APK instalavel
- Vitest + ESLint
- Design system criado no Stitch MCP

## Stitch

O design desta versao foi criado no Stitch no projeto `Hellen Designer`.

- Project ID: `1155312581449594488`
- Design system asset: `4979033361024d29a058739a4ada8675`
- Arquivos locais: `.stitch/DESIGN.md`, `.stitch/metadata.json`, `.stitch/designs/`

## Variaveis de ambiente

Crie `.env.local` a partir de `.env.example`.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_PUBLIC_SITE_URL=https://hellen-designer.vercel.app
VITE_ADMIN_SITE_URL=https://hellen-designer-admin.vercel.app
SUPABASE_DB_URL=<postgres-connection-string>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
PUBLIC_SITE_URL=https://hellen-designer.vercel.app
```

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` ficam no cliente. `SUPABASE_DB_URL` e `SUPABASE_SERVICE_ROLE_KEY` nunca devem ir para o front-end.

## Banco de dados

Com `SUPABASE_DB_URL` configurado em ambiente seguro:

```bash
npm run db:push
```

O schema cria:

- `admin_profiles`
- `business_profile`
- `services`
- `gallery_items`
- `clients`
- `appointments`
- `payment_transactions`
- `business_hours`
- `availability_rules`
- `availability_exceptions`
- `schedule_settings`
- `products`
- `stock_movements`
- bucket Storage `landing-media`

Tambem cria regras transacionais para bloquear sobreposicao de agenda e registrar estoque/pagamentos sem estado parcial.

Depois de criar a primeira conta no Supabase Auth, promova a conta da Hellen pelo SQL editor:

```sql
insert into public.admin_profiles (user_id, role)
values ('AUTH_USER_ID_AQUI', 'owner')
on conflict (user_id) do nothing;
```

## Desenvolvimento

```bash
npm install
npm run dev
```

## APK Android

O app Android usa Capacitor e carrega o painel admin publicado em `https://hellen-designer-admin.vercel.app`.
Assim, atualizacoes publicadas no admin/site entram no app instalado sem reinstalar o APK.
Se o admin online nao carregar, o app mostra uma pagina local de erro de conexao.

```bash
npm run mobile:sync
```

Build local de debug no Windows, se Android SDK e JDK 21 estiverem instalados:

```bash
npm run android:build:debug
```

O GitHub Actions gera APK e AAB assinados em `Android Release`. O AAB e usado pela Google Play Store.
Quando os secrets do Firebase estiverem configurados, o workflow envia o APK assinado para Firebase App Distribution.
Quando o secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` estiver configurado, o workflow envia o AAB para a faixa interna da Play Store.
Usuarios que instalaram pela Play Store recebem atualizacoes conforme as preferencias de auto-update do celular.
O app tambem usa Google Play In-App Updates para pedir uma atualizacao imediata quando a Play Store informar que existe uma versao nova disponivel.

Os secrets exigidos para assinar Android sao:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Secrets opcionais para distribuir no Firebase App Distribution:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_ANDROID_APP_ID`
- `FIREBASE_TESTER_GROUPS`
- `FIREBASE_TESTERS`

`FIREBASE_TESTER_GROUPS` e `FIREBASE_TESTERS` sao destinos de distribuicao. Configure pelo menos um deles.

Secrets opcionais para publicar na Play Store e embutir configuracao de fallback:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

APK instalado manualmente ou via Firebase App Distribution nao atualiza silenciosamente como a Play Store; a tester recebe notificacao/link e confirma a instalacao. Para auto-update real de loja, instale pela faixa interna/fechada/producao da Google Play.

O Manifest desativa backup, bloqueia trafego HTTP claro e usa apenas certificados raiz do sistema.

## Verificacao

```bash
npm run lint
npm test
npm run build
```

## Rotas

- `https://hellen-designer.vercel.app`: landing publica.
- `https://hellen-designer-admin.vercel.app`: painel privado em URL separada.
- `/`, `/admin` e `/auth`: atalhos locais de desenvolvimento; em producao `/admin` e `/auth` devem redirecionar para a URL admin.
