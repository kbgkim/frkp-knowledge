const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SEMANTIC_DIR = path.join(ROOT, 'semantic');
const GRAPH_DIR = path.join(ROOT, 'graph');
const REPORT_DIR = path.join(ROOT, 'reports');

fs.mkdirSync(GRAPH_DIR, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const TOP_LEVEL_LISTS = new Set(['topics', 'concepts', 'symbols', 'abbreviations', 'regulations', 'organizations', 'domains']);
const OBJECT_LISTS = new Set(['formulas', 'glossary']);
const REGULATION_ORGS = {
  'Basel II': ['BCBS', 'BIS'],
  'Basel III': ['BCBS', 'BIS'],
  FRTB: ['BCBS', 'BIS'],
  'IFRS 9': ['IASB'],
  'Korean Financial Supervisory Regulation': ['FSC', 'FSS'],
  'NCR Regulation': ['FSC', 'FSS'],
};
const ABBR_TO_CONCEPT = {
  ES: 'Expected Shortfall',
  VaR: 'Value at Risk',
  NCR: 'Net Capital Ratio',
  PD: 'Probability of Default',
  LGD: 'Loss Given Default',
  EAD: 'Exposure at Default',
  ECL: 'Expected Credit Loss',
  CVA: 'CVA',
  CCR: 'Counterparty Credit Risk',
  FRTB: 'FRTB',
  API: 'REST API',
  REST: 'REST API',
  CLI: 'Batch Scheduler',
  ETL: 'Data Loader',
  DRC: 'Default Risk Charge',
  RRAO: 'Residual Risk Add-on',
  GIRR: 'Risk Factor',
  CSR: 'Risk Factor',
  FX: 'Market Data',
  OTC: 'OTC Derivatives',
  MTM: 'Pricing',
  'P&L': 'P&L',
};
const DOMAIN_ORDER = [
  ['Regulation', 'FRTB'],
  ['FRTB', 'Market Risk'],
  ['Market Risk', 'Expected Shortfall'],
  ['Market Risk', 'Value at Risk'],
  ['Market Risk', 'Sensitivity'],
  ['Sensitivity', 'Risk Factor'],
  ['Expected Shortfall', 'Liquidity Horizon'],
  ['Expected Shortfall', 'Stress Scenario'],
  ['Value at Risk', 'Parametric VaR'],
  ['Value at Risk', 'Historical Simulation'],
  ['Statistics', 'Volatility'],
  ['Statistics', 'Correlation'],
  ['Credit Risk', 'Probability of Default'],
  ['Credit Risk', 'Loss Given Default'],
  ['Credit Risk', 'Exposure at Default'],
  ['NCR', 'Net Capital Ratio'],
];
const MATH_TERMS = new Set(['Correlation', 'Volatility', 'Parametric VaR', 'Historical Simulation', 'Monte Carlo Simulation', 'Yield Curve', 'Sensitivity']);

function parseScalar(value) {
  if (value == null) return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === '[]') return '';
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch (_) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function parseSemantic(text) {
  const doc = {
    topics: [],
    concepts: [],
    formulas: [],
    symbols: [],
    glossary: [],
    abbreviations: [],
    regulations: [],
    organizations: [],
    domains: [],
  };
  let section = null;
  let currentObject = null;

  function flushObject() {
    if (currentObject && section && OBJECT_LISTS.has(section)) doc[section].push(currentObject);
    currentObject = null;
  }

  for (const line of text.split(/\r?\n/)) {
    const top = line.match(/^([a-z_]+):(?:\s*(.*))?$/);
    if (top) {
      flushObject();
      section = top[1];
      if (!TOP_LEVEL_LISTS.has(section) && !OBJECT_LISTS.has(section) && section !== 'traceability') {
        doc[section] = parseScalar(top[2] || '');
      }
      continue;
    }
    if (!section) continue;

    const listItem = line.match(/^  - (.*)$/);
    if (listItem && TOP_LEVEL_LISTS.has(section)) {
      doc[section].push(parseScalar(listItem[1]));
      continue;
    }
    if (listItem && OBJECT_LISTS.has(section)) {
      flushObject();
      currentObject = {};
      const pair = listItem[1].match(/^([a-z_]+):\s*(.*)$/);
      if (pair) currentObject[pair[1]] = parseScalar(pair[2]);
      continue;
    }
    const objectPair = line.match(/^    ([a-z_]+):\s*(.*)$/);
    if (objectPair && currentObject) currentObject[objectPair[1]] = parseScalar(objectPair[2]);
  }
  flushObject();
  return doc;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function docsFromString(value) {
  return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
}

function yamlScalar(value) {
  if (value == null || value === '') return '""';
  return JSON.stringify(String(value));
}

function yamlValue(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return `\n${value.map(item => `${pad}- ${typeof item === 'object' ? yamlValue(item, indent + 2).trimStart() : yamlScalar(item)}`).join('\n')}`;
  }
  if (value && typeof value === 'object') {
    const lines = [];
    for (const [key, item] of Object.entries(value)) {
      if (Array.isArray(item)) {
        lines.push(`${pad}${key}:${yamlValue(item, indent + 2)}`);
      } else if (item && typeof item === 'object') {
        lines.push(`${pad}${key}:`);
        lines.push(yamlValue(item, indent + 2));
      } else {
        lines.push(`${pad}${key}: ${yamlScalar(item)}`);
      }
    }
    return lines.join('\n');
  }
  return yamlScalar(value);
}

function writeYaml(file, rootKey, rows) {
  let out = `${rootKey}:\n`;
  for (const row of rows) out += `  - ${yamlValue(row, 4).trimStart()}\n`;
  fs.writeFileSync(path.join(ROOT, file), out, 'utf8');
}

function makeId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(6, '0')}`;
}

const semanticFiles = fs.readdirSync(SEMANTIC_DIR).filter(f => /^KC-\d{6}\.semantic\.yaml$/.test(f)).sort();
const docs = semanticFiles.map(file => parseSemantic(fs.readFileSync(path.join(SEMANTIC_DIR, file), 'utf8')));

const docById = new Map(docs.map(doc => [doc.id, doc]));
const regulations = unique(docs.flatMap(doc => doc.regulations));
const domains = unique(docs.flatMap(doc => doc.domains));
const organizations = unique(docs.flatMap(doc => doc.organizations).concat(Object.values(REGULATION_ORGS).flat()));
const topicConcepts = docs.flatMap(doc => doc.topics).filter(topic => !regulations.includes(topic) && !domains.includes(topic));
const concepts = unique(docs.flatMap(doc => doc.concepts).concat(topicConcepts).concat(Object.values(ABBR_TO_CONCEPT)));
const formulas = unique(docs.flatMap(doc => doc.formulas.map(formula => formula.expression)));
const abbreviations = unique(docs.flatMap(doc => doc.abbreviations));
const glossaryTerms = unique(docs.flatMap(doc => doc.glossary.map(entry => entry.term)));
const mathConcepts = unique(docs.flatMap(doc => doc.symbols).concat(concepts.filter(concept => MATH_TERMS.has(concept))));
const frkpCandidates = unique(['RL-120', 'KB-221', 'FC-421', 'MF-461', 'MR-110', 'CR-210', 'RG-310']);

const nodeSpecs = [
  ['Document', 'DOC', docs.map(doc => ({ label: doc.id, source_document: doc.source_document }))],
  ['Concept', 'CON', concepts.map(label => ({ label }))],
  ['Formula', 'FOR', formulas.map(label => ({ label }))],
  ['Glossary Term', 'GLO', glossaryTerms.map(label => ({ label }))],
  ['Abbreviation', 'ABB', abbreviations.map(label => ({ label }))],
  ['Regulation', 'REG', regulations.map(label => ({ label }))],
  ['Organization', 'ORG', organizations.map(label => ({ label }))],
  ['Knowledge Domain', 'DOM', domains.map(label => ({ label }))],
  ['Mathematical Concept', 'MAT', mathConcepts.map(label => ({ label }))],
  ['FRKP Candidate', 'FRK', frkpCandidates.map(label => ({ label }))],
];

const nodes = [];
const ids = new Map();
for (const [type, prefix, specs] of nodeSpecs) {
  specs.forEach((spec, index) => {
    const id = makeId(prefix, index);
    ids.set(`${type}:${spec.label}`, id);
    nodes.push({ id, type, label: spec.label, ...spec });
  });
}

const relationships = [];
const relKeys = new Set();
let relIndex = 0;

function getId(type, label) {
  return ids.get(`${type}:${label}`);
}

function addRel(sourceType, sourceLabel, relationship, targetType, targetLabel, confidence, evidence, sourceDocs) {
  const source = getId(sourceType, sourceLabel);
  const target = getId(targetType, targetLabel);
  if (!source || !target || source === target) return;
  const key = `${source}|${relationship}|${target}|${sourceDocs.join(',')}`;
  if (relKeys.has(key)) return;
  relKeys.add(key);
  relationships.push({
    id: `REL-${String(++relIndex).padStart(6, '0')}`,
    source,
    source_label: sourceLabel,
    relationship,
    target,
    target_label: targetLabel,
    confidence,
    evidence,
    source_documents: sourceDocs,
  });
}

function coEvidence(doc, left, right, field) {
  return `${doc.id} semantic.${field}: "${left}" co-occurs with "${right}"`;
}

for (const doc of docs) {
  addRel('Document', doc.id, 'references', 'Document', doc.id, 'High', `${doc.id} semantic record`, [doc.id]);
  for (const concept of doc.concepts) {
    addRel('Document', doc.id, 'contains', 'Concept', concept, 'High', `${doc.id} semantic.concepts`, [doc.id]);
    addRel('Concept', concept, 'referenced_by', 'Document', doc.id, 'High', `${doc.id} semantic.concepts`, [doc.id]);
  }
  for (const topic of doc.topics) {
    if (getId('Concept', topic)) addRel('Document', doc.id, 'contains', 'Concept', topic, 'Medium', `${doc.id} semantic.topics`, [doc.id]);
  }
  for (const domain of doc.domains) {
    addRel('Document', doc.id, 'belongs_to', 'Knowledge Domain', domain, 'High', `${doc.id} semantic.domains`, [doc.id]);
    for (const concept of doc.concepts) addRel('Concept', concept, 'belongs_to', 'Knowledge Domain', domain, 'Medium', coEvidence(doc, concept, domain, 'concepts/domains'), [doc.id]);
  }
  for (const regulation of doc.regulations) {
    addRel('Document', doc.id, 'references', 'Regulation', regulation, 'High', `${doc.id} semantic.regulations`, [doc.id]);
    for (const concept of doc.concepts) addRel('Concept', concept, 'regulated_by', 'Regulation', regulation, 'Medium', coEvidence(doc, concept, regulation, 'concepts/regulations'), [doc.id]);
  }
  for (const org of doc.organizations) {
    addRel('Document', doc.id, 'references', 'Organization', org, 'High', `${doc.id} semantic.organizations`, [doc.id]);
  }
  for (const formula of doc.formulas) {
    addRel('Document', doc.id, 'contains', 'Formula', formula.expression, 'High', `${doc.id} semantic.formulas: ${formula.source}`, [doc.id]);
    for (const concept of doc.concepts) addRel('Concept', concept, 'implemented_by', 'Formula', formula.expression, formula.source === 'keyword/formula candidate occurrence' ? 'Medium' : 'High', coEvidence(doc, concept, formula.expression, 'concepts/formulas'), [doc.id]);
  }
  for (const entry of doc.glossary) {
    addRel('Glossary Term', entry.term, 'defines', 'Concept', entry.term, getId('Concept', entry.term) ? 'High' : 'Low', `${doc.id} semantic.glossary definition`, [doc.id]);
    if (getId('Concept', entry.term)) addRel('Concept', entry.term, 'defined_by', 'Glossary Term', entry.term, 'High', `${doc.id} semantic.glossary definition`, [doc.id]);
  }
  for (const abbr of doc.abbreviations) {
    const mappedConcept = ABBR_TO_CONCEPT[abbr];
    if (mappedConcept) addRel('Abbreviation', abbr, 'equivalent_to', 'Concept', mappedConcept, doc.concepts.includes(mappedConcept) || doc.topics.includes(mappedConcept) ? 'High' : 'Medium', `${doc.id} semantic.abbreviations with normalized abbreviation map`, [doc.id]);
    for (const formula of doc.formulas.filter(f => f.expression === abbr)) addRel('Abbreviation', abbr, 'equivalent_to', 'Formula', formula.expression, 'High', `${doc.id} semantic.formulas keyword occurrence`, [doc.id]);
  }
  for (const symbol of doc.symbols) {
    for (const formula of doc.formulas) addRel('Formula', formula.expression, 'uses', 'Mathematical Concept', symbol, 'Medium', `${doc.id} semantic.symbols/formulas`, [doc.id]);
  }
}

for (const [regulation, orgs] of Object.entries(REGULATION_ORGS)) {
  for (const org of orgs) addRel('Regulation', regulation, 'regulated_by', 'Organization', org, 'Medium', 'Normalized regulatory organization mapping from semantic regulation references', docs.filter(doc => doc.regulations.includes(regulation)).map(doc => doc.id));
}

for (const [parent, child] of DOMAIN_ORDER) {
  const parentType = getId('Knowledge Domain', parent) ? 'Knowledge Domain' : 'Concept';
  const childType = getId('Knowledge Domain', child) ? 'Knowledge Domain' : 'Concept';
  const evidenceDocs = docs.filter(doc => doc.domains.includes(parent) || doc.concepts.includes(parent) || doc.topics.includes(parent)).filter(doc => doc.domains.includes(child) || doc.concepts.includes(child) || doc.topics.includes(child)).map(doc => doc.id);
  addRel(parentType, parent, 'prerequisite_of', childType, child, evidenceDocs.length > 2 ? 'Medium' : 'Low', 'Normalized domain hierarchy supported by semantic co-occurrence', evidenceDocs);
  addRel(childType, child, 'successor_of', parentType, parent, evidenceDocs.length > 2 ? 'Medium' : 'Low', 'Normalized domain hierarchy supported by semantic co-occurrence', evidenceDocs);
}

for (const [abbr, concept] of Object.entries(ABBR_TO_CONCEPT)) {
  if (getId('Abbreviation', abbr) && getId('Concept', concept)) {
    const evidenceDocs = docs.filter(doc => doc.abbreviations.includes(abbr) && (doc.concepts.includes(concept) || doc.topics.includes(concept))).map(doc => doc.id);
    addRel('Concept', concept, 'defined_by', 'Abbreviation', abbr, evidenceDocs.length ? 'High' : 'Medium', 'Normalized abbreviation-to-concept mapping with semantic abbreviation evidence', evidenceDocs);
  }
}

for (const concept of concepts) {
  const conceptDocs = docs.filter(doc => doc.concepts.includes(concept) || doc.topics.includes(concept)).map(doc => doc.id);
  const candidate = concept.match(/Risk|FRTB|Capital|NCR|Regulation/) ? 'RL-120'
    : concept.match(/VaR|Shortfall|Formula|Sensitivity/) ? 'FC-421'
      : concept.match(/Correlation|Volatility|Simulation|Yield/) ? 'MF-461'
        : 'KB-221';
  addRel('Concept', concept, 'related_to', 'FRKP Candidate', candidate, 'Low', 'Estimated FRKP candidate mapping from normalized concept label and semantic domain evidence', conceptDocs);
}

const degree = new Map(nodes.map(node => [node.id, 0]));
for (const rel of relationships) {
  degree.set(rel.source, (degree.get(rel.source) || 0) + 1);
  degree.set(rel.target, (degree.get(rel.target) || 0) + 1);
}

const relationshipTypeDistribution = relationships.reduce((acc, rel) => {
  acc[rel.relationship] = (acc[rel.relationship] || 0) + 1;
  return acc;
}, {});
const domainDistribution = domains.reduce((acc, domain) => {
  acc[domain] = relationships.filter(rel => rel.target_label === domain || rel.source_label === domain).length;
  return acc;
}, {});
const isolatedNodes = nodes.filter(node => degree.get(node.id) === 0);
const isolatedConcepts = nodes.filter(node => node.type === 'Concept' && degree.get(node.id) === 0);
const orphanFormulas = nodes.filter(node => node.type === 'Formula' && !relationships.some(rel => rel.target === node.id && rel.relationship === 'implemented_by'));

const glossaryByTerm = new Map();
for (const doc of docs) {
  for (const entry of doc.glossary) {
    if (!glossaryByTerm.has(entry.term)) glossaryByTerm.set(entry.term, new Map());
    const defs = glossaryByTerm.get(entry.term);
    defs.set(entry.definition, (defs.get(entry.definition) || []).concat(doc.id));
  }
}
const conflictingGlossaryDefinitions = [...glossaryByTerm.entries()]
  .filter(([, defs]) => defs.size > 1)
  .map(([term, defs]) => ({ term, definition_count: defs.size, source_documents: unique([...defs.values()].flat()) }));

const duplicateConcepts = concepts
  .map(concept => ({ concept, normalized: concept.toLowerCase().replace(/[^a-z0-9가-힣]/g, '') }))
  .filter((item, _, all) => all.filter(other => other.normalized === item.normalized).length > 1);

const conflictingAbbreviations = abbreviations
  .filter(abbr => ABBR_TO_CONCEPT[abbr] && getId('Formula', abbr))
  .map(abbr => ({ abbreviation: abbr, concept: ABBR_TO_CONCEPT[abbr], formula: abbr }));
const disconnectedRegulations = nodes.filter(node => node.type === 'Regulation' && degree.get(node.id) <= 1);
const orphanConcepts = nodes.filter(node => node.type === 'Concept' && !relationships.some(rel => rel.source === node.id && ['implemented_by', 'regulated_by', 'defined_by', 'belongs_to'].includes(rel.relationship)));

writeYaml('graph/nodes.yaml', 'nodes', nodes);
writeYaml('graph/relationships.yaml', 'relationships', relationships);
writeYaml('graph/concept_graph.yaml', 'concept_graph', relationships.filter(rel => rel.source.startsWith('CON-') || rel.target.startsWith('CON-')));
writeYaml('graph/formula_graph.yaml', 'formula_graph', relationships.filter(rel => rel.source.startsWith('FOR-') || rel.target.startsWith('FOR-')));
writeYaml('graph/regulation_graph.yaml', 'regulation_graph', relationships.filter(rel => rel.source.startsWith('REG-') || rel.target.startsWith('REG-')));
writeYaml('graph/domain_graph.yaml', 'domain_graph', relationships.filter(rel => rel.source.startsWith('DOM-') || rel.target.startsWith('DOM-')));
writeYaml('graph/document_graph.yaml', 'document_graph', relationships.filter(rel => rel.source.startsWith('DOC-') || rel.target.startsWith('DOC-')));

const mermaidFormulaPairs = new Set([
  'Value at Risk|VaR',
  'Expected Shortfall|ES',
  'Net Capital Ratio|NCR',
  'Loss Given Default|LGD',
  'Probability of Default|PD',
  'Exposure at Default|EAD',
  'CVA|CVA',
]);
const mermaidConceptLabels = new Set(DOMAIN_ORDER.flat().concat(Object.values(ABBR_TO_CONCEPT)));
const mermaidAbbreviations = new Set(Object.keys(ABBR_TO_CONCEPT));
const mermaidRegConcepts = new Set(['FRTB', 'Expected Shortfall', 'Value at Risk', 'Net Capital Ratio', 'Capital Requirement', 'Default Risk Charge', 'Risk Charge']);
function includeMermaidRelationship(rel) {
  if (rel.relationship === 'prerequisite_of') return true;
  if (rel.relationship === 'regulated_by' && rel.source.startsWith('REG-')) return true;
  if (rel.relationship === 'regulated_by' && mermaidRegConcepts.has(rel.source_label)) return true;
  if (rel.relationship === 'equivalent_to' && mermaidAbbreviations.has(rel.source_label)) return true;
  if (rel.relationship === 'implemented_by' && mermaidFormulaPairs.has(`${rel.source_label}|${rel.target_label}`)) return true;
  if (rel.relationship === 'defines' && mermaidConceptLabels.has(rel.target_label)) return true;
  return false;
}
const mermaidRels = [];
const mermaidKeys = new Set();
for (const rel of relationships) {
  if (!includeMermaidRelationship(rel)) continue;
  const key = `${rel.source}|${rel.relationship}|${rel.target}`;
  if (mermaidKeys.has(key)) continue;
  mermaidKeys.add(key);
  mermaidRels.push(rel);
  if (mermaidRels.length >= 120) break;
}
let mermaid = 'flowchart TD\n';
for (const node of nodes.filter(node => mermaidRels.some(rel => rel.source === node.id || rel.target === node.id))) {
  mermaid += `  ${node.id.replace(/-/g, '_')}["${node.label.replace(/"/g, "'")}<br/>${node.type}"]\n`;
}
for (const rel of mermaidRels) {
  mermaid += `  ${rel.source.replace(/-/g, '_')} -->|${rel.relationship}| ${rel.target.replace(/-/g, '_')}\n`;
}
fs.writeFileSync(path.join(GRAPH_DIR, 'knowledge_graph.mmd'), mermaid, 'utf8');

