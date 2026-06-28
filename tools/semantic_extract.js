const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const METADATA_DIR = path.join(ROOT, 'metadata');
const INDEX_DIR = path.join(ROOT, 'index');

const OUT_DIRS = ['semantic', 'glossary', 'abbreviations', 'formulas', 'regulations', 'concepts', 'reports'];
for (const dir of OUT_DIRS) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });

const TOPIC_PATTERNS = [
  ['Expected Shortfall', /\b(expected\s+shortfall|ES)\b|기대\s*손실|예상\s*부족/i],
  ['Value at Risk', /\b(value\s+at\s+risk|VaR)\b|시장\s*VaR|위험가치/i],
  ['Stress Testing', /\b(stress\s*test(?:ing)?|scenario)\b|스트레스\s*테스트|시나리오/i],
  ['Backtesting', /\bback[-\s]?testing\b|사후\s*검증/i],
  ['FRTB', /\bFRTB\b|Fundamental Review of the Trading Book|바젤\s*III.*시장리스크/i],
  ['Basel III', /Basel\s*III|바젤\s*III|바젤Ⅲ/i],
  ['Basel II', /Basel\s*II|바젤\s*II|바젤Ⅱ/i],
  ['Market Risk', /Market\s+Risk|시장\s*리스크|시장\s*위험/i],
  ['Credit Risk', /Credit\s+Risk|신용\s*리스크|신용\s*위험/i],
  ['Operational Risk', /Operational\s+Risk|운영\s*리스크|운영\s*위험/i],
  ['Liquidity Horizon', /Liquidity\s+Horizon|유동성\s*기간/i],
  ['Sensitivity', /\bSensitivity|sensitivities|Greek|Delta|Gamma|Vega\b|민감도/i],
  ['Default Risk', /Default\s+Risk|부도\s*리스크|부도\s*위험/i],
  ['Residual Risk', /Residual\s+Risk|잔여\s*리스크|잔여\s*위험/i],
  ['NCR', /\bNCR\b|영업용\s*순자본|순자본비율/i],
  ['OTC Derivatives', /\bOTC\b|장외파생/i],
  ['Pricing', /\bpricing|valuation|MTM\b|평가|이론가/i],
  ['P&L', /\bP&L\b|손익/i],
  ['IFRS 9', /\bIFRS\s*9\b|기대신용손실|ECL/i],
  ['Counterparty Credit Risk', /\bCCR\b|Counterparty\s+Credit\s+Risk|거래상대방/i],
  ['CVA', /\bCVA\b|Credit\s+Valuation\s+Adjustment/i],
  ['Java', /\bJava\b|Spring|JVM/i],
  ['Treasury', /Treasury|ALM|자금|유동성/i],
  ['Statistics', /volatility|correlation|standard\s+deviation|분산|표준편차|변동성|상관계수/i],
];

