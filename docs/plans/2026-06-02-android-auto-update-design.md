# Design: Atualizacao automatica do app Android

## Objetivo

O aplicativo instalado deve acompanhar atualizacoes publicadas na branch `master` sem exigir reinstalacao manual sempre que o admin/site mudar. Quando houver mudanca de binario Android, a atualizacao deve seguir o modelo da Google Play Store.

## Decisao

O app Android passa a carregar o admin publicado em `https://hellen-designer-admin.vercel.app` pelo WebView do Capacitor. Assim, alteracoes de front-end publicadas no admin entram no app instalado assim que a Vercel publica a nova versao.

Para atualizacoes de binario, o fluxo correto e Google Play:

- o GitHub Actions gera APK e AAB a cada push relevante na `master`;
- o AAB e o pacote usado pela Play Store;
- quando `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` estiver configurado, o workflow envia o AAB para a faixa `internal` com prioridade de in-app update `5`;
- usuarias instaladas pela Play Store recebem updates conforme as preferencias de auto-update do dispositivo;
- o app usa Google Play In-App Updates para iniciar um fluxo imediato quando a Play Store indicar que existe versao nova disponivel;
- o app mantem uma tela local de erro para falha de conexao com o admin online.

## Limites

APK instalado manualmente nao consegue se atualizar sozinho de forma silenciosa como a Play Store. Android exige mesmo `applicationId`, mesma assinatura e `versionCode` maior, e o usuario ou uma loja autorizada precisa aceitar/gerenciar a atualizacao. Portanto, distribuicao manual continua exigindo reinstalacao ou confirmacao de instalacao.

O prompt de In-App Updates tambem depende de instalacao via Google Play e de uma versao nova estar disponivel para o usuario na faixa da Play Store.

## Requisitos externos

- App criado no Google Play Console com package `br.com.hellendesigner.app`.
- Primeiro AAB enviado manualmente se a Play Console/API ainda nao reconhecer o pacote.
- Secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` no GitHub.
- Permissao da service account para publicar o app na Play Console.
- Secrets de assinatura Android ja existentes devem continuar configurados.

## Verificacao

- `npm run build`
- `npm run lint`
- `npm test`
- `npm run mobile:sync`
- build Android release no GitHub Actions com JDK 21
