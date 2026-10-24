# Alinhamento Eleitoral 2026

Questionário que mostra com qual candidato do 2º turno da eleição presidencial de 2026 (Flávio Bolsonaro, PL, e Lula, PT) o eleitor está mais alinhado. O site usa somente as posições apresentadas no debate da TV Globo de 23/10/2026.

**Iniciativa independente e sem viés político.** O projeto não tem vínculo com partidos, candidatos, campanhas ou veículos de imprensa.

## Como funciona

- São 16 afirmações gerais sobre temas do debate (economia, segurança, meio ambiente, educação, trabalho, políticas sociais e outros), uma por tela.
- As afirmações são princípios amplos, sem propostas específicas, nomes de programas ou bandeiras de campanha, para que a resposta não seja guiada pela identificação com um candidato.
- Para cada afirmação, o eleitor escolhe um nível: nada alinhado, pouco alinhado, parcialmente alinhado, alinhado ou muito alinhado.
- Cada candidato tem uma posição atribuída em cada afirmação (de −2 a +2), justificada com o trecho do debate e a referência na planilha.
- O resultado é uma média ponderada da proximidade entre a resposta e a posição de cada candidato. Entram no peso a pergunta (0,6 a 1,2), a intensidade da resposta e os temas que o eleitor marcar como importantes. Detalhes na tela "Metodologia" do site.
- As afirmações estão misturadas, de modo que concordar ou discordar não favorece sistematicamente nenhum dos dois.
- No final, um índice mostra a confiança das respostas ("suas respostas tiveram X% de confiança"). Ele combina quatro fatores: coerência entre oito pares de afirmações ligadas logicamente, tempo de leitura, variedade das respostas e quantidade de perguntas respondidas. Os pares foram escolhidos de modo que o discurso de qualquer dos dois candidatos tenha 100% de coerência.

## Privacidade

Nenhuma resposta é coletada, enviada ou armazenada. Não há cookies, `localStorage` nem analytics. O service worker guarda só os arquivos estáticos do site, para uso offline.

## Dados

A planilha em [`dados/`](dados/) traz:

- a checagem de 91 falas do debate;
- a análise de viabilidade de 40 promessas;
- as fontes de cada item e a transcrição completa do debate.

Foram usadas só fontes oficiais e portais de notícias. Agências de checagem e veículos com viés político declarado ficaram de fora, e a lista dos excluídos está na própria planilha.

## Tecnologia

HTML, CSS e JavaScript puros, com Bootstrap 5.3 incluído no repositório. É um PWA de página única, que funciona sem recarregar a página. A publicação no GitHub Pages é feita pelo workflow em `.github/workflows/pages.yml`.

## Dados das posições

Para que ninguém descubra no código qual resposta favorece cada candidato, o `assets/js/data.js` publicado não traz as posições em texto legível. Elas ficam num bloco codificado, com identificadores aleatórios, e só são decodificadas na memória ao calcular o resultado. Depois do questionário, todas as posições e justificativas aparecem na tela de resultado.

O arquivo é gerado por `node tools/gerar-dados.js` a partir de `fonte/dados.json`, que fica fora do repositório (`.gitignore`). Isso é uma ofuscação, não uma criptografia: como o cálculo acontece no navegador, quem se dedicar consegue decodificar.

