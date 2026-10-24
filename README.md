# Alinhamento Eleitoral 2026

**Acesse o site: [allanbarcelos.github.io/2nd-eleicao-2026](https://allanbarcelos.github.io/2nd-eleicao-2026/)**

Questionário que mostra com qual candidato do 2º turno da eleição presidencial de 2026 (Flávio Bolsonaro, PL, e Lula, PT) o eleitor está mais alinhado. O site usa somente as posições apresentadas no debate da TV Globo de 23/10/2026.

**Iniciativa independente e sem viés político.** O projeto não tem vínculo com partidos, candidatos, campanhas ou veículos de imprensa.

## Como funciona

- São 15 afirmações gerais sobre temas do debate (economia, segurança, meio ambiente, educação, trabalho, políticas sociais e outros), uma por tela.
- As afirmações são princípios amplos, sem propostas específicas, nomes de programas ou bandeiras de campanha, para que a resposta não seja guiada pela identificação com um candidato.
- Para cada afirmação, o eleitor escolhe um nível: nada alinhado, pouco alinhado, parcialmente alinhado, alinhado ou muito alinhado.
- Cada candidato tem uma posição atribuída em cada afirmação (de −2 a +2), justificada com o trecho do debate e a referência na planilha. A posição vem do que ele disse no debate; fatos de fora só entram com fonte documental (votação, orientação de bancada, ato de governo), com a mesma regra para os dois.
- Os pesos das perguntas também equilibram o conjunto de posições dos dois candidatos, para que a estrutura do questionário não aproxime o eleitor de meio-termo de nenhum deles.
- O resultado é a similaridade de cosseno ponderada entre as respostas e as posições de cada candidato (0% a 100%). Entram no peso a pergunta (0,6 a 1,2) e os temas que o eleitor marcar como importantes. Essa fórmula não favorece o candidato com posições mais perto do centro da escala. Detalhes na tela "Metodologia" do site.
- As afirmações estão misturadas, de modo que concordar ou discordar não favorece sistematicamente nenhum dos dois. O site passou por uma auditoria de imparcialidade com agentes independentes (linguagem, codificação das posições, algoritmo, coerência e eleitores simulados). Nas simulações, a diferença média entre os candidatos ficou abaixo de 0,5 ponto em todos os perfis sem posição política definida.
- No final, um índice mostra a confiança das respostas ("suas respostas tiveram X% de confiança"). Ele combina quatro fatores: combinações muito incomuns entre afirmações relacionadas (só respostas no extremo da escala; combinar posições de lados diferentes não é penalizado), tempo de leitura, variedade das respostas e quantidade de perguntas respondidas. Se a confiança ficar abaixo de 70%, ou se o mesmo nível for usado em 80% ou mais das respostas, o resultado não é exibido. Diferenças menores que 8 pontos aparecem como empate técnico, com os nomes em ordem sorteada e sem destacar nenhum candidato.

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

## Teste de imparcialidade

`node tools/teste-imparcialidade.js` decodifica o `data.js` publicado e simula dezenas de milhares de eleitores com a mesma lógica do site. Os perfis testados são: aleatório, moderado, só extremos, tendência a concordar ou a discordar, meio-termo, mistura e pulos.

O teste falha se, em qualquer perfil sem posição política definida, a diferença média entre os candidatos passar de 1 ponto, ou se o bloqueio por baixa confiança atingir de forma desigual quem pensa como cada candidato. Ele roda automaticamente antes de cada publicação, e a publicação é cancelada se o teste falhar.

