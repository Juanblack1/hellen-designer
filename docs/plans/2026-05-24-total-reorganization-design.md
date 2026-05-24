# Design: Reorganizacao Total Hellen Martins Brows

## Contexto

O projeto ja possui uma base funcional com React/Vite, Supabase Auth, Postgres com RLS, catalogo de servicos, agendamento autenticado, painel admin, politicas de agendamento, fila manual de WhatsApp e sinal via Asaas. A reorganizacao aprovada deve transformar essa base em um sistema mais completo para operacao diaria do estudio, sem descartar os fluxos que ja funcionam.

## Decisao

Aplicar uma reorganizacao total em camadas. A experiencia e a estrutura de telas serao redesenhadas, mas a base segura existente de auth, RLS, agendamentos, politicas e pagamentos de sinal sera preservada.

Essa abordagem reduz risco em comparacao com uma reescrita completa e permite entregar novas areas reais: financeiro, produtos/estoque, clientes detalhados, relatorios e configuracoes.

## Rotas E Organizacao

O app passa a ser organizado por superficies claras:

- `/`: pagina inicial publica.
- `/servicos`: catalogo publico de servicos.
- `/agendamento`: fluxo de agendamento da cliente.
- `/confirmacao`: confirmacao apos agendar ou voltar do pagamento.
- `/auth`: login, cadastro e recuperacao.
- `/cliente`: area da cliente.
- `/admin`: dashboard administrativo.
- `/admin/agenda`: agenda diaria, semanal e mensal.
- `/admin/clientes`: lista e busca de clientes.
- `/admin/clientes/:id`: detalhe da cliente.
- `/admin/servicos`: cadastro e edicao de servicos.
- `/admin/pagamentos`: financeiro.
- `/admin/produtos`: produtos e estoque.
- `/admin/relatorios`: relatorios simples.
- `/admin/configuracoes`: politicas, sinal e dados de contato.

Como o projeto ainda usa SPA sem roteador externo, a navegacao pode continuar baseada em `window.history`, mas a estrutura interna deve deixar as rotas explicitamente separadas.

## Dados

Manter as tabelas existentes:

- `service_catalog`
- `bookings`
- `admin_profiles`
- `admin_unavailable_days`
- `admin_availability_slots`
- `booking_policies`
- `booking_status_events`
- `booking_internal_notes`
- `booking_notification_queue`
- `booking_payments`
- `asaas_webhook_events`

Adicionar ou preparar:

- `clients`: cadastro consolidado de cliente, telefone, nascimento opcional, preferencias e anotacoes profissionais.
- `payments`: pagamentos por atendimento, forma, status, valor total, valor pago e data.
- `products`: produtos usados ou vendidos no estudio, categoria, estoque, custo, venda, estoque minimo e observacoes.
- `stock_movements`: entradas, saidas, uso em atendimento, venda e ajuste manual.

As novas tabelas devem usar RLS. Clientes veem apenas dados proprios quando aplicavel; admin ve dados operacionais completos.

## Experiencia Publica

A vitrine deve comunicar a marca Hellen Martins Brows / Hellen Martins Designer de Sobrancelhas com visual preto, dourado, champagne, nude e branco suave. O Instagram oficial passa a ser `https://www.instagram.com/hellenmartins.designer/`.

A cliente deve conseguir:

- Entender os servicos rapidamente.
- Ver preco, duracao e descricao curta.
- Escolher data e horario.
- Informar nome, WhatsApp e observacoes.
- Confirmar o agendamento.
- Ver uma confirmacao clara.
- Acessar WhatsApp e Instagram.

O fluxo deve usar textos em portugues do Brasil, valores em reais e linguagem cuidadosa, sem excesso de brilho ou decoracao.

## Painel Administrativo

O admin deve funcionar como sistema operacional do estudio:

- Dashboard com agendamentos do dia, proximos horarios, clientes, faturamento por periodo, servicos mais realizados, produtos com estoque baixo, pagamentos pendentes e atalhos.
- Agenda com visoes diaria, semanal e mensal, bloqueios e remarcacao.
- Clientes com historico de atendimentos, pagamentos, ultimo atendimento, proximo agendamento e anotacoes profissionais.
- Pagamentos com forma, status, valores, periodo e vinculo com cliente/servico.
- Produtos com estoque, alertas e movimentacoes.
- Relatorios simples com filtros por periodo.
- Configuracoes para politica, sinal, contatos e identidade publica.

No desktop, a navegacao principal do admin fica em sidebar. No mobile, os destinos principais usam navegacao inferior ou trilhos horizontais confortaveis.

## Visual E UX

Cena: cliente vinda do Instagram abre o site pelo celular, provavelmente entre conversas de WhatsApp, buscando marcar um horario sem trocar varias mensagens. Hellen usa o admin em intervalos curtos entre atendimentos, precisando decidir rapido o que confirmar, cobrar, comprar ou remarcar.

Registro:

- Publico: Brand.
- Admin e area da cliente: Product com acabamento de marca.

Dials:

- `VISUAL_VARIANCE`: 7
- `MOTION_INTENSITY`: 4
- `INFORMATION_DENSITY`: 6 no admin, 4 no publico

Regras:

- Dourado como destaque, nao como preenchimento excessivo.
- Fundo escuro com superficies elevadas legiveis.
- Cards apenas para entidades repetidas, modais e ferramentas enquadradas.
- Nada de interface generica de SaaS.
- Estados de vazio, erro, carregamento, sucesso e bloqueio sempre explicitos.
- Foco visivel, teclado, contraste e alvos confortaveis no mobile.

## Estrategia De Implementacao

1. Atualizar identidade, rotas e navegacao sem alterar schema.
2. Separar a experiencia publica, area da cliente e admin em componentes/modulos.
3. Expandir o schema com clientes, pagamentos completos, produtos e estoque.
4. Implementar telas admin novas com dados reais e fallbacks seguros.
5. Ajustar fluxo publico de agendamento e confirmacao.
6. Rodar lint, testes, build, diff check e smoke local.

## Validacao

- `npm run lint`
- `npm test`
- `npm run build`
- `git diff --check`
- Smoke em `/`, `/servicos`, `/agendamento`, `/auth?mode=sign-in`, `/cliente`, `/admin`, `/admin/agenda`, `/admin/clientes`, `/admin/pagamentos`, `/admin/produtos`, `/admin/relatorios` e `/admin/configuracoes`.

## Fora Do Escopo Imediato

- WhatsApp Business API automatica.
- Sincronizacao com Google Calendar.
- Multi-profissionais.
- Coleta direta de dados de cartao no app.
- Programa de fidelidade.
