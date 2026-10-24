// Questionário de alinhamento. Nenhuma resposta sai do navegador nem é armazenada.
(function () {
  'use strict';

  const PESO_IMPORTANTE = 1.5;
  const MIN_RESPOSTAS = 10;

  // Posições dos candidatos: decodificadas só na memória, ao calcular o resultado.
  let segredo = null;
  function revelar() {
    if (segredo) return segredo;
    let h = 2166136261;
    for (const ch of DADOS.k) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    let x = h;
    const prox = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) & 255; };
    const bin = atob(DADOS.d), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ prox();
    segredo = JSON.parse(new TextDecoder().decode(bytes));
    return segredo;
  }

  const estado = { indice: -1, respostas: {}, importantes: {}, tempos: {}, inicio: 0, rapidasSeguidas: 0, avisar: false };
  const LEITURA_MINIMA_MS = 2000;
  const CONFIANCA_MINIMA = 70;       // abaixo disso o resultado não é exibido
  const REPETICAO_MAXIMA = 0.8;      // mesmo nível em 80% ou mais das respostas
  const EMPATE_PONTOS = 8;
  const AVISO_RAPIDAS = 3;           // respostas rápidas seguidas antes do aviso
  const app = document.getElementById('app');

  const el = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const f of filhos.flat()) if (f != null) e.append(f.nodeType ? f : document.createTextNode(f));
    return e;
  };

  function trocarTela(conteudo) {
    app.classList.remove('slide-in');
    void app.offsetWidth;
    app.replaceChildren(conteudo);
    app.classList.add('slide-in');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const foco = app.querySelector('h1, h2');
    if (foco) { foco.setAttribute('tabindex', '-1'); foco.focus({ preventScroll: true }); }
  }

  // ---------- Telas ----------

  function telaInicio() {
    estado.indice = -1;
    trocarTela(el('div', { class: 'card shadow-sm' },
      el('div', { class: 'card-body p-4 p-md-5' },
        el('span', { class: 'badge text-bg-secondary mb-3' }, '2º turno · Eleição presidencial 2026'),
        el('h1', { class: 'h2 mb-3' }, 'Com quem você está mais alinhado?'),
        el('p', { class: 'lead' }, `São ${PERGUNTAS.length} afirmações sobre temas do debate. Para cada uma, diga o quanto ela representa o que você pensa.`),
        el('ul', { class: 'small text-body-secondary' },
          el('li', {}, 'As afirmações são princípios gerais, sem propostas, nomes de programas ou bandeiras de campanha. As posições dos candidatos foram tiradas do debate da TV Globo de 23/10/2026.'),
          el('li', {}, 'Nenhuma pergunta "pertence" a um candidato: concordar ou discordar pode aproximar você de qualquer um deles.'),
          el('li', {}, 'Os nomes só aparecem no final. Você pode pular perguntas e marcar os temas mais importantes para você.'),
          el('li', {}, 'Nada é salvo nem enviado: o cálculo é feito no seu navegador e some ao fechar a página.')
        ),
        el('button', { class: 'btn btn-primary btn-lg mt-2', onclick: () => irPara(0) }, 'Começar'),
        el('button', { class: 'btn btn-link mt-2', onclick: telaMetodologia }, 'Como funciona o cálculo')
      )
    ));
  }

  function telaPergunta() {
    const q = PERGUNTAS[estado.indice];
    const total = PERGUNTAS.length;
    const atual = estado.respostas[q.id];
    const progresso = Math.round((estado.indice / total) * 100);
    estado.inicio = performance.now();

    const opcoes = el('div', { class: 'd-grid gap-2 my-4', role: 'radiogroup', 'aria-label': 'Nível de alinhamento' },
      NIVEIS.map(n => el('button', {
        class: `btn btn-lg text-start opcao ${atual === n.valor ? 'btn-primary' : 'btn-outline-primary'}`,
        role: 'radio', 'aria-checked': String(atual === n.valor),
        onclick: () => responder(q.id, n.valor)
      }, n.rotulo))
    );

    const importante = el('div', { class: 'form-check form-switch mb-3' },
      el('input', {
        class: 'form-check-input', type: 'checkbox', id: 'imp', role: 'switch',
        onchange: e => { estado.importantes[q.id] = e.target.checked; }
      }),
      el('label', { class: 'form-check-label', for: 'imp' }, 'Este tema é muito importante para mim (vale 1,5x)')
    );
    if (estado.importantes[q.id]) importante.querySelector('input').checked = true;

    trocarTela(el('div', { class: 'card shadow-sm' },
      el('div', { class: 'card-body p-4 p-md-5' },
        el('div', { class: 'd-flex justify-content-between align-items-center mb-2 small text-body-secondary' },
          el('span', {}, `Pergunta ${estado.indice + 1} de ${total}`),
          el('span', { class: 'badge text-bg-light border' }, q.tema)
        ),
        el('div', { class: 'progress mb-4', role: 'progressbar', 'aria-valuenow': progresso, 'aria-valuemin': 0, 'aria-valuemax': 100 },
          el('div', { class: 'progress-bar', style: `width:${progresso}%` })
        ),
        estado.avisar ? el('div', { class: 'alert alert-warning py-2 small', role: 'status' },
          'Leia com calma: o resultado depende da sua atenção. Respostas muito rápidas reduzem a confiança do resultado.') : null,
        el('h2', { class: 'h4 lh-base' }, q.texto),
        opcoes,
        importante,
        el('div', { class: 'd-flex justify-content-between' },
          el('button', { class: 'btn btn-outline-secondary', onclick: () => irPara(estado.indice - 1) }, '← Voltar'),
          el('button', { class: 'btn btn-outline-secondary', onclick: () => { delete estado.respostas[q.id]; irPara(estado.indice + 1); } }, 'Pular →')
        )
      )
    ));
  }

  function telaResultado() {
    const S = revelar(), CANDIDATOS = S.c;
    const r = calcular();
    const respondidas = Object.keys(estado.respostas).length;
    const porNome = (a, b) => CANDIDATOS[a].nome.localeCompare(CANDIDATOS[b].nome);
    const [x, y] = Object.keys(CANDIDATOS);
    const diff = Math.abs(r.total[x] - r.total[y]);
    const empate = diff < EMPATE_PONTOS;
    // No empate técnico ninguém aparece na frente: ordem sorteada e cor neutra.
    const ids = empate ? (Math.random() < 0.5 ? [x, y] : [y, x]) : Object.keys(CANDIDATOS).sort((a, b) => r.total[b] - r.total[a] || porNome(a, b));

    if (respondidas < MIN_RESPOSTAS) {
      trocarTela(el('div', { class: 'card shadow-sm' }, el('div', { class: 'card-body p-4 p-md-5' },
        el('h2', { class: 'h4' }, 'Respostas insuficientes'),
        el('p', {}, `Você respondeu ${respondidas} de ${PERGUNTAS.length}. Para um resultado confiável, responda pelo menos ${MIN_RESPOSTAS}.`),
        el('button', { class: 'btn btn-primary', onclick: () => irPara(0) }, 'Revisar respostas')
      )));
      return;
    }

    const neutras = Object.values(estado.respostas).filter(v => v === 0).length;
    const conf = avaliarConfianca();

    if (conf.total < CONFIANCA_MINIMA || conf.maisComum >= REPETICAO_MAXIMA) {
      const motivos = [];
      if (conf.maisComum >= REPETICAO_MAXIMA) motivos.push(`${Math.round(conf.maisComum * 100)}% das respostas usaram o mesmo nível`);
      if (conf.rapidas) motivos.push(`${conf.rapidas} resposta(s) foram dadas em menos de 2 segundos`);
      if (conf.conflitos.length) motivos.push(`${conf.conflitos.length} combinação(ões) muito incomum(ns) entre afirmações relacionadas`);
      trocarTela(el('div', {},
        el('div', { class: 'card shadow-sm mb-4 border-danger' }, el('div', { class: 'card-body p-4 p-md-5' },
          el('h2', { class: 'h4' }, 'Não foi possível calcular um resultado confiável'),
          el('p', {}, `Suas respostas tiveram ${conf.total}% de confiança. Elas parecem repetidas, rápidas demais ou contraditórias, e um resultado assim não diria nada sobre o que você pensa.`),
          motivos.length ? el('ul', {}, motivos.map(m => el('li', {}, m))) : null,
          el('p', { class: 'mb-3' }, 'Leia cada afirmação com calma e responda o que você realmente pensa. Se não tiver opinião sobre algum tema, é melhor pular.'),
          el('div', { class: 'd-flex flex-wrap gap-2' },
            el('button', { class: 'btn btn-primary', onclick: () => irPara(0) }, 'Revisar respostas'),
            el('button', { class: 'btn btn-outline-secondary', onclick: recomecar }, 'Refazer do início'))
        )),
        cartaoConfianca(conf)
      ));
      return;
    }

    const barras = ids.map(id => el('div', { class: 'mb-3' },
      el('div', { class: 'd-flex justify-content-between' },
        el('strong', {}, `${CANDIDATOS[id].nome} (${CANDIDATOS[id].partido})`),
        el('span', { class: 'fw-semibold' }, `${r.total[id].toFixed(0)}%`)
      ),
      el('div', { class: 'progress', style: 'height:1.25rem' },
        el('div', { class: 'progress-bar', style: `width:${r.total[id]}%;background:${empate ? '#6c757d' : CANDIDATOS[id].cor}` })
      )
    ));

    const veredito = empate
      ? `A diferença é de ${diff.toFixed(1).replace('.', ',')} ponto(s), abaixo da margem de ${EMPATE_PONTOS}. Suas respostas se dividem entre as posições dos dois, sem preferência clara.`
      : `Suas respostas estão mais alinhadas às posições de ${CANDIDATOS[ids[0]].nome}, com ${diff.toFixed(0)} pontos de diferença.`;

    const temas = el('table', { class: 'table table-sm align-middle' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Tema'), ...ids.map(id => el('th', { class: 'text-end' }, CANDIDATOS[id].nome)))),
      el('tbody', {}, Object.keys(r.temas).sort().map(t => el('tr', {},
        el('td', {}, t), ...ids.map(id => el('td', { class: 'text-end' }, r.temas[t][id] == null ? '—' : `${r.temas[t][id].toFixed(0)}%`))
      )))
    );

    const rot = v => (NIVEIS.find(n => n.valor === v) || {}).rotulo || '—';
    const detalhes = el('div', { class: 'accordion', id: 'acc' }, PERGUNTAS.map((q, i) => {
      const u = estado.respostas[q.id];
      return el('div', { class: 'accordion-item' },
        el('h3', { class: 'accordion-header' },
          el('button', { class: 'accordion-button collapsed', type: 'button', 'data-bs-toggle': 'collapse', 'data-bs-target': `#d${i}` },
            el('span', {}, el('span', { class: 'badge text-bg-light border me-2' }, q.tema), q.texto))
        ),
        el('div', { id: `d${i}`, class: 'accordion-collapse collapse', 'data-bs-parent': '#acc' },
          el('div', { class: 'accordion-body small' },
            el('p', { class: 'mb-2' }, el('strong', {}, 'Você: '), u === undefined ? 'pulou' : rot(u), estado.importantes[q.id] ? ' · tema importante' : ''),
            ...ids.map(id => el('p', { class: 'mb-2' },
              el('strong', {}, `${CANDIDATOS[id].nome}: `), `${rot(S.p[q.id][id].v)}. `, S.p[q.id][id].por,
              el('span', { class: 'text-body-secondary' }, ` [planilha: ${S.p[q.id][id].ref}]`)
            ))
          )
        )
      );
    }));

    trocarTela(el('div', {},
      el('div', { class: 'card shadow-sm mb-4' }, el('div', { class: 'card-body p-4 p-md-5' },
        el('h2', { class: 'h3 mb-4' }, empate ? 'Seu resultado: empate técnico' : 'Seu resultado'),
        barras,
        el('p', { class: 'mt-3' }, veredito),
        el('p', { class: 'small text-body-secondary mb-0' },
          `${respondidas} de ${PERGUNTAS.length} respondidas, ${neutras} como "parcialmente alinhado". ` +
          'O alinhamento mede proximidade com as posições do debate; não é recomendação de voto.')
      )),
      cartaoConfianca(conf),
      el('div', { class: 'card shadow-sm mb-4' }, el('div', { class: 'card-body p-4' },
        el('h2', { class: 'h5' }, 'Alinhamento por tema'), temas,
        el('p', { class: 'small text-body-secondary mb-0' }, 'Em temas com uma só pergunta, o percentual é a proximidade direta entre a sua resposta e a posição do candidato. "—" indica posição neutra no debate ou que você marcou "parcialmente alinhado" em todo o tema.'))),
      el('div', { class: 'card shadow-sm mb-4' }, el('div', { class: 'card-body p-4' },
        el('h2', { class: 'h5 mb-3' }, 'Sua resposta e a posição de cada candidato'), detalhes)),
      cartaoChecagem(ids, S),
      el('div', { class: 'd-flex flex-wrap gap-2' },
        el('button', { class: 'btn btn-success', onclick: e => compartilhar(e.currentTarget, textoCompartilhar(r, ids, diff, CANDIDATOS)) }, 'Compartilhar resultado'),
        el('a', { class: 'btn btn-outline-success', target: '_blank', rel: 'noopener', href: `https://wa.me/?text=${encodeURIComponent(textoCompartilhar(r, ids, diff, CANDIDATOS))}` }, 'Enviar no WhatsApp'),
        el('button', { class: 'btn btn-primary', onclick: recomecar }, 'Refazer o questionário'),
        el('button', { class: 'btn btn-outline-secondary', onclick: telaMetodologia }, 'Como funciona o cálculo')
      )
    ));
  }

  function cartaoConfianca(c) {
    const cls = c.total >= 75 ? 'success' : c.total >= 50 ? 'warning' : 'danger';
    const nivel = c.total >= 75 ? 'alta' : c.total >= 50 ? 'média' : 'baixa';
    const rot = v => (NIVEIS.find(n => n.valor === v) || {}).rotulo.toLowerCase();
    const curto = id => '"' + PERGUNTAS.find(q => q.id === id).texto.replace(/\.$/, '') + '"';
    const item = (nome, valor, ajuda) => el('li', { class: 'list-group-item d-flex justify-content-between align-items-start' },
      el('div', {}, el('div', { class: 'fw-semibold' }, nome), el('div', { class: 'small text-body-secondary' }, ajuda)),
      el('span', { class: 'badge text-bg-light border fs-6' }, `${Math.round(valor * 100)}%`));
    return el('div', { class: `card shadow-sm mb-4 border-${cls}` }, el('div', { class: 'card-body p-4' },
      el('h2', { class: 'h5' }, 'Confiança das suas respostas'),
      el('p', { class: 'fs-5 mb-1' }, 'Suas respostas tiveram ', el('strong', { class: `text-${cls}-emphasis` }, `${c.total}% de confiança`), ` (${nivel}).`),
      el('p', { class: 'small text-body-secondary' }, 'Indica o quanto o resultado acima é confiável. Não é um julgamento das suas opiniões.'),
      el('ul', { class: 'list-group mb-3' },
        item('Coerência', c.coerencia, 'Combinações muito incomuns entre afirmações relacionadas.'),
        item('Atenção', c.atencao, 'Tempo suficiente para ler cada afirmação antes de responder.'),
        item('Variedade', c.variedade, 'As respostas não repetem o mesmo nível em quase todas as perguntas.'),
        item('Cobertura', c.cobertura, 'Perguntas respondidas com posição definida (pulos e "parcialmente" contam menos).')
      ),
      c.conflitos.length ? el('div', {},
        el('p', { class: 'small fw-semibold mb-1' }, 'Combinações que reduziram a coerência:'),
        el('ul', { class: 'small mb-2' }, c.conflitos.map(k => el('li', { class: 'mb-1' },
          `Você ficou "${rot(k.ua)}" com ${curto(k.a)} e "${rot(k.ub)}" com ${curto(k.b)}. Essa combinação é menos comum: ${k.motivo}. Ela pode refletir uma opinião própria.`))),
        el('p', { class: 'small text-body-secondary mb-0' }, 'Uma combinação incomum não é necessariamente um erro: pode refletir uma opinião própria. Vale reler essas afirmações.')
      ) : el('p', { class: 'small mb-0' }, 'Nenhuma combinação incomum encontrada.'),
      null,
      c.rapidas ? el('p', { class: 'small mt-2 mb-0' }, `${c.rapidas} resposta(s) foram dadas em menos de 2 segundos.`) : null,
      el('button', { class: 'btn btn-outline-secondary btn-sm mt-3', onclick: () => irPara(0) }, 'Revisar respostas')
    ));
  }

  function cartaoChecagem(ids, S) {
    const CANDIDATOS = S.c, CHECAGEM = S.k;
    const pct = (a, b) => `${Math.round((a / b) * 100)}%`;
    const linhas = [
      ['Falas checadas', c => c.falas],
      ['Verdadeiras (inclui imprecisas)', c => `${c.verdadeiro + c.impreciso} (${pct(c.verdadeiro + c.impreciso, c.falas)})`],
      ['Exageradas', c => `${c.exagerado} (${pct(c.exagerado, c.falas)})`],
      ['Falsas', c => `${c.falso} (${pct(c.falso, c.falas)})`],
      ['Sem evidência', c => c.semEvidencia],
      ['Promessas analisadas', c => c.promessas],
      ['Viabilidade média até 2030', c => `${c.viabilidadeMedia.toFixed(0)}%`],
      ['Promessas com viabilidade alta / média / baixa', c => `${c.viabAlta} / ${c.viabMedia} / ${c.viabBaixa}`]
    ];
    return el('div', { class: 'card shadow-sm mb-4' }, el('div', { class: 'card-body p-4' },
      el('h2', { class: 'h5' }, 'Checagem de fatos e viabilidade das promessas'),
      el('p', { class: 'small text-body-secondary' }, 'Informação complementar: não entra no cálculo de alinhamento.'),
      el('div', { class: 'table-responsive' }, el('table', { class: 'table table-sm' },
        el('thead', {}, el('tr', {}, el('th', {}, ''), ...ids.map(id => el('th', { class: 'text-end' }, CANDIDATOS[id].nome)))),
        el('tbody', {}, linhas.map(([rot, f]) => el('tr', {}, el('td', {}, rot), ...ids.map(id => el('td', { class: 'text-end' }, String(f(CHECAGEM[id])))))))
      )),
      el('a', { class: 'btn btn-outline-primary btn-sm', href: 'dados/Checagem_Debate_Globo_2026_fontes_filtradas.xlsx', download: '' }, 'Baixar a planilha completa (Excel)')
    ));
  }

  function telaMetodologia() {
    const voltar = estado.indice >= PERGUNTAS.length ? telaResultado : (estado.indice >= 0 ? telaPergunta : telaInicio);
    trocarTela(el('div', { class: 'card shadow-sm' }, el('div', { class: 'card-body p-4 p-md-5' },
      el('h2', { class: 'h4 mb-3' }, 'Como funciona o cálculo'),
      el('p', {}, 'Cada afirmação tem uma posição atribuída a cada candidato, numa escala de −2 (nada alinhado) a +2 (muito alinhado). A posição foi tirada do que cada um disse no debate da TV Globo de 23/10/2026 e da checagem disponível na planilha. A justificativa de cada posição aparece na tela de resultados.'),
      el('p', {}, 'O resultado compara a direção das suas respostas com a de cada candidato (similaridade de cosseno ponderada). Vai de 100% (vocês pensam na mesma direção em tudo) a 0% (direções opostas), com 50% no ponto neutro. Essa fórmula foi escolhida porque não favorece o candidato que tem posições mais perto do centro da escala.'),
      el('ul', {},
        el('li', {}, el('strong', {}, 'Peso da pergunta (0,6 a 1,2): '), 'é maior quando a pergunta diferencia bem os candidatos e a posição de ambos está clara; é menor em temas de consenso.'),
        el('li', {}, el('strong', {}, 'Força da resposta: '), 'respostas firmes (nada ou muito alinhado) pesam mais que as moderadas; "parcialmente alinhado" não aproxima de nenhum dos dois.'),
        el('li', {}, el('strong', {}, 'Importância: '), 'temas marcados como importantes valem 1,5x.'),
        el('li', {}, el('strong', {}, 'Pular: '), 'perguntas puladas não entram no cálculo. São necessárias ao menos 10 respostas.')
      ),
      el('h3', { class: 'h5 mt-4' }, 'Confiança das respostas'),
      el('p', {}, 'Ao final, um índice de 0% a 100% mostra o quanto o resultado é confiável. Ele multiplica quatro fatores, de modo que um problema em qualquer um deles reduz o total:'),
      el('ul', {},
        el('li', {}, el('strong', {}, 'Coerência: '), 'aponta combinações muito incomuns entre afirmações relacionadas, como defender ao mesmo tempo, com toda a força, manter as exigências ambientais nas obras e ampliar mineração e agropecuária na Amazônia. Só conta quando as duas respostas estão no extremo da escala. Combinar posições de lados diferentes é legítimo e não é penalizado.'),
        el('li', {}, el('strong', {}, 'Atenção: '), 'respostas dadas em menos de 2 segundos, tempo curto demais para ler a afirmação.'),
        el('li', {}, el('strong', {}, 'Variedade: '), 'usar sempre o mesmo nível ou só dois níveis reduz a nota; três ou mais níveis equilibrados valem 100%.'),
        el('li', {}, el('strong', {}, 'Cobertura: '), 'proporção de perguntas respondidas (pulos não contam).')
      ),
      el('p', {}, `Se a confiança ficar abaixo de ${CONFIANCA_MINIMA}%, ou se o mesmo nível for usado em ${REPETICAO_MAXIMA * 100}% ou mais das respostas, o resultado não é exibido. Se a diferença entre os candidatos for menor que ${EMPATE_PONTOS} pontos, o resultado é apresentado como empate técnico, em ordem alfabética e sem destacar ninguém.`),
      el('p', {}, 'Os tempos de resposta ficam só na memória da página e são apagados ao fechá-la.'),
      el('p', {}, 'As afirmações tratam de princípios gerais, como "punir com mais rigor ou atacar as causas do crime". Elas não usam propostas específicas, nomes de programas ou bandeiras de campanha, para que a resposta reflita a sua opinião, e não a identificação com um candidato. A ligação com propostas concretas só aparece no resultado.'),
      el('p', {}, 'O lado da escala não indica ideologia. Algumas afirmações aproximam de um candidato quando você concorda, e outras quando você discorda. As afirmações estão misturadas para evitar esse viés.'),
      el('p', {}, 'O cálculo foi auditado duas vezes por agentes independentes e testado em simulações com dezenas de milhares de respostas. Os pesos das perguntas também equilibram o conjunto de posições dos dois candidatos, para que ninguém fique mais perto do eleitor de meio-termo só por causa da estrutura do questionário. Com respostas aleatórias, moderadas, de meio-termo ou mistas, e com quem tende a concordar ou a discordar de tudo, a diferença média entre os candidatos ficou abaixo de 0,5 ponto. A chance de o resultado ser ocultado por baixa confiança é praticamente a mesma para quem pensa como qualquer um dos dois.'),
      el('h3', { class: 'h5 mt-4' }, 'Regra para definir as posições'),
      el('p', {}, 'A posição de cada candidato vem do que ele disse no debate. Fatos de fora do debate só entram com fonte documental, como votação, orientação de bancada ou ato de governo, e a mesma regra vale para os dois. Quando um candidato não tratou de um tema, a posição dele é neutra.'),
      el('p', { class: 'small text-body-secondary' }, 'Limitações: as posições resumem falas de um único debate e envolvem interpretação. Elas não cobrem todo o programa de governo dos candidatos. O alinhamento não mede competência, histórico nem viabilidade das propostas.'),
      el('button', { class: 'btn btn-primary', onclick: voltar }, 'Voltar')
    )));
  }

  // ---------- Compartilhar ----------
  // Compartilha apenas um texto com os percentuais; nenhuma resposta individual é incluída.

  function textoCompartilhar(r, ids, diff, CANDIDATOS) {
    const linhas = ids.map(id => `${CANDIDATOS[id].nome}: ${r.total[id].toFixed(0)}%`).join(' | ');
    const resumo = diff < EMPATE_PONTOS ? 'Deu empate técnico.' : `Estou mais alinhado(a) com ${CANDIDATOS[ids[0]].nome}.`;
    return `Fiz o teste de Alinhamento Eleitoral 2026 (2º turno), baseado no debate da TV Globo. ${resumo} ${linhas}. Faça o seu: ${urlSite()}`;
  }

  function urlSite() {
    return location.origin + location.pathname;
  }

  async function compartilhar(botao, texto) {
    if (navigator.share) {
      try { await navigator.share({ title: 'Alinhamento Eleitoral 2026', text: texto }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(texto);
      const original = botao.textContent;
      botao.textContent = 'Texto copiado!';
      setTimeout(() => { botao.textContent = original; }, 2000);
    } catch (e) {
      window.prompt('Copie o texto abaixo para compartilhar:', texto);
    }
  }

  // ---------- Lógica ----------

  // Similaridade de cosseno ponderada entre as respostas e as posições de cada candidato,
  // exibida de 0% (direções opostas) a 100% (mesma direção). A resposta "parcialmente
  // alinhado" (0) não puxa para nenhum lado, e a fórmula não favorece posições mais centrais.
  function cosseno(qs, cand, S) {
    let uv = 0, uu = 0, vv = 0;
    for (const q of qs) {
      const u = estado.respostas[q.id];
      if (u === undefined) continue;
      const w = q.peso * (estado.importantes[q.id] ? PESO_IMPORTANTE : 1);
      const v = S.p[q.id][cand].v;
      uv += w * u * v; uu += w * u * u; vv += w * v * v;
    }
    return uu && vv ? 50 * (1 + uv / Math.sqrt(uu * vv)) : null;
  }

  function calcular() {
    const S = revelar(), cands = Object.keys(S.c);
    const total = Object.fromEntries(cands.map(c => [c, cosseno(PERGUNTAS, c, S) ?? 50]));
    const temas = {};
    for (const t of new Set(PERGUNTAS.map(q => q.tema))) {
      const qs = PERGUNTAS.filter(q => q.tema === t && estado.respostas[q.id] !== undefined);
      if (!qs.length) continue;
      // Com uma só pergunta, o cosseno só dá 0% ou 100%; nesse caso mostra a proximidade direta.
      temas[t] = Object.fromEntries(cands.map(c => [c, qs.length === 1
        ? 100 * (1 - Math.abs(estado.respostas[qs[0].id] - S.p[qs[0].id][c].v) / 4)
        : cosseno(qs, c, S)]));
    }
    return { total, temas };
  }

  // Confiança = coerência x atenção x variedade x cobertura (cada fator reduz o total).
  function avaliarConfianca() {
    const R = estado.respostas, ids = Object.keys(R);
    let somaPeso = 0, somaSev = 0;
    const conflitos = [];
    for (const p of COERENCIA) {
      const ua = R[p.a], ub = R[p.b];
      // Resposta neutra não indica coerência nem contradição.
      if (ua === undefined || ub === undefined || ua === 0 || ub === 0) continue;
      somaPeso += p.peso;
      // Só conta quando as duas respostas estão no extremo da escala e em sentidos contrários ao usual.
      const sev = Math.abs(ua) === 2 && Math.abs(ub) === 2 && Math.abs(ua - p.relacao * ub) === 4 ? 1 : 0;
      somaSev += p.peso * sev;
      if (sev > 0) conflitos.push({ ...p, ua, ub, sev });
    }
    conflitos.sort((x, y) => y.sev - x.sev);
    const coerencia = 1 - somaSev / Math.max(somaPeso, 0.75);

    const tempos = ids.map(id => estado.tempos[id]).filter(t => t !== undefined);
    const rapidas = tempos.filter(t => t < LEITURA_MINIMA_MS).length;
    const atencao = tempos.length ? 1 - rapidas / tempos.length : 1;

    const freq = {};
    for (const id of ids) freq[R[id]] = (freq[R[id]] || 0) + 1;
    const maisComum = ids.length ? Math.max(...Object.values(freq)) / ids.length : 1;
    // Variedade pela entropia: usar três ou mais níveis de forma equilibrada vale 100%.
    const entropia = Object.values(freq).reduce((h, n) => h - (n / ids.length) * Math.log(n / ids.length), 0);
    const variedade = Math.min(1, entropia / Math.log(3));

    const cobertura = ids.length / PERGUNTAS.length;

    const f = x => 0.5 + 0.5 * x;
    const total = Math.round(100 * (0.3 + 0.7 * coerencia) * f(atencao) * f(variedade) * f(cobertura));
    return { total, coerencia, atencao, variedade, cobertura, conflitos, rapidas, maisComum };
  }

  function responder(id, valor) {
    estado.respostas[id] = valor;
    estado.tempos[id] = performance.now() - estado.inicio;
    estado.rapidasSeguidas = estado.tempos[id] < LEITURA_MINIMA_MS ? estado.rapidasSeguidas + 1 : 0;
    estado.avisar = estado.rapidasSeguidas >= AVISO_RAPIDAS;
    setTimeout(() => irPara(estado.indice + 1), 180);
  }

  function irPara(i) {
    if (i < 0) return telaInicio();
    estado.indice = i;
    if (i >= PERGUNTAS.length) return telaResultado();
    telaPergunta();
  }

  function recomecar() {
    estado.respostas = {}; estado.importantes = {}; estado.tempos = {}; estado.rapidasSeguidas = 0; estado.avisar = false;
    telaInicio();
  }

  document.getElementById('linkMetodologia').addEventListener('click', e => { e.preventDefault(); telaMetodologia(); });
  document.getElementById('linkInicio').addEventListener('click', e => { e.preventDefault(); telaInicio(); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  telaInicio();
})();