const CONCEPT_PATTERNS = [
  ['Capital Ratio', /capital\s+ratio|자본\s*비율|자기자본비율/i],
  ['Net Capital Ratio', /\bNCR\b|순자본비율|영업용\s*순자본/i],
  ['Risk Weighted Assets', /\bRWA\b|위험가중자산/i],
  ['Probability of Default', /\bPD\b|Probability\s+of\s+Default|부도율|부도확률/i],
  ['Loss Given Default', /\bLGD\b|Loss\s+Given\s+Default|부도시\s*손실률/i],
  ['Exposure at Default', /\bEAD\b|Exposure\s+at\s+Default|부도시\s*익스포저/i],
  ['Expected Credit Loss', /\bECL\b|Expected\s+Credit\s+Loss|기대신용손실/i],
  ['Risk Factor', /risk\s*factor|리스크\s*팩터|위험\s*요인/i],
  ['Sensitivity', /sensitivity|Delta|Gamma|Vega|민감도/i],
  ['Volatility', /volatility|변동성/i],
  ['Correlation', /correlation|상관계수/i],
  ['Yield Curve', /yield\s*curve|수익률\s*커브/i],
  ['Stress Scenario', /stress\s*scenario|시나리오/i],
  ['Market Data', /market\s*data|시장\s*데이터|시장가/i],
  ['Position', /position|포지션/i],
  ['Portfolio', /portfolio|포트폴리오/i],
  ['Margin', /margin|증거금/i],
  ['Default', /\bdefault\b|부도/i],
  ['Risk Charge', /risk\s*charge|위험액|리스크\s*산출/i],
  ['Capital Requirement', /capital\s*requirement|소요자본|규제자본/i],
  ['Liquidity Horizon', /liquidity\s*horizon|유동성\s*기간/i],
  ['Residual Risk Add-on', /residual\s*risk|잔여\s*리스크/i],
  ['Default Risk Charge', /default\s*risk\s*charge|부도\s*리스크/i],
  ['Backtesting', /back[-\s]?testing|사후\s*검증/i],
  ['Monte Carlo Simulation', /Monte[-\s]?Carlo|몬테\s*카를로/i],
  ['Historical Simulation', /Historical|역사적/i],
  ['Parametric VaR', /Parametric|모수/i],
  ['REST API', /\bREST\s*API\b/i],
  ['Batch Scheduler', /batch|scheduler|배치|스케줄/i],
  ['Data Loader', /Data\s*Loader|ETL|적재/i],
];

const REGULATION_PATTERNS = [
  ['Basel II', /Basel\s*II|바젤\s*II|바젤Ⅱ/i],
  ['Basel III', /Basel\s*III|바젤\s*III|바젤Ⅲ/i],
  ['Basel IV', /Basel\s*IV|바젤\s*IV|바젤Ⅳ/i],
  ['BCBS d352', /\bBCBS\s*d?352\b|d352/i],
  ['IFRS 9', /\bIFRS\s*9\b|IFRS9/i],
  ['CRR', /\bCRR\b/i],
  ['CRD', /\bCRD\b/i],
  ['FRTB', /\bFRTB\b|Fundamental Review of the Trading Book/i],
  ['NCR Regulation', /\bNCR\b|금융투자업자.*NCR|영업용\s*순자본/i],
  ['Korean Financial Supervisory Regulation', /금융감독원|금융위원회|금융투자업규정/i],
];

const ORG_PATTERNS = [
  ['BIS', /\bBIS\b|Bank for International Settlements/i],
  ['BCBS', /\bBCBS\b|Basel Committee/i],
  ['IOSCO', /\bIOSCO\b/i],
  ['IASB', /\bIASB\b/i],
  ['ECB', /\bECB\b|European Central Bank/i],
  ['FSS', /금융감독원|\bFSS\b/i],
  ['FSC', /금융위원회|\bFSC\b/i],
  ['JURO', /\bJURO\b|유로/i],
  ['UROSYS', /\bUROSYS\b/i],
];

const DOMAIN_RULES = [
  ['Market Risk', /market\s+risk|시장\s*리스크|시장\s*위험|VaR|Expected\s+Shortfall|FRTB/i],
  ['Credit Risk', /credit\s+risk|신용\s*리스크|신용\s*위험|PD|LGD|EAD|CVA|CCR|IFRS\s*9/i],
  ['Operational Risk', /operational\s+risk|운영\s*리스크|운영\s*위험/i],
  ['Treasury', /treasury|ALM|자금|유동성/i],
  ['Statistics', /volatility|correlation|분산|표준편차|변동성|상관계수|Monte/i],
  ['Mathematics', /formula|equation|수식|Greek|Delta|Gamma|Vega/i],
  ['Java', /\bJava\b|Spring|JVM|REST API/i],
  ['Regulation', /Basel|바젤|IFRS|CRR|CRD|NCR|금융감독원/i],
];

