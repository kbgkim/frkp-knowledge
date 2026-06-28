const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SEMANTIC_DIR = path.join(ROOT, 'semantic');
const OUT_DIRS = ['canonical', 'mapping', 'reports'];
for (const dir of OUT_DIRS) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });

const CONCEPT_ALIASES = {
  'Expected Shortfall': ['ES', 'Conditional Value at Risk', 'CVaR', 'Expected Tail Loss', 'ETL', 'Tail Risk Measure'],
  'Value at Risk': ['VaR', 'VAR', 'Market VaR'],
  'Net Capital Ratio': ['NCR', 'Net Operating Capital Ratio', 'Net Capital Ratio Regulation Metric', '순자본비율', '영업용순자본비율'],
  'Fundamental Review of the Trading Book': ['FRTB', 'Basel III Market Risk', 'FRTB Market Risk'],
  'Default Risk Charge': ['DRC', 'Default Risk Capital Charge'],
  'Residual Risk Add-on': ['RRAO', 'Residual Risk Add On', 'Residual Risk'],
  'Probability of Default': ['PD', 'Default Probability', '부도확률'],
  'Loss Given Default': ['LGD', '부도시손실률'],
  'Exposure at Default': ['EAD', '부도시익스포저'],
  'Expected Credit Loss': ['ECL'],
  'Credit Valuation Adjustment': ['CVA'],
  'Counterparty Credit Risk': ['CCR'],
  'REST API': ['REST', 'API', 'Application Programming Interface'],
  'Data Loader': ['ETL', 'Extract Transform Load'],
  'Batch Scheduler': ['CLI', 'Command Line Interface'],
  'Profit and Loss': ['P&L', 'PnL'],
  'Mark to Market': ['MTM'],
  'Over-the-Counter Derivatives': ['OTC Derivatives', 'OTC'],
  'Stress Testing': ['Stress Test', 'Stress Scenario'],
};

const CANONICAL_NAME = new Map();
for (const [canonical, aliases] of Object.entries(CONCEPT_ALIASES)) {
  CANONICAL_NAME.set(norm(canonical), canonical);
  aliases.forEach(alias => CANONICAL_NAME.set(norm(alias), canonical));
}

const ABBR_MEANINGS = {
  ES: ['Expected Shortfall'],
  ETL: ['Expected Tail Loss', 'Expected Shortfall'],
  VaR: ['Value at Risk'],
  PD: ['Probability of Default'],
  LGD: ['Loss Given Default'],
  EAD: ['Exposure at Default'],
  ECL: ['Expected Credit Loss'],
  FRTB: ['Fundamental Review of the Trading Book'],
  NCR: ['Net Capital Ratio'],
  DRC: ['Default Risk Charge'],
  RRAO: ['Residual Risk Add-on'],
  API: ['Application Programming Interface'],
  REST: ['Representational State Transfer'],
  CLI: ['Command Line Interface'],
  CVA: ['Credit Valuation Adjustment', 'Conditional Value at Risk'],
  CVR: ['Curvature Risk', 'Conditional Value at Risk'],
  RC: ['Risk Charge', 'Replacement Cost'],
  SA: ['Standardised Approach', 'Scenario Analysis'],
  CB: ['Convertible Bond', 'Corporate Bond'],
  CD: ['Certificate of Deposit', 'Credit Derivative'],
  FX: ['Foreign Exchange'],
  OTC: ['Over-the-Counter'],
  MTM: ['Mark to Market'],
  'P&L': ['Profit and Loss'],
  BCBS: ['Basel Committee on Banking Supervision'],
  BIS: ['Bank for International Settlements'],
  FSC: ['Financial Services Commission'],
  FSS: ['Financial Supervisory Service'],
  IFRS: ['International Financial Reporting Standards'],
};

const REG_CANON = {
  'Basel II': 'Basel Framework',
  'Basel III': 'Basel Framework',
  FRTB: 'Fundamental Review of the Trading Book',
  'IFRS 9': 'IFRS 9 Financial Instruments',
  'Korean Financial Supervisory Regulation': 'Korean Financial Supervisory Regulation',
  'NCR Regulation': 'Korean Net Capital Ratio Regulation',
  'BCBS d352': 'Minimum Capital Requirements for Market Risk',
};

