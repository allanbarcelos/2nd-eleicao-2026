// Gera assets/js/data.js a partir de fonte/dados.json (pasta fora do Git).
// As posições dos candidatos são embaralhadas em um bloco codificado, com identificadores
// aleatórios a cada geração, para que não possam ser lidas no código durante o questionário.
// Uso: node tools/gerar-dados.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..');
const fonte = JSON.parse(fs.readFileSync(path.join(raiz, 'fonte', 'dados.json'), 'utf8'));

const novoId = () => crypto.randomBytes(4).toString('hex');
const mapaCand = Object.fromEntries(Object.keys(fonte.CANDIDATOS).map(k => [k, novoId()]));
const mapaPerg = Object.fromEntries(fonte.PERGUNTAS.map(q => [q.id, novoId()]));

const ordem = arr => arr.slice().sort(() => crypto.randomInt(3) - 1);

const segredo = {
  c: Object.fromEntries(Object.entries(fonte.CANDIDATOS).map(([k, v]) => [mapaCand[k], v])),
  p: Object.fromEntries(fonte.PERGUNTAS.map(q => [mapaPerg[q.id],
    Object.fromEntries(ordem(Object.keys(q.pos)).map(k => [mapaCand[k], q.pos[k]]))])),
  k: Object.fromEntries(Object.entries(fonte.CHECAGEM).map(([k, v]) => [mapaCand[k], v]))
};

const chave = crypto.randomBytes(16).toString('base64');
const bytes = Buffer.from(JSON.stringify(segredo), 'utf8');
const fluxo = (() => {
  let h = 2166136261;
  for (const ch of chave) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let s = h;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) & 255; };
})();
const codificado = Buffer.from(bytes.map(b => b ^ fluxo())).toString('base64');

const perguntas = fonte.PERGUNTAS.map(q => ({ id: mapaPerg[q.id], tema: q.tema, texto: q.texto, peso: q.peso }));
const coerencia = fonte.COERENCIA.map(c => ({ ...c, a: mapaPerg[c.a], b: mapaPerg[c.b] }));

const saida = `// Arquivo gerado por tools/gerar-dados.js. Não edite à mão.
const NIVEIS = ${JSON.stringify(fonte.NIVEIS)};
const PERGUNTAS = ${JSON.stringify(perguntas)};
const COERENCIA = ${JSON.stringify(coerencia)};
const DADOS = { k: '${chave}', d: '${codificado}' };
`;
fs.writeFileSync(path.join(raiz, 'assets', 'js', 'data.js'), saida);
console.log(`data.js gerado: ${perguntas.length} perguntas, ${codificado.length} caracteres codificados.`);
