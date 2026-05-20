# Design: Sistema Operacional De Agendamentos

## Contexto

O Hellen Martins Brows já possui vitrine, autenticação, calendário digital, horários configuráveis por dia da semana, bloqueios e painel admin. A próxima evolução transforma o agendamento em um fluxo operacional completo para uma profissional solo.

## Fontes E Squad

- Square Appointments: booking online, disponibilidade, lembretes, políticas anti no-show, perfis de clientes e relatórios.
- GlossGenius: gestão de serviços, confirmação, depósitos, formulários, histórico/notas, waitlist, relatórios e marketing.
- OpenSquad software-factory: product, UX, tech/data/security.

## Escopo Aprovado

1. Políticas de agendamento editáveis pelo admin.
2. Resumo de confirmação antes de gravar o agendamento.
3. Cancelamento e remarcação pela cliente dentro da política.
4. Status profissional: `pending`, `confirmed`, `completed`, `canceled_by_client`, `canceled_by_admin`, `no_show`.
5. Histórico/auditoria de mudanças de status.
6. Notas internas admin-only.
7. Fila manual de mensagens WhatsApp, sem promessa de envio automático.
8. Relatórios simples no admin.

## Não Escopo

- PIX automático.
- WhatsApp Business API real.
- Google Calendar.
- Programa de fidelidade.
- Multi-profissionais.
- Estoque.
- Galeria antes/depois.

## Arquitetura

Manter React/Vite/TypeScript no frontend e Supabase Auth/Postgres/RLS como backend direto. Regras críticas devem ficar no banco, não apenas na UI.

## Dados

- `booking_policies`: política ativa de cancelamento, remarcação, tolerância e texto comercial.
- `booking_status_events`: trilha append-only de mudanças de status.
- `booking_internal_notes`: notas privadas do admin.
- `booking_notification_queue`: ações manuais de WhatsApp/email/in-app.
- `bookings`: campos adicionais para cancelamento, confirmação, conclusão e no-show.

## UX

- Cliente agenda em etapas: serviço, data, horário, dados, resumo e confirmação.
- Cliente vê meus agendamentos com ações permitidas.
- Admin vê cards de operação, ações pendentes, notas internas e relatórios.
- Mensagens devem evitar termos técnicos e explicar o próximo passo.

## Segurança

- Cliente só vê os próprios agendamentos.
- Cliente não vê notas internas nem relatórios.
- Admin gerencia políticas, status, notas, mensagens e relatórios.
- Banco valida disponibilidade, data passada, status e prazos de política.

## Critérios De Aceite

- Cliente precisa aceitar política para confirmar.
- Cliente não consegue cancelar/remarcar fora do prazo configurado.
- Status finalizado/cancelado não volta pelo fluxo comum.
- Toda mudança de status relevante gera histórico.
- Notas internas não aparecem para cliente.
- Admin vê pendências de mensagem manual e pode marcar como enviada.
- Admin vê métricas básicas de agenda e receita estimada.
- Build, lint, smoke local e smoke produção passam antes do fechamento.