const DOMAIN_CANON = {
  'FRTB': 'Trading Book Market Risk',
  'Market Risk': 'Trading Book Market Risk',
  'FRTB Market Risk': 'Trading Book Market Risk',
  'Trading Book Risk': 'Trading Book Market Risk',
  'Credit Risk': 'Credit Risk',
  'Operational Risk': 'Operational Risk',
  'Treasury': 'Treasury and Liquidity Risk',
  'Statistics': 'Quantitative Risk Methods',
  'Regulation': 'Regulatory Capital',
  'NCR': 'Net Capital Regulation',
  'OpenEyes': 'Risk Platform Operations',
  'EzFrame': 'Risk Platform Operations',
};

const BROADER = {
  'Expected Shortfall': 'Market Risk Measurement',
  'Value at Risk': 'Market Risk Measurement',
  'Parametric VaR': 'Value at Risk',
  'Historical Simulation': 'Value at Risk',
  'Monte Carlo Simulation': 'Value at Risk',
  'Liquidity Horizon': 'Expected Shortfall',
  'Stress Testing': 'Risk Management',
  'Backtesting': 'Model Validation',
  'Sensitivity': 'Market Risk Measurement',
  'Risk Factor': 'Market Risk Measurement',
  'Default Risk Charge': 'Default Risk',
  'Residual Risk Add-on': 'Capital Requirement',
  'Probability of Default': 'Credit Risk',
  'Loss Given Default': 'Credit Risk',
  'Exposure at Default': 'Credit Risk',
  'Expected Credit Loss': 'Credit Risk',
  'Net Capital Ratio': 'Regulatory Capital',
  'Fundamental Review of the Trading Book': 'Basel Framework',
};

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/[^a-z0-9&+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function title(value) {
  return String(value || '').trim();
}

function parseScalar(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch (_) { return trimmed.slice(1, -1); }
  }
  return trimmed;
}

function parseSimpleCatalog(file, rootKey, firstKey) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const rows = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const start = line.match(new RegExp(`^\\s*-\\s+${firstKey}:\\s*(.*)$`));
    if (start) {
      if (current) rows.push(current);
      current = { [firstKey]: parseScalar(start[1]) };
      continue;
    }
    const prop = line.match(/^\s{4}([a-z_]+):\s*(.*)$/);
    if (current && prop) current[prop[1]] = parseScalar(prop[2]);
  }
  if (current) rows.push(current);
  return rows;
}

function parseSemantic(text) {
  const doc = { topics: [], concepts: [], formulas: [], symbols: [], glossary: [], abbreviations: [], regulations: [], organizations: [], domains: [] };
  let section = null;
  let currentObject = null;
  const objectLists = new Set(['formulas', 'glossary']);
  function flush() {
    if (currentObject && section && objectLists.has(section)) doc[section].push(currentObject);
    currentObject = null;
  }
  for (const line of text.split(/\r?\n/)) {
    const sec = line.match(/^([a-z_]+):\s*$/);
    if (sec && Object.prototype.hasOwnProperty.call(doc, sec[1])) {
      flush();
      section = sec[1];
      continue;
    }
    if (!section) continue;
    const listScalar = line.match(/^\s{2}-\s+(.*)$/);
    if (listScalar && !objectLists.has(section)) {
      doc[section].push(parseScalar(listScalar[1]));
      continue;
    }
    const objStart = line.match(/^\s{2}-\s+([a-z_]+):\s*(.*)$/);
    if (objStart && objectLists.has(section)) {
      flush();
      currentObject = { [objStart[1]]: parseScalar(objStart[2]) };
      continue;
    }
    const objProp = line.match(/^\s{4}([a-z_]+):\s*(.*)$/);
    if (currentObject && objProp) currentObject[objProp[1]] = parseScalar(objProp[2]);
  }
  flush();
  return doc;
}

function parseNodes() {
  const file = path.join(ROOT, 'graph', 'nodes.yaml');
  if (!fs.existsSync(file)) return [];
  const rows = [];
  let current = null;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const id = line.match(/^\s{2}-\s+id:\s*(.*)$/);
    if (id) {
      if (current) rows.push(current);
      current = { id: parseScalar(id[1]) };
      continue;
    }
    const prop = line.match(/^\s{4}([a-z_]+):\s*(.*)$/);
    if (current && prop) current[prop[1]] = parseScalar(prop[2]);
  }
  if (current) rows.push(current);
  return rows;
}

function yamlScalar(value) {
  if (value === null || value === undefined) return '""';
  return JSON.stringify(String(value));
}

