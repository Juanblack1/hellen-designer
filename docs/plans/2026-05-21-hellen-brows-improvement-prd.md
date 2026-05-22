# PRD: Melhorias Prioritárias Hellen Brows

## Tipo de demanda e profundidade

Feature/processo de melhoria | profundidade completa.

Esta rodada consolida a auditoria do projeto Hellen Brows em um plano priorizado para a próxima etapa. Não inclui implementação nem deploy automático.

## Contexto

O produto atual inclui landing page, autenticação, área do cliente, painel admin, Supabase Auth/Postgres/Storage, agendamento autenticado, fila manual de WhatsApp, upload de fotos de serviços e sinal de reserva via Asaas Checkout hospedado.

A verificação fresca passou em `npm run lint`, `npm run build` e smoke público nas rotas `/`, `/cliente` e `/admin` sem erros de console. Mesmo assim, a auditoria encontrou riscos P0 no processamento financeiro, testes e documentação.

## Objetivo de negocio

Preparar o Hellen Brows para operação real com maior confiabilidade, segurança financeira, clareza operacional e menor risco de regressão.

## Usuario e dor

- Cliente final precisa agendar e pagar sinal sem confusão.
- Hellen/admin precisa operar agenda, serviços, pagamentos e WhatsApp sem divergência.
- Mantenedor técnico precisa evoluir o sistema com testes, observabilidade e arquitetura modular.

## Escopo desta rodada

- P0: corrigir idempotência, reprocessamento, validação server-to-server e estados do webhook Asaas.
- P0: impedir múltiplos checkouts pendentes para o mesmo agendamento.
- P0: criar testes automatizados mínimos e CI.
- P1: hardening de papéis admin, RLS, ownership financeiro e expiração automática de sinal.
- P1: modularizar frontend, melhorar estados de erro/loading e ativar tipagem mais forte.
- P2: melhorar acessibilidade, copy pt-BR, documentação, observabilidade e operação.

## Nao-escopo

- Implementar WhatsApp API paga.
- Coletar dados de cartão no app.
- Trocar Asaas sem decisão posterior.
- Fazer deploy automático.
- Colocar segredos em arquivos do repositório.

## Requisitos funcionais

| ID | Prioridade | Requisito |
| --- | --- | --- |
| RF-01 | P0 | Webhook deve reprocessar eventos duplicados quando `processed_at` estiver vazio. |
| RF-02 | P0 | Webhook deve validar pagamento no Asaas antes de confirmar booking. |
| RF-03 | P0 | Banco/API devem garantir apenas um pagamento `pending` por booking/provedor. |
| RF-04 | P0 | Status financeiro não pode regredir após `paid`. |
| RF-05 | P0 | APIs devem limitar body, validar JSON e responder erros HTTP corretos. |
| RF-06 | P0 | Testes devem cobrir checkout, webhook, RLS e conflitos de agenda. |
| RF-07 | P1 | Reservas aguardando sinal devem expirar automaticamente. |
| RF-08 | P1 | Admins devem ter papéis owner/admin com auditoria e proteção do último owner. |
| RF-09 | P1 | `booking_payments` deve herdar ownership real de `bookings`. |
| RF-10 | P1 | UI deve exibir loading, vazio, erro e retry em consultas críticas. |
| RF-11 | P1 | Remarcação deve bloquear horários ocupados antes do submit. |
| RF-12 | P2 | Calendário, abas e feedbacks devem ser acessíveis por teclado/leitor de tela. |
| RF-13 | P2 | Admin deve ter paginação/filtros server-side para histórico. |
| RF-14 | P2 | README/PRD/tech spec devem refletir o produto atual. |

## Requisitos nao funcionais

- Segurança e PCI DSS: manter checkout hospedado, sem dados brutos de cartão no app.
- LGPD: minimizar payloads financeiros salvos e definir retenção.
- Confiabilidade: webhook idempotente, observável e sem falhas parciais silenciosas.
- Manutenibilidade: módulos menores, hooks testáveis, tipos Supabase gerados e TypeScript strict gradual.
- Acessibilidade: navegação por teclado e feedback semântico nos fluxos críticos.
- Operação: documentação de deploy, rollback, sandbox/prod Asaas, webhook e rotação de segredos.

## Criterios de aceite

- Evento pago com falha parcial não marca `processed_at` e é reprocessado no retry.
- Evento duplicado já processado retorna sucesso sem alterar estado; duplicado não processado tenta concluir.
- Pagamento `paid` não regride para `expired`, `canceled` ou `failed`.
- Duas chamadas simultâneas de checkout não criam dois pagamentos pendentes.
- Payload grande retorna `413`; JSON inválido retorna `400`.
- Confirmação do booking só ocorre após validação server-to-server no Asaas.
- Reserva vencida em `awaiting_deposit` vira `deposit_expired` automaticamente.
- Usuário comum não acessa dados de outro usuário em testes RLS.
- Admin não owner não remove o último owner.
- UI mostra erro/retry quando Supabase falha em agenda, serviços ou política.
- Calendário e abas funcionam com teclado e têm semântica ARIA adequada.
- CI executa lint, build e testes em todo PR.

## Riscos e dependencias

- Campos e endpoints Asaas precisam ser confirmados em sandbox.
- Teste autenticado real depende de credenciais controladas.
- RLS/roles devem ser testados em ambiente de desenvolvimento antes de produção.
- Refatoração do `App.tsx` deve vir depois dos testes P0 para reduzir regressão.

## Metricas de sucesso

- 0 pagamentos Asaas pagos sem atualização correspondente no banco.
- 0 bookings com múltiplos pagamentos pendentes.
- 100% dos fluxos P0 com teste automatizado.
- 0 reservas vencidas bloqueando slot após expiração.
- CI obrigatório em PRs.

## Decisoes em aberto

- Sandbox ou produção Asaas no primeiro go-live real?
- Qual ferramenta de observabilidade será adotada?
- Haverá papel `staff` além de `owner` e `admin`?
- Bucket de imagens continuará público ou migrará para signed URLs?
- Roteamento continuará manual ou migrará para React Router?
