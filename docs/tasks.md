# Tasks: Hellen Martins Brows

## Produto e Planejamento

- [x] Definir MVP de agendamento para profissional de sobrancelhas.
- [x] Criar PRD.
- [x] Criar tech spec.
- [x] Criar task list.
- [x] Criar design doc.

## Frontend

- [x] Criar app React/Vite em `Projetos/hellen-brows`.
- [x] Implementar landing page responsiva.
- [x] Implementar catalogo de servicos com fallback local.
- [x] Implementar formulario de agendamento.
- [x] Implementar login/cadastro Supabase.
- [x] Implementar area segura com listagem por RLS.
- [x] Criar arte visual original para hero.
- [x] Implementar painel admin com filtros, status e dados completos de pedidos.
- [x] Implementar editor admin de catalogo de servicos.
- [x] Melhorar primeira experiencia da cliente com instrucoes e estado vazio.
- [x] Separar tela propria de auth em `/auth`.
- [x] Adicionar confirmacao por email, reenvio de confirmacao e recuperacao de senha.
- [x] Exigir login para solicitar horario.
- [x] Adicionar calendario com horarios ocupados/desabilitados.
- [x] Reorganizar rotas publicas em `/servicos`, `/agendamento` e `/confirmacao`.
- [x] Reorganizar painel admin por rotas operacionais.
- [x] Adicionar dashboard com faturamento, clientes, estoque baixo e pendencias.
- [x] Adicionar ficha detalhada de cliente com preferencias e anotacoes profissionais.
- [x] Adicionar area financeira por atendimento.
- [x] Adicionar produtos, estoque e movimentacoes.
- [x] Reposicionar a home como studio + plataforma de agenda/gestao inspirada no PRD.
- [x] Criar rota `/app` para apresentar a experiencia do aplicativo.
- [x] Adicionar PWA instalavel com manifest, service worker e atalhos.
- [x] Separar no produto o que e publico, cliente logada, admin e clientes cadastradas no CRM.
- [x] Atualizar identidade visual da landing com estilo preto/dourado e novos assets de marca.
- [x] Ajustar fase inicial para landing com WhatsApp publico e sistema privado admin-first.

## Supabase

- [x] Criar schema SQL com `service_catalog`, `bookings` e `admin_profiles`.
- [x] Criar politicas RLS.
- [x] Criar script de aplicacao do schema.
- [x] Promover usuario admin real depois que a conta for criada no Auth.
- [x] Confirmar email da conta admin existente.
- [x] Bloquear agendamentos anonimos por RLS.
- [x] Impedir dois pedidos ativos no mesmo dia e horario.
- [x] Criar `clients`, `payments`, `products` e `stock_movements`.
- [x] Adicionar RLS e grants explicitos para novas tabelas operacionais.
- [x] Sincronizar fichas de clientes a partir de agendamentos.

## Infra

- [x] Preparar `.env.example` sem segredos.
- [x] Aplicar schema no projeto Supabase informado.
- [x] Publicar repositorio GitHub publico.
- [x] Configurar variaveis na Vercel.
- [x] Deploy de producao na Vercel.

## QA

- [x] `npm run lint`.
- [x] `npm run build`.
- [x] Verificar que `.env.local` e segredos nao entraram no git.
- [x] Smoke test do deploy.
