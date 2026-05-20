# PRD: Ellen Martins Brows

## Resumo

Criar um site publico para uma profissional de sobrancelhas com foco em capturar leads do Instagram, apresentar servicos premium e permitir pedidos de agendamento com dados salvos no Supabase.

## Objetivo

Transformar visitantes vindos do Instagram em pedidos de horario organizados, reduzindo conversas repetitivas por direct e criando uma base segura de clientes/agendamentos.

## Publico

- Mulheres que buscam design de sobrancelhas natural, sofisticado e personalizado.
- Clientes recorrentes que querem reagendar rapidamente.
- Profissional/admin que precisa consultar pedidos recebidos.

## Problemas

- O Instagram inspira desejo, mas nao organiza agenda nem dados.
- Leads chegam por direct com informacoes incompletas.
- Uma profissional solo precisa de fluxo simples, bonito e confiavel.

## Solucao

Um site responsivo com narrativa beauty editorial, menu de servicos, formulario de agendamento, login Supabase e area protegida para consultar pedidos.

## Escopo MVP

- Landing page com proposta de valor e diferenciais.
- Cards de servicos com duracao e valor.
- Formulario de agendamento com nome, email, WhatsApp, servico, data, horario e observacoes.
- Salvamento do pedido em `bookings` no Supabase.
- Auth por email/senha via Supabase.
- Area segura que mostra pedidos conforme RLS.
- Schema SQL com RLS, catalogo de servicos e perfil admin.
- Deploy publico na Vercel e repositorio publico no GitHub.

## Fora de Escopo Inicial

- Pagamento online.
- Confirmacao automatica por WhatsApp.
- Sincronizacao com Google Calendar.
- Multiunidade ou multiprofissional.
- Upload de fotos por cliente.

## Requisitos Funcionais

- A visitante consegue entender os servicos em ate 30 segundos.
- A visitante consegue enviar um pedido de agendamento sem login.
- Uma cliente autenticada consegue ver os proprios pedidos.
- Uma conta admin cadastrada em `admin_profiles` consegue ver todos os pedidos.
- O catalogo de servicos pode vir do Supabase e tem fallback local.

## Requisitos Nao Funcionais

- Build estatico hospedavel na Vercel.
- Nenhum segredo commitado.
- RLS ativo em tabelas publicas.
- Layout responsivo para mobile e desktop.
- Contraste adequado e campos acessiveis.

## Metricas de Sucesso

- Taxa de clique em `Agendar agora`.
- Numero de pedidos salvos em `bookings`.
- Percentual de pedidos com telefone e email validos.
- Tempo medio para a profissional confirmar um pedido.

## Riscos

- Credenciais expostas fora do app precisam ser rotacionadas se forem publicadas.
- Agendamento sem disponibilidade real pode exigir confirmacao manual.
- Auth por email/senha pode depender de configuracao SMTP/confirmacao no Supabase.