const ABBREVIATIONS = [
  'FRTB', 'IFRS', 'CCR', 'CVA', 'RWA', 'ES', 'VaR', 'NCR', 'PD', 'LGD', 'EAD', 'ECL', 'PFE', 'RC',
  'SA', 'IMA', 'DRC', 'RRAO', 'GIRR', 'CSR', 'FX', 'OTC', 'MTM', 'P&L', 'API', 'REST', 'CLI', 'XML',
  'ETL', 'ALM', 'BCBS', 'BIS', 'IOSCO', 'IASB', 'ECB', 'FSS', 'FSC', 'KIS', 'ELS'
];

const SYMBOL_PATTERNS = [
  ['PD', /\bPD\b/], ['LGD', /\bLGD\b/], ['EAD', /\bEAD\b/], ['sigma', /σ|\bsigma\b/i],
  ['rho', /ρ|\brho\b/i], ['lambda', /λ|\blambda\b/i], ['delta', /Δ|\bDelta\b|\b델타\b/i],
  ['gamma', /Γ|\bGamma\b|\b감마\b/i], ['vega', /ν|\bVega\b|\b베가\b/i],
  ['theta', /θ|\bTheta\b/i], ['VaR', /\bVaR\b/], ['ES', /\bES\b/], ['RWA', /\bRWA\b/],
  ['CVA', /\bCVA\b/], ['PFE', /\bPFE\b/], ['RC', /\bRC\b/]
];

const FORMULA_TERMS = ['ECL', 'RWA', 'VaR', 'ES', 'RC', 'PFE', 'CVA', 'PD', 'LGD', 'EAD', 'NCR'];

function yamlScalar(value) {
  if (value === null || value === undefined || value === '') return "''";
  const s = String(value).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  return JSON.stringify(s);
}

function yamlList(items, indent = 2) {
  const pad = ' '.repeat(indent);
  if (!items || items.length === 0) return `${pad}[]\n`;
  return items.map(item => `${pad}- ${yamlScalar(item)}\n`).join('');
}

function yamlObjectList(items, indent = 2) {
  const pad = ' '.repeat(indent);
  if (!items || items.length === 0) return `${pad}[]\n`;
  return items.map(obj => {
    const keys = Object.keys(obj);
    let out = `${pad}- ${keys[0]}: ${yamlScalar(obj[keys[0]])}\n`;
    for (const key of keys.slice(1)) out += `${pad}  ${key}: ${yamlScalar(obj[key])}\n`;
    return out;
  }).join('');
}

function parseMetadata(text) {
  const data = {};
  for (const key of ['id', 'original_path', 'relative_path', 'filename', 'extension', 'inventory_status', 'estimated_category']) {
    const m = text.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    data[key] = m ? m[1].trim().replace(/^"|"$/g, '') : '';
  }
  const domains = [];
  const domainBlock = text.match(/^estimated_domain:\s*\r?\n((?:\s+- .*\r?\n?)*)/m);
  if (domainBlock) {
    for (const m of domainBlock[1].matchAll(/^\s+-\s+(.*)$/gm)) domains.push(m[1].trim());
  }
  data.estimated_domain = domains;
  return data;
}

function normalizeText(text) {
  return text.replace(/[{}][0-9A-Fa-f-]{20,}[{}]?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  return normalizeText(text)
    .split(/(?<=[.!?。])\s+|(?<=다)\s+|(?<=요)\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 25 && s.length <= 500);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function matches(patterns, text) {
  return unique(patterns.filter(([, re]) => re.test(text)).map(([name]) => name));
}

function summarize(text, filename, hasIndex) {
  if (!hasIndex) return 'Text index not available in KC-001; semantic extraction is limited to metadata-derived signals.';
  const sentences = splitSentences(text);
  const scored = sentences.map((sentence, idx) => {
    const keywordHits = [...TOPIC_PATTERNS, ...CONCEPT_PATTERNS].reduce((n, [, re]) => n + (re.test(sentence) ? 1 : 0), 0);
    return { sentence, score: keywordHits * 10 - idx * 0.03 };
  }).sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));
  let summary = scored.length ? scored.map(s => s.sentence).join(' ') : `${filename} contains indexed text but few domain-specific extraction signals.`;
  const words = summary.split(/\s+/);
  if (words.length > 200) summary = words.slice(0, 200).join(' ') + '...';
  return summary;
}