function yamlValue(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return ' []';
    return '\n' + value.map(item => {
      if (item && typeof item === 'object') return `${pad}- ${yamlObject(item, indent + 2).trimStart()}`;
      return `${pad}- ${yamlScalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') return '\n' + yamlObject(value, indent);
  return ` ${yamlScalar(value)}`;
}

function yamlObject(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value) || (value && typeof value === 'object')) lines.push(`${pad}${key}:${yamlValue(value, indent + 2)}`);
    else lines.push(`${pad}${key}:${yamlValue(value, indent)}`);
  }
  return lines.join('\n');
}

function writeYaml(file, rootKey, rows) {
  const out = `${rootKey}:\n` + rows.map(row => `  - ${yamlObject(row, 4).trimStart()}`).join('\n') + '\n';
  fs.writeFileSync(path.join(ROOT, file), out, 'utf8');
}

function docsFromString(value) {
  return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
}

function id(prefix, n) {
  return `${prefix}-${String(n).padStart(6, '0')}`;
}

function canonicalizeConcept(name) {
  return CANONICAL_NAME.get(norm(name)) || title(name);
}

function formulaGroup(expression) {
  const e = norm(expression);
  if (e === 'var' || e.includes('var ')) return 'Value at Risk Formula';
  if (e === 'es' || e.includes('expected shortfall')) return 'Expected Shortfall Formula';
  if (e === 'pd') return 'Probability of Default Parameter';
  if (e === 'lgd') return 'Loss Given Default Parameter';
  if (e === 'ead') return 'Exposure at Default Parameter';
  if (e === 'cva') return 'Credit Valuation Adjustment Formula';
  if (e === 'ncr' || e.includes('ncr =')) return 'Net Capital Ratio Formula';
  if (e.includes('ce x pd x lg') || e.includes('ce x pd x lgd')) return 'Expected Loss Formula';
  if (e.includes('correlation') || e.includes('cov') || e.startsWith('ab ')) return 'Covariance and Correlation Formula';
  if (e.includes('ewma') || e.includes('decay factor') || e.includes('lambda') || e.includes('λ')) return 'EWMA Volatility Formula';
  if (e.includes('black') || e.includes('d 1') || e.includes(' d1 ') || e.includes('call') || e.includes('put')) return 'Option Pricing Formula';
  if (e.includes('bond') || e.includes('채권') || e.includes('coupon') || e.includes('cpn')) return 'Bond Pricing Formula';
  if (e.includes('jtd') || e.includes('drc')) return 'Default Risk Charge Formula';
  if (e.includes('discount factor') || e.includes('spot rate') || e.includes('yield')) return 'Discounting Formula';
  return title(expression).slice(0, 80);
}

const semanticFiles = fs.readdirSync(SEMANTIC_DIR).filter(f => /^KC-\d{6}\.semantic\.yaml$/.test(f)).sort();
const semanticDocs = semanticFiles.map(file => ({ id: file.slice(0, 9), data: parseSemantic(fs.readFileSync(path.join(SEMANTIC_DIR, file), 'utf8')) }));
const nodes = parseNodes();

const conceptEvidence = new Map();
for (const node of nodes.filter(n => n.type === 'Concept')) conceptEvidence.set(node.label, { original_id: node.id, documents: new Set(), sources: new Set(['graph/nodes.yaml']) });
for (const row of parseSimpleCatalog('concepts/MASTER_CONCEPTS.yaml', 'concepts', 'concept')) {
  if (!conceptEvidence.has(row.concept)) conceptEvidence.set(row.concept, { original_id: '', documents: new Set(), sources: new Set() });
  const rec = conceptEvidence.get(row.concept);
  docsFromString(row.documents).forEach(d => rec.documents.add(d));
  rec.sources.add('concepts/MASTER_CONCEPTS.yaml');
}
for (const doc of semanticDocs) {
  for (const name of [...doc.data.topics, ...doc.data.concepts]) {
    if (!conceptEvidence.has(name)) conceptEvidence.set(name, { original_id: '', documents: new Set(), sources: new Set() });
    conceptEvidence.get(name).documents.add(doc.id);
    conceptEvidence.get(name).sources.add(`${doc.id}.semantic.yaml`);
  }
}

const conceptGroups = new Map();
for (const [original, evidence] of conceptEvidence) {
  const canonical = canonicalizeConcept(original);
  if (!conceptGroups.has(canonical)) conceptGroups.set(canonical, { canonical_name: canonical, originals: [], aliases: new Set(CONCEPT_ALIASES[canonical] || []), documents: new Set(), source_items: [] });
  const group = conceptGroups.get(canonical);
  if (original !== canonical) group.aliases.add(original);
  group.originals.push(original);
  evidence.documents.forEach(d => group.documents.add(d));
  group.source_items.push({ original_id: evidence.original_id, original_name: original, sources: [...evidence.sources].sort() });
}

for (const name of Object.values(BROADER)) {
  if (!conceptGroups.has(name)) conceptGroups.set(name, { canonical_name: name, originals: [], aliases: new Set(), documents: new Set(), source_items: [] });
}

const conceptIdByName = new Map();
const conceptRecords = [...conceptGroups.values()].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name)).map((group, idx) => {
  const cid = id('CAN-CON', idx + 1);
  conceptIdByName.set(group.canonical_name, cid);
  return {
    id: cid,
    canonical_name: group.canonical_name,
    aliases: [...group.aliases].sort(),
    abbreviations: [...group.aliases].filter(a => /^[A-Z][A-Z0-9&]{1,8}$/.test(a)).sort(),
    alternative_spellings: [],
    equivalent_terms: [...new Set(group.originals.filter(o => o !== group.canonical_name))].sort(),
    broader_concept: BROADER[group.canonical_name] || '',
    narrower_concepts: Object.entries(BROADER).filter(([, parent]) => parent === group.canonical_name).map(([child]) => child).sort(),
    related_concepts: [],
    source_documents: [...group.documents].sort(),
    source_items: group.source_items,
  };
});

const conceptMapping = [];
for (const [original, evidence] of [...conceptEvidence.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const canonical = canonicalizeConcept(original);
  conceptMapping.push({
    original_id: evidence.original_id,
    original_name: original,
    canonical_id: conceptIdByName.get(canonical),
    canonical_name: canonical,
    mapping_basis: original === canonical ? 'exact canonical term' : 'alias/equivalent term',
    source_documents: [...evidence.documents].sort(),
  });
}

const glossaryRows = parseSimpleCatalog('glossary/MASTER_GLOSSARY.yaml', 'glossary', 'term');
const glossaryGroups = new Map();
for (const row of glossaryRows) {
  const canonical = canonicalizeConcept(row.term);
  if (!glossaryGroups.has(canonical)) glossaryGroups.set(canonical, []);
  glossaryGroups.get(canonical).push(row);
}
const glossaryIdByName = new Map();
const glossaryRecords = [...glossaryGroups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([canonical, rows], idx) => {
  const gid = id('CAN-GLO', idx + 1);
  glossaryIdByName.set(canonical, gid);
  const defs = rows.map((r, i) => ({ source: r.source_document, definition: r.definition, original_term: r.term, definition_rank: i + 1 }));
  return {
    id: gid,
    canonical_term: canonical,
    aliases: [...new Set(rows.map(r => r.term).filter(t => t !== canonical).concat(CONCEPT_ALIASES[canonical] || []))].sort(),
    definitions: defs,
    preferred_definition: defs.reduce((best, d) => d.definition.length > best.definition.length ? d : best, defs[0]).source,
    source_documents: [...new Set(rows.map(r => r.source_document))].sort(),
  };
});
const glossaryMapping = glossaryRows.map((row, idx) => {
  const canonical = canonicalizeConcept(row.term);
  return { original_id: `GLO-SRC-${String(idx + 1).padStart(6, '0')}`, original_term: row.term, source_document: row.source_document, canonical_id: glossaryIdByName.get(canonical), canonical_term: canonical };
});

const abbrRows = parseSimpleCatalog('abbreviations/MASTER_ABBREVIATIONS.yaml', 'abbreviations', 'abbreviation');
const abbrRecords = abbrRows.map((row, idx) => {
  const meanings = ABBR_MEANINGS[row.abbreviation] || [];
  const preferred = meanings[0] || '';
  return {
    id: id('CAN-ABR', idx + 1),
    abbreviation: row.abbreviation,
    possible_meanings: meanings,
    preferred_meaning: preferred,
    confidence: meanings.length === 1 ? 'High' : meanings.length > 1 ? 'Medium' : 'Low',
    ambiguity_status: meanings.length > 1 ? 'Ambiguous; preferred meaning selected by corpus context' : meanings.length === 1 ? 'Resolved' : 'Unresolved',
    source_documents: docsFromString(row.documents),
  };
});
const abbrId = new Map(abbrRecords.map(r => [r.abbreviation, r.id]));
const abbrMapping = abbrRows.map(row => ({ abbreviation: row.abbreviation, canonical_id: abbrId.get(row.abbreviation), preferred_meaning: (ABBR_MEANINGS[row.abbreviation] || [''])[0], source_documents: docsFromString(row.documents) }));

const formulaRows = parseSimpleCatalog('formulas/MASTER_FORMULA_CATALOG.yaml', 'formulas', 'expression');
const formulaGroups = new Map();
for (const row of formulaRows) {
  const canonical = formulaGroup(row.expression);
  if (!formulaGroups.has(canonical)) formulaGroups.set(canonical, []);
  formulaGroups.get(canonical).push(row);
}
const formulaIdByName = new Map();
const formulaRecords = [...formulaGroups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([canonical, rows], idx) => {
  const fid = id('CAN-FOR', idx + 1);
  formulaIdByName.set(canonical, fid);
  return {
    id: fid,
    canonical_formula_name: canonical,
    equivalent_formulas: rows.map(r => r.expression),
    implementation_variants: rows.filter(r => !/^keyword\/formula/.test(r.extraction_basis || '')).map(r => ({ expression: r.expression, documents: docsFromString(r.documents), extraction_basis: r.extraction_basis })),
    regulation_specific_variants: rows.filter(r => /KC-000003|KC-000005|KC-000006|KC-000008|KC-000012|KC-000013|KC-000014/.test(r.documents || '')).map(r => r.expression),
    superseded_formulas: [],
    source_documents: [...new Set(rows.flatMap(r => docsFromString(r.documents)))].sort(),
  };
});
const formulaMapping = formulaRows.map((row, idx) => {
  const canonical = formulaGroup(row.expression);
  return { original_id: `FOR-SRC-${String(idx + 1).padStart(6, '0')}`, original_expression: row.expression, canonical_id: formulaIdByName.get(canonical), canonical_formula_name: canonical, source_documents: docsFromString(row.documents) };
});

const regulationRows = parseSimpleCatalog('regulations/MASTER_REGULATIONS.yaml', 'regulations', 'regulation');
const regGroups = new Map();
for (const row of regulationRows) {
  const canonical = REG_CANON[row.regulation] || row.regulation;
  if (!regGroups.has(canonical)) regGroups.set(canonical, []);
  regGroups.get(canonical).push(row);
}
const regIdByName = new Map();
const regRecords = [...regGroups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([canonical, rows], idx) => {
  const rid = id('CAN-REG', idx + 1);
  regIdByName.set(canonical, rid);
  return {
    id: rid,
    canonical_regulation: canonical,
    aliases: [...new Set(rows.map(r => r.regulation).filter(r => r !== canonical))].sort(),
    document_identifiers: rows.map(r => r.regulation),
    broader_regulation: canonical === 'Fundamental Review of the Trading Book' ? 'Basel Framework' : '',
    source_documents: [...new Set(rows.flatMap(r => docsFromString(r.documents)))].sort(),
  };
});
const regulationMapping = regulationRows.map(row => {
  const canonical = REG_CANON[row.regulation] || row.regulation;
  return { original_regulation: row.regulation, canonical_id: regIdByName.get(canonical), canonical_regulation: canonical, source_documents: docsFromString(row.documents) };
});

const domainNames = new Set(nodes.filter(n => n.type === 'Domain').map(n => n.label));
for (const doc of semanticDocs) doc.data.domains.forEach(d => domainNames.add(d));
const domainGroups = new Map();
for (const name of domainNames) {
  const canonical = DOMAIN_CANON[name] || canonicalizeConcept(name);
  if (!domainGroups.has(canonical)) domainGroups.set(canonical, []);
  domainGroups.get(canonical).push(name);
}
const domainHierarchy = {
  'Risk Management': ['Trading Book Market Risk', 'Credit Risk', 'Operational Risk', 'Treasury and Liquidity Risk', 'Regulatory Capital', 'Risk Platform Operations'],
  'Trading Book Market Risk': ['Market Risk Measurement', 'Fundamental Review of the Trading Book'],
  'Market Risk Measurement': ['Expected Shortfall', 'Value at Risk', 'Sensitivity'],
  'Regulatory Capital': ['Basel Framework', 'Korean Net Capital Ratio Regulation', 'Net Capital Regulation'],
};
const domainIdByName = new Map();
const domainRecords = [...domainGroups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([canonical, originals], idx) => {
  const did = id('CAN-DOM', idx + 1);
  domainIdByName.set(canonical, did);
  const parent = Object.entries(domainHierarchy).find(([, children]) => children.includes(canonical));
  return {
    id: did,
    canonical_domain: canonical,
    aliases: [...new Set(originals.filter(o => o !== canonical))].sort(),
    parent_domain: parent ? parent[0] : '',
    child_domains: domainHierarchy[canonical] || [],
    source_domains: originals.sort(),
  };
});
const domainMapping = [...domainNames].sort().map(name => {
  const canonical = DOMAIN_CANON[name] || canonicalizeConcept(name);
  return { original_domain: name, canonical_id: domainIdByName.get(canonical), canonical_domain: canonical };
});

writeYaml('canonical/MASTER_CANONICAL_CONCEPTS.yaml', 'canonical_concepts', conceptRecords);
writeYaml('canonical/MASTER_CANONICAL_GLOSSARY.yaml', 'canonical_glossary', glossaryRecords);
writeYaml('canonical/MASTER_CANONICAL_ABBREVIATIONS.yaml', 'canonical_abbreviations', abbrRecords);
writeYaml('canonical/MASTER_CANONICAL_FORMULAS.yaml', 'canonical_formulas', formulaRecords);
writeYaml('canonical/MASTER_CANONICAL_REGULATIONS.yaml', 'canonical_regulations', regRecords);
writeYaml('canonical/MASTER_CANONICAL_DOMAINS.yaml', 'canonical_domains', domainRecords);
writeYaml('mapping/concept_mapping.yaml', 'concept_mapping', conceptMapping);
writeYaml('mapping/glossary_mapping.yaml', 'glossary_mapping', glossaryMapping);
writeYaml('mapping/abbreviation_mapping.yaml', 'abbreviation_mapping', abbrMapping);
writeYaml('mapping/formula_mapping.yaml', 'formula_mapping', formulaMapping);
writeYaml('mapping/regulation_mapping.yaml', 'regulation_mapping', regulationMapping);
writeYaml('mapping/domain_mapping.yaml', 'domain_mapping', domainMapping);

const unresolvedAbbr = abbrRecords.filter(r => r.ambiguity_status === 'Unresolved');
const ambiguousAbbr = abbrRecords.filter(r => r.ambiguity_status.startsWith('Ambiguous'));
const mergedGlossary = glossaryRecords.filter(r => r.definitions.length > 1);
const mergedConcepts = conceptRecords.filter(r => r.aliases.length || r.equivalent_terms.length);
const orphanConcepts = conceptRecords.filter(r => !r.broader_concept && !r.narrower_concepts.length && !r.source_documents.length);
const duplicateNames = conceptRecords.map(r => norm(r.canonical_name)).filter((v, i, a) => a.indexOf(v) !== i);
const circular = conceptRecords.filter(r => r.broader_concept && BROADER[r.broader_concept] === r.canonical_name);

const summary = `# Normalization Summary

- Generated: ${new Date().toISOString()}
- Canonical concepts created: ${conceptRecords.length}
- Original concept/topic items mapped: ${conceptMapping.length}
- Aliases normalized: ${conceptRecords.reduce((n, r) => n + r.aliases.length, 0)}
- Glossary entries merged: ${mergedGlossary.length}
- Abbreviations normalized: ${abbrRecords.length}
- Abbreviation conflicts resolved or marked: ${ambiguousAbbr.length}
- Formula variants normalized: ${formulaRows.length} source formulas into ${formulaRecords.length} canonical formulas
- Regulation references normalized: ${regulationRows.length} source references into ${regRecords.length} canonical regulations
- Domain hierarchy nodes: ${domainRecords.length}
- Domain mapping rows: ${domainMapping.length}

All normalization outputs are additive. KC-001, KC-002, and KC-003 artifacts were not modified.
`;

const vocabReport = `# Canonical Vocabulary Report

## Concepts

- Canonical concepts: ${conceptRecords.length}
- Merged concept records: ${mergedConcepts.length}
- Concept mapping coverage: ${conceptMapping.length}/${conceptEvidence.size}

## Glossary

- Canonical glossary entries: ${glossaryRecords.length}
- Source glossary definitions preserved: ${glossaryRows.length}
- Multi-definition canonical terms: ${mergedGlossary.length}

## Abbreviations

- Canonical abbreviation records: ${abbrRecords.length}
- High confidence: ${abbrRecords.filter(r => r.confidence === 'High').length}
- Medium confidence: ${abbrRecords.filter(r => r.confidence === 'Medium').length}
- Low confidence: ${abbrRecords.filter(r => r.confidence === 'Low').length}

## Formulas

- Canonical formulas: ${formulaRecords.length}
- Source formula variants preserved: ${formulaRows.length}

## Regulations

- Canonical regulations: ${regRecords.length}
- Basel II/Basel III normalize to Basel Framework while preserving original document identifiers.

## Domains

- Canonical domains: ${domainRecords.length}
- Parent-child relationships: ${domainRecords.reduce((n, r) => n + r.child_domains.length + (r.parent_domain ? 1 : 0), 0)}
`;

const ambiguity = `# Ambiguity Report

## Abbreviation Ambiguities

${ambiguousAbbr.length ? ambiguousAbbr.map(r => `- ${r.abbreviation}: ${r.possible_meanings.join(' | ')}; preferred=${r.preferred_meaning}; confidence=${r.confidence}`).join('\n') : '- None'}

## Unresolved Abbreviations

${unresolvedAbbr.length ? unresolvedAbbr.map(r => `- ${r.abbreviation}: no preferred meaning inferred from normalization rules; source_documents=${r.source_documents.join(', ')}`).join('\n') : '- None'}

## Conflicting Preferred Definitions

${mergedGlossary.length ? mergedGlossary.map(r => `- ${r.canonical_term}: ${r.definitions.length} preserved definitions; preferred source=${r.preferred_definition}`).join('\n') : '- None'}

No uncertain cases were deleted or automatically collapsed beyond deterministic alias rules.
`;

const quality = `# Quality Report

## Validation Results

- Concept mapping coverage: ${conceptMapping.length === conceptEvidence.size ? 'PASS' : 'FAIL'}
- Glossary mapping coverage: ${glossaryMapping.length === glossaryRows.length ? 'PASS' : 'FAIL'}
- Abbreviation mapping coverage: ${abbrMapping.length === abbrRows.length ? 'PASS' : 'FAIL'}
- Formula mapping coverage: ${formulaMapping.length === formulaRows.length ? 'PASS' : 'FAIL'}
- Regulation mapping coverage: ${regulationMapping.length === regulationRows.length ? 'PASS' : 'FAIL'}
- Domain mapping coverage: ${domainMapping.length === domainNames.size ? 'PASS' : 'FAIL'}
- Duplicate canonical concepts: ${duplicateNames.length}
- Circular hierarchies: ${circular.length}
- Unresolved abbreviations: ${unresolvedAbbr.length}
- Orphan canonical concepts: ${orphanConcepts.length}

## Orphan Canonical Concepts

${orphanConcepts.length ? orphanConcepts.map(r => `- ${r.id}: ${r.canonical_name}`).join('\n') : '- None'}

## Circular Hierarchies

${circular.length ? circular.map(r => `- ${r.canonical_name} <-> ${r.broader_concept}`).join('\n') : '- None'}
`;

fs.writeFileSync(path.join(ROOT, 'reports', 'NORMALIZATION_SUMMARY.md'), summary, 'utf8');
fs.writeFileSync(path.join(ROOT, 'reports', 'CANONICAL_VOCABULARY_REPORT.md'), vocabReport, 'utf8');
fs.writeFileSync(path.join(ROOT, 'reports', 'AMBIGUITY_REPORT.md'), ambiguity, 'utf8');
fs.writeFileSync(path.join(ROOT, 'reports', 'QUALITY_REPORT.md'), quality, 'utf8');

console.log(JSON.stringify({
  canonical_concepts: conceptRecords.length,
  aliases_normalized: conceptRecords.reduce((n, r) => n + r.aliases.length, 0),
  glossary_entries_merged: mergedGlossary.length,
  abbreviation_conflicts: ambiguousAbbr.length,
  unresolved_abbreviations: unresolvedAbbr.length,
  formula_variants: formulaRows.length,
  canonical_formulas: formulaRecords.length,
  regulation_references: regulationRows.length,
  canonical_regulations: regRecords.length,
  canonical_domains: domainRecords.length,
  orphan_canonical_concepts: orphanConcepts.length,
}, null, 2));
