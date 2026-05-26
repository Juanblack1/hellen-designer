# Design: Hellen Brows como plataforma e aplicativo

## Objetivo

Reposicionar a experiencia publica para vender o atendimento da Hellen sem expor a gestao. Nesta fase, a cliente agenda pelo WhatsApp e o sistema funciona como painel privado admin-first para rotina do studio.

## Abordagem escolhida

Manter o projeto React/Vite atual e criar uma camada PWA. Essa opcao entrega um aplicativo instalavel em iOS, Android e desktop sem introduzir um segundo codigo nativo ou duplicar regras de negocio.

## Escopo entregue

- Home com narrativa de studio premium, prova de valor, servicos e CTAs publicos para WhatsApp.
- Rota `/app` dedicada a instalacao, preview mobile e modulos admin do aplicativo.
- Separacao explicita entre area publica, painel admin e CRM de clientes cadastradas.
- Area da cliente mantida como etapa futura, sem destaque publico ou cadastro aberto nesta fase.
- PWA com `manifest.webmanifest`, service worker e atalhos para painel admin, agenda admin e CRM.
- Documentacao atualizada para incluir a rota e a camada PWA.

## Fora de escopo desta etapa

- App nativo Expo/React Native.
- Novas tabelas para equipe, comissoes, pacotes, anamnese ou fotos antes/depois.
- Automacao paga de WhatsApp, SMS ou push remoto.

## Verificacao

Validar com `npm run lint`, `npm test`, `npm run build` e smoke das rotas publicas, incluindo `/app`.
