# Design: Implementação P0/P1/P2 Hellen Brows

## Decisão

Implementar os três blocos do PRD em camadas, começando pelos riscos financeiros e de testes. A refatoração ampla do `App.tsx` não entra como big bang; ela será preparada com extrações pequenas e estados pontuais para evitar regressão sem cobertura suficiente.

## Abordagem escolhida

1. Estabilizar pagamento, webhook, banco e testes.
2. Endurecer dados/admin/ownership e expiração de sinal.
3. Aplicar melhorias UX/operacionais de baixo risco e atualizar documentação.

Essa ordem reduz o risco antes de mexer em experiência e estrutura visual.

## Backend e Pagamentos

- `server/payments.ts` passa a validar JSON, limitar body, retornar `400`/`413`, definir `Cache-Control: no-store` e oferecer helper de fetch com timeout.
- `api/create-deposit-checkout.ts` passa a ser idempotente por booking/provedor e a lidar melhor com falha de rede/Asaas.
- `api/asaas-webhook.ts` passa a reprocessar eventos duplicados ainda não processados, verificar erro em todos os writes, impedir regressão de `paid` e validar eventos pagos com consulta server-to-server ao Asaas.

## Banco

- `booking_payments` ganha constraint/trigger para manter ownership igual ao booking.
- Criação de checkout fica protegida por índice único parcial para um pagamento pendente por booking/provedor.
- Reservas vencidas em `awaiting_deposit` ganham função de expiração explícita para liberar slots.
- Admin ganha base de papel `owner/admin` sem remover compatibilidade operacional atual.

## Frontend

- Melhorar estados de erro/loading onde hoje consultas críticas falham silenciosamente.
- Reutilizar disponibilidade no fluxo de remarcação para evitar seleção de slot ocupado quando possível.
- Substituir confirmações destrutivas por modal acessível simples.
- Adicionar fallback visual para imagem de serviço quebrada e pequenos ajustes ARIA em calendário/abas.

## Testes e CI

- Adicionar Vitest para helpers e handlers serverless com mocks controlados.
- Cobrir body inválido/grande, criação de checkout idempotente e webhook pago/expirado/duplicado.
- Adicionar workflow GitHub com install, lint, build e test.

## Documentação

- Atualizar README, PRD e Tech Spec para refletir login obrigatório, sinal Asaas, webhook, operação, rollback e runbook básico.

## Status da implementação

- Pagamento/webhook: helpers serverless, idempotência, redacao de payload, validacao de webhook e protecao contra multiplos pendentes implementados.
- Banco/admin: papéis `owner/admin`, ownership de pagamento, expiração explicita e policies ajustadas no schema.
- Testes/CI: Vitest e workflow GitHub adicionados.
- UX/docs: retorno do checkout tratado em `/cliente`, modal acessível para acoes destrutivas, fallback visual de imagem e documentacao operacional atualizada.
- Pendencias manuais: configurar secrets na Vercel, cadastrar webhook no Asaas, aplicar schema no Supabase e validar login real de cliente/admin antes de release.

## Fora desta implementação

- WhatsApp API paga.
- Coleta de cartão no app.
- Redesign completo.
- Refatoração total do `App.tsx`.
- Deploy automático.
