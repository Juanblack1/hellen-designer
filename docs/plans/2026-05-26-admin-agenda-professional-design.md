# Design: Agenda Admin Profissional

## Objetivo

Transformar o admin em um comando diario do studio. A Hellen precisa controlar a propria agenda,
clientes, confirmacoes, pagamentos e servicos sem depender de uma tela fragmentada ou de horarios
soltos dificeis de entender.

## Decisao aprovada

Implementar a direcao `Agenda profissional`: modelos semanais, preview do dia, excecoes visiveis,
fila operacional e Cliente 360. Nesta primeira etapa, usar as tabelas atuais para reduzir risco:
`admin_availability_slots`, `admin_unavailable_days`, `bookings`, `clients`, `payments` e
`products`.

## Telas desenhadas no Pencil

- `Admin 01 - Painel Geral`: cockpit com proximas acoes, receita, recorrencia, estoque e agenda
  compacta.
- `Admin 02 - Construtor de Periodos`: modelo semanal, criacao de periodos, preview real do dia e
  excecoes.
- `Admin 03 - Cliente 360`: ficha da cliente com WhatsApp, preferencias, historico, pagamentos e
  notas profissionais.
- `Admin 04 - Configuracoes e Servicos`: politicas de agenda e servicos como decisoes separadas.

## Funcionalidade

- Agrupar periodos liberados por dia da semana, com resumo de capacidade e estado ativo/pausado.
- Mostrar preview do dia selecionado com horarios gerados, ocupados, livres, bloqueados ou passados.
- Deixar bloqueios do mes visiveis e conectados ao calendario selecionado.
- Melhorar painel geral com fila de decisoes: confirmar, cobrar sinal, enviar WhatsApp, concluir e
  acompanhar estoque.
- Melhorar clientes com busca, status de proximo atendimento, ultimo atendimento, total gasto,
  preferencias e notas.
- Manter area da cliente como futura e admin-first como escopo atual.

## Fora desta etapa

- Migrar banco para bloqueios parciais por horario especifico.
- Sincronizar Google Calendar.
- Multi-profissionais.
- WhatsApp Business API paga.

## Verificacao

- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`
- Smoke local em `/admin`, `/admin/agenda`, `/admin/clientes`, `/admin/servicos`, `/admin/configuracoes`.