function extractAbbreviations(text) {
  const known = ABBREVIATIONS.filter(a => new RegExp(`(^|[^A-Za-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9]|$)`, 'i').test(text));
  const defined = [...text.matchAll(/(?:[A-Za-z][A-Za-z /-]{3,80}|[가-힣\s]{2,80})\(([A-Z][A-Z0-9&]{1,9})\)/g)]
    .map(m => m[1])
    .filter(t => !/[0-9]{2,}/.test(t))
    .filter(t => /^[A-Z&]{2,8}$/.test(t));
  return unique([...known, ...defined]).slice(0, 60);
}
function extractFormulas(text) {
  const formulas = [];
  for (const term of FORMULA_TERMS) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(text)) formulas.push({ expression: term, source: 'keyword/formula candidate occurrence' });
  }
  const exprMatches = [...text.matchAll(/\b[A-Za-z][A-Za-z0-9_]{0,12}\s*=\s*[^.;\n]{2,120}/g)]
    .map(m => m[0].trim())
    .filter(expr => !/IFERROR|VLOOKUP|NOT_FOUND|VARCHAR|CHAR\(|NOT NULL|Context|args|autoDeploy|admin|BASE_DT|PORTF_ID|SCNR_ID|_[A-Z]{2,}|<\/?[A-Za-z]/i.test(expr))
    .filter(expr => /^[A-Za-z][A-Za-z0-9_]{0,12}\s*=/.test(expr))
    .filter(expr => /[Σ∑√σρλ∈∙]|\b(max|Cov|NetJTD|HBR|RWNetJTD|PD|LGD|EAD|RWA|VaR|ES|CVA|PFE|RC|EL|DRC|CTP)\b|할인금리|공분산|상관계수|변동성|델타|감마|베가|위험액|트랜치|손실/i.test(expr));
  for (const expr of exprMatches.slice(0, 20)) formulas.push({ expression: expr, source: 'inline mathematical expression' });
  const seen = new Set();
  return formulas.filter(f => {
    const key = f.expression.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
}

function extractGlossary(text, concepts, topics, docId) {
  const sentences = splitSentences(text);
  const candidates = [];
  for (const term of unique([...concepts, ...topics]).slice(0, 30)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sentence = sentences.find(s => new RegExp(escaped, 'i').test(s));
    if (sentence) candidates.push({ term, definition: sentence.slice(0, 300), source_document: docId });
  }
  const explicit = [...text.matchAll(/([A-Za-z][A-Za-z0-9 &/-]{2,60})\s+(?:means|refers to|is defined as)\s+([^.;]{10,240})/gi)]
    .map(m => ({ term: m[1].trim(), definition: m[2].trim(), source_document: docId }));
  return [...candidates, ...explicit].slice(0, 40);
}

function estimateDifficulty(text, concepts, formulas) {
  const score = concepts.length + formulas.length * 2 + (/\bFRTB\b|바젤|Basel|Monte|Greek|민감도|상관계수/i.test(text) ? 5 : 0);
  if (score >= 28) return 'Expert';
  if (score >= 18) return 'Advanced';
  if (score >= 8) return 'Intermediate';
  return 'Introductory';
}

function estimateImportance(meta, topics, regulations, concepts) {
  const text = `${meta.filename} ${meta.relative_path} ${topics.join(' ')} ${regulations.join(' ')} ${concepts.join(' ')}`;
  if (/요건정의|기준서|Basel|바젤|FRTB|NCR|업무요건|산정기준/i.test(text)) return 'Critical';
  if (/설계서|사용자매뉴얼|운영자매뉴얼|Market Risk|Credit Risk|IFRS/i.test(text)) return 'High';
  if (topics.length + concepts.length >= 4) return 'Medium';
  return 'Low';
}

function semanticYaml(doc) {
  let out = '';
  out += `id: ${yamlScalar(doc.id)}\n`;
  out += `source_document: ${yamlScalar(doc.relative_path || doc.filename)}\n`;
  out += `summary: ${yamlScalar(doc.semantic.summary)}\n`;
  out += `topics:\n${yamlList(doc.semantic.topics, 2)}`;
  out += `concepts:\n${yamlList(doc.semantic.concepts, 2)}`;
  out += `formulas:\n${yamlObjectList(doc.semantic.formulas, 2)}`;
  out += `symbols:\n${yamlList(doc.semantic.symbols, 2)}`;
  out += `glossary:\n${yamlObjectList(doc.semantic.glossary, 2)}`;
  out += `abbreviations:\n${yamlList(doc.semantic.abbreviations, 2)}`;
  out += `regulations:\n${yamlList(doc.semantic.regulations, 2)}`;
  out += `organizations:\n${yamlList(doc.semantic.organizations, 2)}`;
  out += `domains:\n${yamlList(doc.semantic.domains, 2)}`;
  out += `difficulty: ${yamlScalar(doc.semantic.difficulty)}\n`;
  out += `importance: ${yamlScalar(doc.semantic.importance)}\n`;
  out += `traceability:\n  metadata: ${yamlScalar(`metadata/${doc.id}.yaml`)}\n  text_index: ${yamlScalar(doc.hasIndex ? `index/${doc.id}.txt` : '')}\n`;
  return out;
}

function metadataSemanticBlock(semantic) {
  let out = 'semantic:\n';
  out += `  summary: ${yamlScalar(semantic.summary)}\n`;
  out += `  topics:\n${yamlList(semantic.topics, 4)}`;
  out += `  concepts:\n${yamlList(semantic.concepts, 4)}`;
  out += `  formulas:\n${yamlObjectList(semantic.formulas, 4)}`;
  out += `  symbols:\n${yamlList(semantic.symbols, 4)}`;
  out += `  glossary:\n${yamlObjectList(semantic.glossary, 4)}`;
  out += `  abbreviations:\n${yamlList(semantic.abbreviations, 4)}`;
  out += `  regulations:\n${yamlList(semantic.regulations, 4)}`;
  out += `  organizations:\n${yamlList(semantic.organizations, 4)}`;
  out += `  domains:\n${yamlList(semantic.domains, 4)}`;
  out += `  difficulty: ${yamlScalar(semantic.difficulty)}\n`;
  out += `  importance: ${yamlScalar(semantic.importance)}\n`;
  return out;
}

function replaceSemanticBlock(original, semantic) {
  const stripped = original.replace(/\r?\nsemantic:\r?\n[\s\S]*$/m, '').trimEnd();
  return `${stripped}\n${metadataSemanticBlock(semantic)}`;
}

const metadataFiles = fs.readdirSync(METADATA_DIR).filter(f => /^KC-\d+\.yaml$/.test(f)).sort();
const docs = [];

for (const file of metadataFiles) {
  const metaPath = path.join(METADATA_DIR, file);
  const rawMeta = fs.readFileSync(metaPath, 'utf8');
  const meta = parseMetadata(rawMeta);
  const id = meta.id || path.basename(file, '.yaml');
  const indexPath = path.join(INDEX_DIR, `${id}.txt`);
  const hasIndex = fs.existsSync(indexPath);
  const indexedText = hasIndex ? fs.readFileSync(indexPath, 'utf8') : '';
  const text = normalizeText(`${meta.filename} ${meta.relative_path} ${meta.estimated_domain.join(' ')} ${indexedText}`);
  const extractionText = hasIndex ? text : normalizeText(`${meta.filename} ${meta.relative_path} ${meta.estimated_domain.filter(d => d !== 'Unknown').join(' ')}`);

  const topics = hasIndex ? matches(TOPIC_PATTERNS, extractionText) : matches(TOPIC_PATTERNS, extractionText).filter(t => !['Credit Risk', 'Market Risk', 'Statistics'].includes(t));
  const concepts = hasIndex ? matches(CONCEPT_PATTERNS, extractionText) : [];
  const regulations = matches(REGULATION_PATTERNS, extractionText);
  const organizations = matches(ORG_PATTERNS, extractionText);
  const domains = unique([
    ...meta.estimated_domain.filter(d => d !== 'Unknown' && d !== 'Internal'),
    ...(hasIndex ? matches(DOMAIN_RULES, extractionText) : []),
  ]);
  const formulas = hasIndex ? extractFormulas(extractionText) : [];
  const abbreviations = hasIndex ? extractAbbreviations(extractionText) : extractAbbreviations(extractionText).filter(a => ABBREVIATIONS.includes(a));
  const symbols = hasIndex ? unique(SYMBOL_PATTERNS.filter(([, re]) => re.test(extractionText)).map(([name]) => name)) : [];
  const summary = summarize(indexedText, meta.filename, hasIndex);
  const glossary = hasIndex ? extractGlossary(indexedText, concepts, topics, id) : [];
  const difficulty = estimateDifficulty(text, concepts, formulas);
  const importance = estimateImportance(meta, topics, regulations, concepts);

  const semantic = {
    summary, topics, concepts, formulas, symbols, glossary, abbreviations, regulations, organizations,
    domains: domains.length ? domains : meta.estimated_domain.filter(d => d !== 'Unknown' && d !== 'Internal'),
    difficulty, importance
  };

  docs.push({ ...meta, id, hasIndex, semantic });
  fs.writeFileSync(path.join(ROOT, 'semantic', `${id}.semantic.yaml`), semanticYaml({ ...meta, id, hasIndex, semantic }), 'utf8');
  fs.writeFileSync(metaPath, replaceSemanticBlock(rawMeta, semantic), 'utf8');
}

function aggregateObjectList(field, keyName, valueName) {
  const map = new Map();
  for (const doc of docs) {
    for (const item of doc.semantic[field]) {
      const key = typeof item === 'string' ? item : item[keyName];
      if (!key) continue;
      if (!map.has(key)) map.set(key, { [keyName]: key, documents: new Set(), values: [] });
      const entry = map.get(key);
      entry.documents.add(doc.id);
      if (typeof item !== 'string' && valueName && item[valueName]) entry.values.push(item[valueName]);
    }
  }
  return [...map.values()].sort((a, b) => a[keyName].localeCompare(b[keyName])).map(e => ({
    [keyName]: e[keyName],
    documents: [...e.documents].sort().join(', '),
    ...(valueName ? { evidence: unique(e.values).slice(0, 5).join(' | ') } : {})
  }));
}

function writeCatalog(file, rootKey, rows, rowWriter) {
  let out = `${rootKey}:\n`;
  if (rows.length === 0) out += '  []\n';
  for (const row of rows) out += rowWriter(row);
  fs.writeFileSync(file, out, 'utf8');
}

writeCatalog(path.join(ROOT, 'concepts', 'MASTER_CONCEPTS.yaml'), 'concepts',
  aggregateObjectList('concepts', 'concept'),
  r => `  - concept: ${yamlScalar(r.concept)}\n    documents: ${yamlScalar(r.documents)}\n`);

writeCatalog(path.join(ROOT, 'abbreviations', 'MASTER_ABBREVIATIONS.yaml'), 'abbreviations',
  aggregateObjectList('abbreviations', 'abbreviation'),
  r => `  - abbreviation: ${yamlScalar(r.abbreviation)}\n    documents: ${yamlScalar(r.documents)}\n`);

writeCatalog(path.join(ROOT, 'regulations', 'MASTER_REGULATIONS.yaml'), 'regulations',
  aggregateObjectList('regulations', 'regulation'),
  r => `  - regulation: ${yamlScalar(r.regulation)}\n    documents: ${yamlScalar(r.documents)}\n`);

writeCatalog(path.join(ROOT, 'formulas', 'MASTER_FORMULA_CATALOG.yaml'), 'formulas',
  aggregateObjectList('formulas', 'expression', 'source'),
  r => `  - expression: ${yamlScalar(r.expression)}\n    documents: ${yamlScalar(r.documents)}\n    extraction_basis: ${yamlScalar(r.evidence)}\n`);

const glossaryRows = [];
for (const doc of docs) for (const item of doc.semantic.glossary) glossaryRows.push(item);
writeCatalog(path.join(ROOT, 'glossary', 'MASTER_GLOSSARY.yaml'), 'glossary', glossaryRows,
  r => `  - term: ${yamlScalar(r.term)}\n    definition: ${yamlScalar(r.definition)}\n    source_document: ${yamlScalar(r.source_document)}\n`);

const totals = {
  documents: docs.length,
  indexed: docs.filter(d => d.hasIndex).length,
  concepts: new Set(docs.flatMap(d => d.semantic.concepts)).size,
  glossary: glossaryRows.length,
  abbreviations: new Set(docs.flatMap(d => d.semantic.abbreviations)).size,
  formulas: new Set(docs.flatMap(d => d.semantic.formulas.map(f => f.expression))).size,
  regulations: new Set(docs.flatMap(d => d.semantic.regulations)).size,
};

const byImportance = {};
const byDifficulty = {};
for (const doc of docs) {
  byImportance[doc.semantic.importance] = (byImportance[doc.semantic.importance] || 0) + 1;
  byDifficulty[doc.semantic.difficulty] = (byDifficulty[doc.semantic.difficulty] || 0) + 1;
}

let report = '# Semantic Knowledge Extraction Summary\n\n';
report += `- Generated: ${new Date().toISOString()}\n`;
report += `- Processed documents: ${totals.documents}\n`;
report += `- Indexed text documents: ${totals.indexed}\n`;
report += `- Inventory-only documents: ${totals.documents - totals.indexed}\n`;
report += `- Unique concepts: ${totals.concepts}\n`;
report += `- Glossary entries: ${totals.glossary}\n`;
report += `- Unique abbreviations: ${totals.abbreviations}\n`;
report += `- Formula candidates: ${totals.formulas}\n`;
report += `- Regulatory references: ${totals.regulations}\n\n`;
report += '## Importance\n\n';
for (const key of ['Critical', 'High', 'Medium', 'Low']) if (byImportance[key]) report += `- ${key}: ${byImportance[key]}\n`;
report += '\n## Difficulty\n\n';
for (const key of ['Expert', 'Advanced', 'Intermediate', 'Introductory']) if (byDifficulty[key]) report += `- ${key}: ${byDifficulty[key]}\n`;
report += '\n## Artifacts\n\n';
for (const line of [
  'semantic/*.semantic.yaml',
  'glossary/MASTER_GLOSSARY.yaml',
  'abbreviations/MASTER_ABBREVIATIONS.yaml',
  'formulas/MASTER_FORMULA_CATALOG.yaml',
  'regulations/MASTER_REGULATIONS.yaml',
  'concepts/MASTER_CONCEPTS.yaml',
]) report += `- ${line}\n`;
report += '\n## Processing Notes\n\n';
report += '- Source documents were not modified.\n';
report += '- Extraction used KC-001 metadata and searchable text indexes only.\n';
report += '- Inventory-only documents received metadata-derived semantic fields and an explicit no-text-index summary.\n';
fs.writeFileSync(path.join(ROOT, 'reports', 'SEMANTIC_SUMMARY.md'), report, 'utf8');

console.log(JSON.stringify(totals, null, 2));
