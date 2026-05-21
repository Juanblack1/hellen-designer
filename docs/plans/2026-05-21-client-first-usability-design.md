# Design: Usabilidade Cliente Primeiro

## Contexto

O site ja possui autenticacao, agenda da cliente, painel admin, horarios configuraveis, bloqueios, status operacionais e validacoes no banco. A melhoria aprovada prioriza clientes que precisam entender rapidamente como marcar horario sem ajuda, mantendo ajustes leves para a gestao admin.

## Prioridade

Cliente primeiro. O objetivo e reduzir duvida, erro e abandono no agendamento.

## Objetivos

- Explicar o funcionamento antes do formulario.
- Guiar a cliente em uma sequencia natural: servico, data, horario, dados, politica e confirmacao.
- Mostrar estados claros para horarios: disponivel, encerrado, ocupado e indisponivel.
- Tornar o resumo do agendamento facil de conferir antes do envio.
- Melhorar mensagens de proximo passo apos solicitar horario.
- Fazer pequenos ajustes no admin para destacar operacao do dia e pendencias.

## Nao Escopo

- Reescrever arquitetura do app.
- Criar backend separado.
- Automatizar WhatsApp.
- Criar pagamento online.
- Alterar identidade visual principal.

## Fluxo Da Cliente

1. Ver uma explicacao curta de como funciona.
2. Escolher o servico antes de escolher data.
3. Escolher uma data aberta no calendario.
4. Escolher um horario disponivel.
5. Preencher nome, WhatsApp e observacoes opcionais.
6. Conferir resumo com servico, preco, duracao, data e horario.
7. Aceitar politica de cancelamento/remarcacao.
8. Solicitar horario e receber mensagem clara sobre confirmacao.

## Estados E Mensagens

- Sem login: explicar que a conta protege historico e pedidos.
- Sem servicos: avisar que a agenda esta pausada.
- Dia encerrado: bloquear selecao.
- Horario encerrado: exibir como encerrado e bloquear clique.
- Horario ocupado: exibir como ocupado.
- Falta horario: botao e status devem orientar a escolher horario.
- Falta politica: botao/status devem orientar a aceitar politica.
- Sucesso: explicar que a Hellen confirma por WhatsApp ou email.

## Ajustes Leves No Admin

- Reforcar resumo operacional com hoje, confirmados futuros e WhatsApp pendente.
- Melhorar textos das secoes para refletir a tarefa de gestao.
- Deixar empty states mais orientativos.
- Manter controles existentes de status, remarcacao, notas e fila manual.

## Acessibilidade

- Manter botoes reais para calendario e horarios.
- Usar textos visiveis, nao apenas cor, para estados.
- Preservar `aria-live` nos retornos de formulario.
- Evitar termos tecnicos para cliente.
- Manter contraste e alvos clicaveis confortaveis no mobile.

## Validacao

- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
- `git diff --check`
- Smoke local/producao em `/cliente`, `/auth?mode=sign-in` e `/admin` quando aplicavel.
