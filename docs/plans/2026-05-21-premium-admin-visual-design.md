# Design: Visual Premium E Admin Operacional

## Contexto

O site deve assumir a linguagem visual preto/dourado das referencias fornecidas: fundo escuro, acabamento luminoso, serifas editoriais e detalhes dourados. O admin precisa ficar mais eficiente para gestao diaria, sem perder os fluxos ja existentes.

## Escopo Aprovado

- Aplicar visual preto/dourado no site inteiro.
- Manter o fluxo guiado da cliente.
- Melhorar o admin como painel operacional.
- Preservar validacoes do banco e regras de seguranca.

## Direcao Visual

- Fundo preto/espresso com textura sutil e brilhos dourados discretos.
- Cards escuros com bordas douradas finas.
- Titulos em dourado editorial.
- Texto claro em alto contraste.
- Botoes principais dourados, botoes secundarios escuros com borda.

## Admin

- Topo com metricas e atalhos de operacao.
- Navegacao rapida para agenda, politica, WhatsApp e servicos.
- Cards de agendamento com hierarquia clara: data, cliente, servico, contato, status e acoes.
- Acoes rapidas para confirmar, concluir e cancelar quando o status permitir.
- Filtros e busca mantidos, mas com visual mais legivel.

## Cliente

- Manter passos de agendamento ja aprovados.
- Adaptar formulario, calendario, horarios e resumo ao visual premium.
- Garantir estados legiveis por texto, nao apenas cor.

## Validacao

- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
- `git diff --check`
- Smoke em `/`, `/cliente`, `/admin` e `/auth?mode=sign-in`.
