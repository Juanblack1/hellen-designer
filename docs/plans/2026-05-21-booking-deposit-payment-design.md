# Design: Sinal De Reserva Com Asaas Checkout

## Contexto

O agendamento precisa cobrar um sinal para reduzir faltas e garantir que o horario seja reservado somente quando houver pagamento. A solucao deve ser simples, sem mensalidade fixa, adequada ao Brasil e sem expor dados de cartao no site.

## Decisao

- Usar Asaas Checkout como provedor principal.
- Cobrar um sinal configuravel pelo admin.
- Aceitar Pix e cartao no checkout hospedado do Asaas.
- Nao coletar, processar, transmitir ou armazenar dados brutos de cartao no app.
- Tratar "free" como sem mensalidade fixa; taxas por transacao continuam sendo responsabilidade do provedor.

## Fluxo Do Cliente

- Cliente entra logada em `/cliente`.
- Escolhe servico, data, horario e preenche dados.
- O site mostra o valor do sinal configurado pela Hellen.
- Ao confirmar, o sistema cria uma reserva temporaria com status `awaiting_deposit`.
- O backend cria uma sessao de checkout no Asaas e retorna o link.
- Cliente paga no ambiente hospedado do Asaas.
- Ao voltar para o site, a tela informa que a confirmacao depende do retorno do pagamento.
- O webhook do Asaas confirma o pagamento e libera a reserva para o fluxo normal de atendimento.

## Fluxo Do Admin

- Admin configura o valor do sinal no painel.
- O valor deve aceitar centavos, ter validacao minima e poder ser desativado apenas se a Hellen quiser voltar ao fluxo sem pagamento.
- Admin visualiza em cada agendamento: valor do sinal, status do pagamento, provedor, ID externo e data de pagamento.
- Admin nao ve dados de cartao.

## Dados

- `booking_policies` recebe campos de configuracao do sinal:
  - `deposit_required boolean`.
  - `deposit_amount_cents integer`.
  - `deposit_checkout_expiration_minutes integer`.
- `bookings.status` ganha `awaiting_deposit` para reservas temporarias.
- Nova tabela `booking_payments` registra apenas metadados seguros:
  - `booking_id`.
  - `provider`, inicialmente `asaas`.
  - `provider_checkout_id`.
  - `provider_payment_id` quando existir.
  - `status`.
  - `amount_cents`.
  - `checkout_url`.
  - `paid_at`, `expires_at`, `created_at`, `updated_at`.
  - `raw_event jsonb` sanitizado, sem dados de cartao.

## Backend

- Criar endpoint serverless `/api/create-deposit-checkout`.
- O endpoint valida o JWT do Supabase, revalida usuario, servico, horario, politica e valor do sinal no banco.
- O endpoint usa `ASAAS_API_KEY` somente no servidor.
- O endpoint cria o checkout Asaas com `externalReference` apontando para o pagamento interno.
- Criar endpoint `/api/asaas-webhook`.
- O webhook valida token secreto/configuracao do Asaas, aplica idempotencia e atualiza `booking_payments`.
- Se o pagamento for confirmado, o booking passa de `awaiting_deposit` para `pending` ou `confirmed`, respeitando `booking_policies.auto_confirm_enabled`.

## Expiracao

- O checkout deve expirar em um tempo configuravel, com padrao seguro como 30 minutos.
- Enquanto estiver `awaiting_deposit`, o horario deve aparecer como reservado para evitar corrida.
- Se expirar sem pagamento, o sistema deve marcar pagamento como `expired` e liberar o horario cancelando ou expirando a reserva.
- A expiracao pode ser tratada pelo webhook do Asaas e por uma rotina de limpeza via endpoint protegido, se necessario.

## Seguranca

- Nenhuma chave secreta entra no React ou no repositorio.
- Variaveis secretas ficam na Vercel: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL`.
- O cliente nunca escolhe o valor final do sinal; o backend calcula pelo banco.
- RLS continua protegendo leituras de cliente e admin.
- Webhook deve ser idempotente para evitar confirmar duas vezes o mesmo pagamento.

## UX

- O resumo do agendamento mostra `Sinal para reservar` e `Restante a combinar no atendimento`.
- O botao final vira `Pagar sinal e reservar horario`.
- Mensagens evitam termos tecnicos: usar "pagamento", "sinal", "reserva" e "confirmacao".
- Se checkout falhar, cliente ve mensagem clara e pode tentar novamente sem perder contexto.

## Validacao

- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
- `git diff --check`
- Teste SQL/RLS para cliente comum e admin.
- Smoke em `/cliente`, `/admin`, `/auth?mode=sign-in` e retorno de pagamento.
- Teste de webhook com payload de sandbox antes de producao.

## Fora Do Escopo Inicial

- Parcelamento do valor total do servico.
- Reembolso automatico pelo painel.
- Nota fiscal automatica.
- Salvar cartao para pagamentos futuros.
