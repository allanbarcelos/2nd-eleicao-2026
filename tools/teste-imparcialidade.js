// Teste automatizado de imparcialidade: decodifica assets/js/data.js e simula eleitores
// com a mesma lógica do site. Falha (código 1) se algum cenário sem posição política
// definida favorecer um candidato, ou se o bloqueio por baixa confiança for desigual.
// Uso: node tools/teste-imparcialidade.js [número de eleitores por cenário]
'use strict';
const fs = require('fs');
const path = require('path');

const N = +process.argv[2] || 30000;
const LIMITE_DIF = 1;        // pontos de diferença média
const LIMITE_BLOQUEIO = 1.5; // pontos percentuais de diferença no bloqueio
const CONFIANCA_MINIMA = 70, REPETICAO_MAXIMA = 0.8, MIN_RESPOSTAS = 10;

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'data.js'), 'utf8');
const ctx = {};
new Function('ctx', src.replace(/^const (\w+) =/gm, 'ctx.$1 =')).call(null, ctx);
const { PERGUNTAS, COERENCIA, DADOS } = ctx;

let h = 2166136261;
for (const ch of DADOS.k) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
let x = h;
const prox = () => { x = (x + 0x6D2B79F5) >>> 0; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) & 255; };
const S = JSON.parse(Buffer.from(Buffer.from(DADOS.d, 'base64').map(b => b ^ prox())).toString('utf8'));
const [A, B] = Object.keys(S.c);
const nome = id => S.c[id].nome;
const pos = (q, c) => S.p[q.id][c].v;

function cosseno(R, c) {
  let uv = 0, uu = 0, vv = 0;
  for (const q of PERGUNTAS) { const u = R[q.id]; if (u === undefined) continue; const v = pos(q, c); uv += q.peso * u * v; uu += q.peso * u * u; vv += q.peso * v * v; }
  return uu && vv ? 50 * (1 + uv / Math.sqrt(uu * vv)) : 50;
}
function exibido(R) {
  const ids = Object.keys(R);
  if (ids.length < MIN_RESPOSTAS) return false;
  let w = 0, s = 0;
  for (const p of COERENCIA) {
    const a = R[p.a], b = R[p.b];
    if (a === undefined || b === undefined || !a || !b) continue;
    w += p.peso; s += p.peso * (Math.abs(a) === 2 && Math.abs(b) === 2 && Math.abs(a - p.relacao * b) === 4 ? 1 : 0);
  }
  const co = 1 - s / Math.max(w, 0.75);
  const f = {}; ids.forEach(i => { f[R[i]] = (f[R[i]] || 0) + 1; });
  const mc = Math.max(...Object.values(f)) / ids.length;
  const H = Object.values(f).reduce((a, n) => a - (n / ids.length) * Math.log(n / ids.length), 0);
  const g = v => 0.5 + 0.5 * v;
  const total = Math.round(100 * (0.3 + 0.7 * co) * g(1) * g(Math.min(1, H / Math.log(3))) * g(ids.length / PERGUNTAS.length));
  return total >= CONFIANCA_MINIMA && mc < REPETICAO_MAXIMA;
}

const rnd = a => a[Math.floor(Math.random() * a.length)];
// Arredondamento estocástico: Math.round levaria os meios-pontos sempre para cima e criaria viés.
const arred = v => { const f = Math.floor(v); return f + (Math.random() < v - f ? 1 : 0); };
const cl = v => Math.max(-2, Math.min(2, arred(v)));
const gera = f => () => Object.fromEntries(PERGUNTAS.map(q => [q.id, f(q)]).filter(([, v]) => v !== undefined));

const semPosicao = {
  'aleatório (-2 a 2)': gera(() => rnd([-2, -1, 0, 1, 2])),
  'moderado (-1 a 1)': gera(() => rnd([-1, 0, 1])),
  'só extremos (±2)': gera(() => rnd([-2, 2])),
  'tende a concordar': gera(() => cl(0.5 + Math.random() * 4 - 2)),
  'tende a discordar': gera(() => cl(-0.5 + Math.random() * 4 - 2)),
  'meio-termo entre os dois': gera(q => cl((pos(q, A) + pos(q, B)) / 2 + rnd([-0.5, 0, 0.5]))),
  'mistura (cada resposta de um dos dois)': gera(q => pos(q, rnd([A, B]))),
  'aleatório com 30% de pulos': gera(() => (Math.random() < 0.3 ? undefined : rnd([-2, -1, 0, 1, 2])))
};

let falhou = false;
console.log(`Candidatos: ${nome(A)} x ${nome(B)} | ${N} eleitores por cenário\n`);
for (const [cenario, f] of Object.entries(semPosicao)) {
  let soma = 0, vA = 0, vB = 0;
  for (let i = 0; i < N; i++) { const R = f(); const d = cosseno(R, A) - cosseno(R, B); soma += d; if (d >= 8) vA++; else if (d <= -8) vB++; }
  const dif = soma / N, ok = Math.abs(dif) < LIMITE_DIF;
  if (!ok) falhou = true;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${cenario.padEnd(40)} diferença média ${dif.toFixed(2).padStart(6)} | ${nome(A)} ${(100 * vA / N).toFixed(1)}% x ${nome(B)} ${(100 * vB / N).toFixed(1)}%`);
}

const copia = (c, r) => gera(q => (Math.random() < r ? cl(pos(q, c) + rnd([-1, 1])) : pos(q, c)));
for (const r of [0.2, 0.4]) {
  const bloq = c => { let b = 0; const f = copia(c, r); for (let i = 0; i < N; i++) if (!exibido(f())) b++; return 100 * b / N; };
  const bA = bloq(A), bB = bloq(B), ok = Math.abs(bA - bB) < LIMITE_BLOQUEIO;
  if (!ok) falhou = true;
  console.log(`${ok ? 'OK   ' : 'FALHA'} bloqueio de quem pensa como cada um (${r * 100}% de ruído)`.padEnd(68) + `${nome(A)} ${bA.toFixed(1)}% x ${nome(B)} ${bB.toFixed(1)}%`);
}

const espelho = c => Object.fromEntries(PERGUNTAS.map(q => [q.id, -pos(q, c)]));
const igual = c => Object.fromEntries(PERGUNTAS.map(q => [q.id, pos(q, c)]));
const simetrico = Math.abs(cosseno(igual(A), B) - cosseno(igual(B), A)) < 0.01 && Math.abs(cosseno(espelho(A), B) - cosseno(espelho(B), A)) < 0.01;
if (!simetrico) falhou = true;
console.log(`${simetrico ? 'OK   ' : 'FALHA'} cópia e espelho simétricos`);

console.log(falhou ? '\nResultado: FALHOU' : '\nResultado: aprovado');
process.exit(falhou ? 1 : 0);