function countType(type) {
  return nodes.filter(node => node.type === type).length;
}

let summary = '# Knowledge Graph Summary\n\n';
summary += `- Generated: ${new Date().toISOString()}\n`;
summary += `- Total nodes: ${nodes.length}\n`;
summary += `- Total relationships: ${relationships.length}\n`;
summary += `- Concept nodes: ${countType('Concept')}\n`;
summary += `- Formula nodes: ${countType('Formula')}\n`;
summary += `- Regulation nodes: ${countType('Regulation')}\n`;
summary += `- Glossary nodes: ${countType('Glossary Term')}\n`;
summary += `- Document nodes: ${countType('Document')}\n\n`;
summary += '## Construction Notes\n\n';
summary += '- Source documents, KC-001 outputs, and KC-002 outputs were not modified.\n';
summary += '- Graph construction used semantic/*.semantic.yaml as the primary input and normalized relationship evidence back to KC identifiers.\n';
summary += '- FRKP candidate mappings are estimates only; no FRKP documents were generated.\n\n';
summary += '## Validation Summary\n\n';
summary += `- Isolated concepts: ${isolatedConcepts.length}\n`;
summary += `- Orphan formulas: ${orphanFormulas.length}\n`;
summary += `- Duplicate concepts: ${duplicateConcepts.length}\n`;
summary += `- Conflicting abbreviations: ${conflictingAbbreviations.length}\n`;
summary += `- Conflicting glossary definitions: ${conflictingGlossaryDefinitions.length}\n`;
summary += `- Disconnected regulations: ${disconnectedRegulations.length}\n`;
fs.writeFileSync(path.join(REPORT_DIR, 'KNOWLEDGE_GRAPH_SUMMARY.md'), summary, 'utf8');

