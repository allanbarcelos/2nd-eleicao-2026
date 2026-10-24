// Questionário de alinhamento. Nenhuma resposta sai do navegador nem é armazenada.
(function () {
  'use strict';

  const INTENSIDADE = { '-2': 1.2, '-1': 1.0, '0': 0.5, '1': 1.0, '2': 1.2 };
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

  const estado = { indice: -1, respostas: {}, importantes: {}, tempos: {}, inicio: 0 };
  const LEITURA_MINIMA_MS = 2000;
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
    const ids = Object.keys(CANDIDATOS).sort((a, b) => r.total[b] - r.total[a] || CANDIDATOS[a].nome.localeCompare(CANDIDATOS[b].nome));
    const diff = Math.abs(r.total[ids[0]] - r.total[ids[1]]);

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

    const barras = ids.map(id => el('div', { class: 'mb-3' },
      el('div', { class: 'd-flex justify-content-between' },
        el('strong', {}, `${CANDIDATOS[id].nome} (${CANDIDATOS[id].partido})`),
        el('span', { class: 'fw-semibold' }, `${r.total[id].toFixed(0)}%`)
      ),
      el('div', { class: 'progress', style: 'height:1.25rem' },
        el('div', { class: 'progress-bar', style: `width:${r.total[id]}%;background:${CANDIDATOS[id].cor}` })
      )
    ));

    const veredito = diff < 5
      ? `Empate técnico: a diferença é de ${diff.toFixed(0)} ponto(s). Suas respostas se dividem entre as posições dos dois.`
      : `Suas respostas estão mais alinhadas às posições de ${CANDIDATOS[ids[0]].nome}, com ${diff.toFixed(0)} pontos de diferença.`;

    const temas = el('table', { class: 'table table-sm align-middle' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Tema'), ...ids.map(id => el('th', { class: 'text-end' }, CANDIDATOS[id].nome)))),
      el('tbody', {}, Object.keys(r.temas).sort().map(t => el('tr', {},
        el('td', {}, t), ...ids.map(id => el('td', { class: 'text-end' }, `${r.temas[t][id].toFixed(0)}%`))
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
        el('h2', { class: 'h3 mb-4' }, 'Seu resultado'),
        barras,
        el('p', { class: 'mt-3' }, veredito),
        el('p', { class: 'small text-body-secondary mb-0' },
          `${respondidas} de ${PERGUNTAS.length} respondidas, ${neutras} como "parcialmente alinhado". ` +
          'O alinhamento mede proximidade com as posições do debate; não é recomendação de voto.')
      )),
      cartaoConfianca(conf),
      el('div', { class: 'card shadow-sm mb-4' }, el('div', { class: 'card-body p-4' },
        el('h2', { class: 'h5' }, 'Alinhamento por tema'), temas)),
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
        item('Coerência', c.coerencia, 'Respostas a afirmações ligadas entre si não se contradizem.'),
        item('Atenção', c.atencao, 'Tempo suficiente para ler cada afirmação antes de responder.'),
        item('Variedade', c.variedade, 'As respostas não repetem o mesmo nível em quase todas as perguntas.'),
        item('Cobertura', c.cobertura, 'Perguntas respondidas com posição definida (pulos e "parcialmente" contam menos).')
      ),
      c.conflitos.length ? el('div', {},
        el('p', { class: 'small fw-semibold mb-1' }, 'Combinações que reduziram a coerência:'),
        el('ul', { class: 'small mb-2' }, c.conflitos.map(k => el('li', { class: 'mb-1' },
          `Você ficou "${rot(k.ua)}" com ${curto(k.a)} e "${rot(k.ub)}" com ${curto(k.b)}. Normalmente essas respostas andam juntas no sentido contrário, porque ${k.motivo}.`))),
        el('p', { class: 'small text-body-secondary mb-0' }, 'Uma combinação incomum não é necessariamente um erro: pode refletir uma opinião própria. Vale reler essas afirmações.')
      ) : el('p', { class: 'small mb-0' }, 'Nenhuma contradição encontrada entre afirmações ligadas.'),
      c.coerencia === 0.5 && !c.conflitos.length ? el('p', { class: 'small mb-0' }, 'Não houve respostas definidas suficientes nos pares de afirmações ligadas para avaliar a coerência.') : null,
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
      el('p', {}, 'Para cada resposta, a proximidade com cada candidato vai de 100% (mesma posição) a 0% (posições opostas). O resultado final é a média ponderada dessas proximidades:'),
      el('ul', {},
        el('li', {}, el('strong', {}, 'Peso da pergunta (0,6 a 1,2): '), 'é maior quando a pergunta diferencia bem os candidatos e a posição de ambos está clara; é menor em temas de consenso.'),
        el('li', {}, el('strong', {}, 'Intensidade da resposta: '), 'respostas firmes (nada ou muito alinhado) valem 1,2x; "parcialmente alinhado" vale 0,5x, porque informa menos.'),
        el('li', {}, el('strong', {}, 'Importância: '), 'temas marcados como importantes valem 1,5x.'),
        el('li', {}, el('strong', {}, 'Pular: '), 'perguntas puladas não entram no cálculo. São necessárias ao menos 10 respostas.')
      ),
      el('h3', { class: 'h5 mt-4' }, 'Confiança das respostas'),
      el('p', {}, 'Ao final, um índice de 0% a 100% mostra o quanto o resultado é confiável. Ele multiplica quatro fatores, de modo que um problema em qualquer um deles reduz o total:'),
      el('ul', {},
        el('li', {}, el('strong', {}, 'Coerência (fator principal): '), 'oito pares de afirmações ligadas logicamente, como "o governo deve gastar menos" e "transferências de renda não devem ser ampliadas". Respostas em sentidos contraditórios reduzem a nota, e "parcialmente alinhado" não conta nem a favor nem contra. Os pares foram escolhidos de modo que o discurso de qualquer dos dois candidatos tenha 100% de coerência.'),
        el('li', {}, el('strong', {}, 'Atenção: '), 'respostas dadas em menos de 2 segundos, tempo curto demais para ler a afirmação.'),
        el('li', {}, el('strong', {}, 'Variedade: '), 'repetir o mesmo nível em mais de 60% das perguntas.'),
        el('li', {}, el('strong', {}, 'Cobertura: '), 'perguntas respondidas; "parcialmente alinhado" vale metade e pulos não contam.')
      ),
      el('p', {}, 'Os tempos de resposta ficam só na memória da página e são apagados ao fechá-la.'),
      el('p', {}, 'As afirmações tratam de princípios gerais, como "punir com mais rigor ou atacar as causas do crime". Elas não usam propostas específicas, nomes de programas ou bandeiras de campanha, para que a resposta reflita a sua opinião, e não a identificação com um candidato. A ligação com propostas concretas só aparece no resultado.'),
      el('p', {}, 'O lado da escala não indica ideologia. Algumas afirmações aproximam de um candidato quando você concorda, e outras quando você discorda. As afirmações estão misturadas para evitar esse viés.'),
      el('p', {}, 'O cálculo foi testado contra viés. Quem responde "parcialmente alinhado" em tudo fica empatado. Respostas aleatórias se dividem igualmente entre os dois. Concordar ou discordar de tudo desloca o resultado em poucos pontos, de forma simétrica. Quando a posição de um candidato não era clara no debate, a pergunta foi descartada.'),
      el('p', { class: 'small text-body-secondary' }, 'Limitações: as posições resumem falas de um único debate e envolvem interpretação. Elas não cobrem todo o programa de governo dos candidatos. O alinhamento não mede competência, histórico nem viabilidade das propostas.'),
      el('button', { class: 'btn btn-primary', onclick: voltar }, 'Voltar')
    )));
  }

  // ---------- Compartilhar ----------
  // Compartilha apenas um texto com os percentuais; nenhuma resposta individual é incluída.

  function textoCompartilhar(r, ids, diff, CANDIDATOS) {
    const linhas = ids.map(id => `${CANDIDATOS[id].nome}: ${r.total[id].toFixed(0)}%`).join(' | ');
    const resumo = diff < 5 ? 'Deu empate técnico.' : `Estou mais alinhado(a) com ${CANDIDATOS[ids[0]].nome}.`;
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

  function calcular() {
    const S = revelar(), cands = Object.keys(S.c);
    const zeros = () => Object.fromEntries(cands.map(c => [c, 0]));
    const soma = zeros(), pesos = zeros();
    const temas = {};
    for (const q of PERGUNTAS) {
      const u = estado.respostas[q.id];
      if (u === undefined) continue;
      const w = q.peso * INTENSIDADE[String(u)] * (estado.importantes[q.id] ? PESO_IMPORTANTE : 1);
      temas[q.tema] = temas[q.tema] || { ...zeros(), w: 0 };
      for (const id of cands) {
        const prox = 1 - Math.abs(u - S.p[q.id][id].v) / 4;
        soma[id] += w * prox; pesos[id] += w;
        temas[q.tema][id] += w * prox;
      }
      temas[q.tema].w += w;
    }
    const total = {};
    for (const id of cands) total[id] = pesos[id] ? (soma[id] / pesos[id]) * 100 : 0;
    const porTema = {};
    for (const [t, v] of Object.entries(temas)) porTema[t] = Object.fromEntries(cands.map(c => [c, (v[c] / v.w) * 100]));
    return { total, temas: porTema };
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
      const dist = Math.abs(ua - p.relacao * ub);
      const sev = Math.max(0, dist - 1) / 3;
      somaSev += p.peso * sev;
      if (sev >= 0.3) conflitos.push({ ...p, ua, ub, sev });
    }
    conflitos.sort((x, y) => y.sev - x.sev);
    const coerencia = somaPeso ? Math.max(0, 1 - 2 * somaSev / somaPeso) : 0.5;

    const tempos = ids.map(id => estado.tempos[id]).filter(t => t !== undefined);
    const rapidas = tempos.filter(t => t < LEITURA_MINIMA_MS).length;
    const atencao = tempos.length ? 1 - rapidas / tempos.length : 1;

    const freq = {};
    for (const id of ids) freq[R[id]] = (freq[R[id]] || 0) + 1;
    const maisComum = ids.length ? Math.max(...Object.values(freq)) / ids.length : 1;
    const variedade = maisComum <= 0.6 ? 1 : Math.max(0, 1 - (maisComum - 0.6) / 0.4);

    const cobertura = ids.reduce((s, id) => s + (R[id] === 0 ? 0.5 : 1), 0) / PERGUNTAS.length;

    const f = x => 0.5 + 0.5 * x;
    const total = Math.round(100 * (0.3 + 0.7 * coerencia) * f(atencao) * f(variedade) * f(cobertura));
    return { total, coerencia, atencao, variedade, cobertura, conflitos, rapidas };
  }

  function responder(id, valor) {
    estado.respostas[id] = valor;
    estado.tempos[id] = performance.now() - estado.inicio;
    setTimeout(() => irPara(estado.indice + 1), 180);
  }

  function irPara(i) {
    if (i < 0) return telaInicio();
    estado.indice = i;
    if (i >= PERGUNTAS.length) return telaResultado();
    telaPergunta();
  }

  function recomecar() {
    estado.respostas = {}; estado.importantes = {}; estado.tempos = {};
    telaInicio();
  }

  document.getElementById('linkMetodologia').addEventListener('click', e => { e.preventDefault(); telaMetodologia(); });
  document.getElementById('linkInicio').addEventListener('click', e => { e.preventDefault(); telaInicio(); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  telaInicio();
})();