let stats = '# Graph Statistics\n\n';
stats += `- Node count: ${nodes.length}\n`;
stats += `- Relationship count: ${relationships.length}\n\n`;
stats += '## Node Types\n\n';
for (const type of unique(nodes.map(node => node.type))) stats += `- ${type}: ${countType(type)}\n`;
stats += '\n## Relationship Types\n\n';
for (const [type, count] of Object.entries(relationshipTypeDistribution).sort((a, b) => a[0].localeCompare(b[0]))) stats += `- ${type}: ${count}\n`;
stats += '\n## Domain Distribution\n\n';
for (const [domain, count] of Object.entries(domainDistribution).sort((a, b) => a[0].localeCompare(b[0]))) stats += `- ${domain}: ${count}\n`;
stats += '\n## Isolated Nodes\n\n';
stats += isolatedNodes.length ? isolatedNodes.map(node => `- ${node.id} ${node.type}: ${node.label}\n`).join('') : '- None\n';
stats += '\n## Isolated Concepts\n\n';
stats += isolatedConcepts.length ? isolatedConcepts.map(node => `- ${node.id}: ${node.label}\n`).join('') : '- None\n';
stats += '\n## Orphan Concepts\n\n';
stats += orphanConcepts.length ? orphanConcepts.map(node => `- ${node.id}: ${node.label}\n`).join('') : '- None\n';
stats += '\n## Orphan Formulas\n\n';
stats += orphanFormulas.length ? orphanFormulas.map(node => `- ${node.id}: ${node.label.slice(0, 140)}\n`).join('') : '- None\n';
stats += '\n## Duplicate Concepts\n\n';
stats += duplicateConcepts.length ? duplicateConcepts.map(item => `- ${item.concept}\n`).join('') : '- None\n';
stats += '\n## Conflicting Abbreviations\n\n';
stats += conflictingAbbreviations.length ? conflictingAbbreviations.map(item => `- ${item.abbreviation}: concept=${item.concept}, formula=${item.formula}\n`).join('') : '- None\n';
stats += '\n## Conflicting Glossary Definitions\n\n';
stats += conflictingGlossaryDefinitions.length ? conflictingGlossaryDefinitions.map(item => `- ${item.term}: ${item.definition_count} definitions (${item.source_documents.join(', ')})\n`).join('') : '- None\n';
stats += '\n## Disconnected Regulations\n\n';
stats += disconnectedRegulations.length ? disconnectedRegulations.map(node => `- ${node.id}: ${node.label}\n`).join('') : '- None\n';
fs.writeFileSync(path.join(REPORT_DIR, 'GRAPH_STATISTICS.md'), stats, 'utf8');

console.log(JSON.stringify({
  nodes: nodes.length,
  relationships: relationships.length,
  concepts: countType('Concept'),
  formulas: countType('Formula'),
  regulations: countType('Regulation'),
  glossary: countType('Glossary Term'),
  documents: countType('Document'),
  relationship_types: relationshipTypeDistribution,
  isolated_concepts: isolatedConcepts.length,
  orphan_formulas: orphanFormulas.length,
}, null, 2));



