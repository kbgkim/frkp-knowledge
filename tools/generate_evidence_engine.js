const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIRS = ['evidence', 'retrieval', 'explainability', 'validation', 'reports'];
for (const dir of OUT_DIRS) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });

function parseScalar(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === '[]') return '';
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch (_) { return trimmed.slice(1, -1); }
  }
  return trimmed;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function readTopList(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const rows = [];
  let current = null;
  let currentKey = '';
  for (const line of text.split(/\r?\n/)) {
    const start = line.match(/^\s{2}-\s+([a-z_]+):\s*(.*)$/);
    if (start) {
      if (current) rows.push(current);
      current = { [start[1]]: parseScalar(start[2]) };
      currentKey = start[1];
      continue;
    }
    const prop = line.match(/^\s{4}([a-z_]+):\s*(.*)$/);
    if (current && prop) {
      const value = parseScalar(prop[2]);
      current[prop[1]] = prop[2].trim() === '[]' || value === '' && prop[2].trim() === '' ? [] : value;
      currentKey = prop[1];
      continue;
    }
    const list = line.match(/^\s{6}-\s+(.*)$/);
    if (current && currentKey && list && Array.isArray(current[currentKey])) {
      const value = parseScalar(list[1].replace(/^([a-z_]+):\s*/, ''));
      if (value) current[currentKey].push(value);
    }
  }
  if (current) rows.push(current);
  return rows;
}

function parseSemantic(text) {
  const doc = { topics: [], concepts: [], formulas: [], symbols: [], glossary: [], abbreviations: [], regulations: [], organizations: [], domains: [] };
  let section = null;
  let currentObject = null;
  const scalarLists = new Set(['topics', 'concepts', 'symbols', 'abbreviations', 'regulations', 'organizations', 'domains']);
  const objectLists = new Set(['formulas', 'glossary']);
  function flush() {
    if (currentObject && section && objectLists.has(section)) doc[section].push(currentObject);
    currentObject = null;
  }
  for (const line of text.split(/\r?\n/)) {
    const sec = line.match(/^([a-z_]+):(?:\s*(.*))?$/);
    if (sec) {
      flush();
      section = sec[1];
      if (!Object.prototype.hasOwnProperty.call(doc, section)) doc[section] = parseScalar(sec[2] || '');
      continue;
    }
    if (!section) continue;
    const scalar = line.match(/^\s{2}-\s+(.*)$/);
    if (scalar && scalarLists.has(section)) {
      doc[section].push(parseScalar(scalar[1]));
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

function parseRelationships() {
  const rows = readTopList('graph/relationships.yaml');
  return rows.map(row => ({
    id: row.id,
    source: row.source,
    source_label: row.source_label,
    relationship: row.relationship,
    target: row.target,
    target_label: row.target_label,
    confidence: row.confidence,
    evidence: row.evidence,
    source_documents: Array.isArray(row.source_documents) ? row.source_documents : [],
  }));
}

function yamlScalar(value) {
  if (value === null || value === undefined) return '""';
  return JSON.stringify(String(value));
}

function yamlBlock(value, indent = 0) {
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
  return Object.entries(obj).map(([key, value]) => {
    if (Array.isArray(value) || (value && typeof value === 'object')) return `${pad}${key}:${yamlBlock(value, indent + 2)}`;
    return `${pad}${key}:${yamlBlock(value, indent)}`;
  }).join('\n');
}

function writeYaml(file, rootKey, value) {
  const full = path.join(ROOT, file);
  let out;
  if (Array.isArray(value)) out = `${rootKey}:\n` + value.map(row => `  - ${yamlObject(row, 4).trimStart()}`).join('\n') + '\n';
  else out = `${rootKey}:\n${yamlObject(value, 2)}\n`;
  fs.writeFileSync(full, out, 'utf8');
}

function docSort(a, b) {
  return String(a).localeCompare(String(b));
}

function evidenceTypeFor(docFacts, sourceDocumentPath) {
  if (docFacts.regulations.length) return 'Regulation';
  if (docFacts.formulas.length) return 'Formula';
  if (docFacts.glossary.length) return 'Definition';
  if (/manual|guide|사용자|운영자|설치|배포/i.test(sourceDocumentPath || '')) return 'Implementation';
  if (/FRTB|NCR|Market|OpenEyes|EzFrame/i.test(sourceDocumentPath || '')) return 'Internal Document';
  return 'Cross Reference';
}

function conceptMatch(docFacts, concept) {
  return docFacts.concepts.includes(concept.canonical_name)
    || docFacts.topics.includes(concept.canonical_name)
    || concept.aliases.some(alias => docFacts.concepts.includes(alias) || docFacts.topics.includes(alias) || docFacts.abbreviations.includes(alias))
    || concept.abbreviations.some(abbr => docFacts.abbreviations.includes(abbr));
}

function confidenceFor(direct, docFacts, concept) {
  if (direct && (docFacts.concepts.includes(concept.canonical_name) || docFacts.glossary.some(g => g.term === concept.canonical_name))) return 'High';
  if (direct) return 'Medium';
  return 'Low';
}

function formulaSupports(concept, formulas) {
  const names = [concept.canonical_name, ...concept.aliases, ...concept.abbreviations].map(v => String(v).toLowerCase());
  return formulas.filter(formula => {
    const name = String(formula.canonical_formula_name || '').toLowerCase();
    const equivalents = Array.isArray(formula.equivalent_formulas) ? formula.equivalent_formulas.join(' ').toLowerCase() : '';
    return names.some(n => n && (name.includes(n) || equivalents.includes(n)));
  });
}

function indexEntryKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, ' ').trim();
}

const concepts = readTopList('canonical/MASTER_CANONICAL_CONCEPTS.yaml');
const formulas = readTopList('canonical/MASTER_CANONICAL_FORMULAS.yaml');
const regulations = readTopList('canonical/MASTER_CANONICAL_REGULATIONS.yaml');
const glossary = readTopList('canonical/MASTER_CANONICAL_GLOSSARY.yaml');
const domains = readTopList('canonical/MASTER_CANONICAL_DOMAINS.yaml');
const abbreviations = readTopList('canonical/MASTER_CANONICAL_ABBREVIATIONS.yaml');
const nodes = readTopList('graph/nodes.yaml');
const relationships = parseRelationships();

const docsById = new Map(nodes.filter(n => n.type === 'Document').map(n => [n.label, n]));
const semanticFiles = fs.readdirSync(path.join(ROOT, 'semantic'))
  .filter(file => /^KC-\d{6}\.semantic\.yaml$/.test(file))
  .sort();
const semanticByDoc = new Map(semanticFiles.map(file => [file.slice(0, 9), parseSemantic(fs.readFileSync(path.join(ROOT, 'semantic', file), 'utf8'))]));

const conceptByName = new Map(concepts.map(c => [c.canonical_name, c]));
const conceptByAnyTerm = new Map();
for (const concept of concepts) {
  concept.aliases = Array.isArray(concept.aliases) ? concept.aliases : [];
  concept.abbreviations = Array.isArray(concept.abbreviations) ? concept.abbreviations : [];
  concept.narrower_concepts = Array.isArray(concept.narrower_concepts) ? concept.narrower_concepts : [];
  concept.related_concepts = Array.isArray(concept.related_concepts) ? concept.related_concepts : [];
  concept.source_documents = Array.isArray(concept.source_documents) ? concept.source_documents : [];
  for (const term of unique([concept.canonical_name, ...concept.aliases, ...concept.abbreviations])) conceptByAnyTerm.set(indexEntryKey(term), concept);
}

const evidenceRecords = [];
const evidenceByConcept = new Map();
const retrievalPaths = new Map();
let evidenceSeq = 1;

function addEvidence(concept, docId, relationEvidence, direct) {
  if (!docId) return;
  const docFacts = semanticByDoc.get(docId) || { concepts: [], topics: [], formulas: [], glossary: [], regulations: [], domains: [], symbols: [], abbreviations: [] };
  const sourcePath = docsById.get(docId)?.source_document || '';
  const supportingFormulas = unique([
    ...formulaSupports(concept, formulas).filter(f => (f.source_documents || []).includes(docId)).map(f => f.id),
    ...docFacts.formulas.filter(f => [concept.canonical_name, ...concept.aliases, ...concept.abbreviations].some(t => String(f.expression || '').toLowerCase().includes(String(t).toLowerCase()))).map(f => f.expression),
  ]).slice(0, 12);
  const supportingRegulations = unique(regulations.filter(reg => {
    const names = [reg.canonical_regulation, ...(Array.isArray(reg.aliases) ? reg.aliases : []), ...(Array.isArray(reg.document_identifiers) ? reg.document_identifiers : [])];
    return (reg.source_documents || []).includes(docId) && names.some(name => docFacts.regulations.includes(name));
  }).map(reg => reg.id));
  const supportingGlossary = unique(glossary.filter(g => (g.source_documents || []).includes(docId) && [concept.canonical_name, ...concept.aliases].includes(g.canonical_term)).map(g => g.id));
  const supportingMath = unique(docFacts.symbols.filter(symbol => [concept.canonical_name, ...concept.aliases, ...concept.abbreviations].some(t => String(symbol).toLowerCase() === String(t).toLowerCase())));
  const confidence = confidenceFor(direct, docFacts, concept);
  const record = {
    evidence_id: `EVD-${String(evidenceSeq++).padStart(6, '0')}`,
    canonical_concept: concept.id,
    canonical_concept_name: concept.canonical_name,
    source_document: docId,
    source_document_path: sourcePath,
    section_or_location: direct ? `${docId}.semantic.yaml` : relationEvidence,
    supporting_formulas: supportingFormulas,
    supporting_regulations: supportingRegulations,
    supporting_glossary_terms: supportingGlossary,
    supporting_mathematical_concepts: supportingMath,
    confidence,
    evidence_type: direct ? evidenceTypeFor(docFacts, sourcePath) : 'Cross Reference',
    traceability: {
      semantic_artifact: semanticByDoc.has(docId) ? `semantic/${docId}.semantic.yaml` : '',
      graph_evidence: relationEvidence || '',
      source_preserved: 'true',
    },
  };
  evidenceRecords.push(record);
  if (!evidenceByConcept.has(concept.id)) evidenceByConcept.set(concept.id, []);
  evidenceByConcept.get(concept.id).push(record);
}

for (const concept of concepts) {
  const directDocs = unique(concept.source_documents);
  for (const docId of directDocs) {
    const docFacts = semanticByDoc.get(docId) || {};
    addEvidence(concept, docId, conceptMatch(docFacts, concept) ? `${docId} semantic concept/topic/glossary evidence` : `${docId} canonical source document evidence`, true);
  }
  if (!directDocs.length) {
    const relatedNames = unique([concept.broader_concept, ...concept.narrower_concepts, ...concept.related_concepts]);
    const inheritedDocs = unique(relatedNames.flatMap(name => conceptByName.get(name)?.source_documents || [])).slice(0, 8);
    for (const docId of inheritedDocs) addEvidence(concept, docId, `canonical cross-reference via ${relatedNames.join(', ')}`, false);
  }
}

for (const concept of concepts) {
  const records = evidenceByConcept.get(concept.id) || [];
  const relationshipSteps = relationships
    .filter(rel => rel.source_label === concept.canonical_name || rel.target_label === concept.canonical_name)
    .slice(0, 8)
    .map(rel => `${rel.source_label} --${rel.relationship}--> ${rel.target_label}`);
  const formulaSteps = unique(records.flatMap(r => r.supporting_formulas)).slice(0, 5);
  const regulationSteps = unique(records.flatMap(r => r.supporting_regulations)).slice(0, 5);
  const docSteps = unique(records.map(r => r.source_document)).slice(0, 12);
  const pathSteps = [
    concept.canonical_name,
    `Canonical Concept ${concept.id}`,
    ...formulaSteps.map(f => `Formula ${f}`),
    ...regulationSteps.map(r => `Regulation ${r}`),
    ...docSteps.map(d => `Supporting Document ${d}`),
    ...relationshipSteps,
  ];
  retrievalPaths.set(concept.id, pathSteps.length > 2 ? pathSteps : [concept.canonical_name, `Canonical Concept ${concept.id}`, 'No terminating source evidence']);
}

const masterEvidence = concepts.map(concept => {
  const records = evidenceByConcept.get(concept.id) || [];
  const confidenceCounts = records.reduce((acc, r) => {
    acc[r.confidence] = (acc[r.confidence] || 0) + 1;
    return acc;
  }, {});
  return {
    canonical_concept: concept.id,
    canonical_concept_name: concept.canonical_name,
    evidence_records: records.map(r => r.evidence_id),
    source_documents: unique(records.map(r => r.source_document)),
    confidence_summary: confidenceCounts,
    retrieval_path: retrievalPaths.get(concept.id),
    explainability: {
      why_returned: `Matched canonical concept ${concept.canonical_name} or one of its aliases/abbreviations.`,
      supporting_evidence: records.map(r => r.evidence_id),
      documents_contributed: unique(records.map(r => r.source_document)),
      relationship_path_followed: retrievalPaths.get(concept.id),
    },
  };
});

writeYaml('evidence/MASTER_EVIDENCE_INDEX.yaml', 'master_evidence_index', {
  generated_from: ['canonical/MASTER_CANONICAL_CONCEPTS.yaml', 'semantic/*.semantic.yaml', 'graph/relationships.yaml'],
  evidence_model_version: 'KC-005',
  evidence_types: ['Regulation', 'Formula', 'Definition', 'Example', 'Architecture', 'Mathematical Foundation', 'Internal Document', 'Research', 'Implementation', 'Cross Reference'],
  concepts: masterEvidence,
});

for (const concept of concepts) {
  const records = evidenceByConcept.get(concept.id) || [];
  const confidenceScore = records.some(r => r.confidence === 'High') ? 'High' : records.some(r => r.confidence === 'Medium') ? 'Medium' : records.length ? 'Low' : 'Unsupported';
  writeYaml(`evidence/${concept.id}.yaml`, 'evidence_bundle', {
    canonical_concept: concept.id,
    canonical_concept_name: concept.canonical_name,
    concept_summary: `Evidence bundle for ${concept.canonical_name}; generated only from canonical, semantic, and graph corpus artifacts.`,
    evidence_records: records,
    related_concepts: unique([concept.broader_concept, ...concept.narrower_concepts, ...concept.related_concepts]),
    related_formulas: unique(records.flatMap(r => r.supporting_formulas)),
    related_regulations: unique(records.flatMap(r => r.supporting_regulations)),
    related_documents: unique(records.map(r => r.source_document)),
    related_glossary: unique(records.flatMap(r => r.supporting_glossary_terms)),
    relationship_path: retrievalPaths.get(concept.id),
    confidence_score: confidenceScore,
  });
}

function conceptLookupPayload(concept) {
  const records = evidenceByConcept.get(concept.id) || [];
  return {
    canonical_concept: concept.id,
    canonical_name: concept.canonical_name,
    aliases: concept.aliases,
    abbreviations: concept.abbreviations,
    evidence_records: records.map(r => r.evidence_id),
    source_documents: unique(records.map(r => r.source_document)),
    retrieval_path: retrievalPaths.get(concept.id),
    explainability: {
      why_returned: `Lookup term resolves to ${concept.canonical_name}.`,
      canonical_concept_matched: concept.id,
      evidence_supporting_result: records.map(r => r.evidence_id),
      relationship_path_followed: retrievalPaths.get(concept.id),
    },
  };
}

const conceptIndex = [];
for (const concept of concepts) {
  for (const term of unique([concept.canonical_name, ...concept.aliases, ...concept.abbreviations])) {
    conceptIndex.push({ lookup_key: indexEntryKey(term), lookup_term: term, match_type: term === concept.canonical_name ? 'canonical concept' : 'alias/abbreviation', ...conceptLookupPayload(concept) });
  }
}

const formulaIndex = formulas.map(formula => {
  const relatedConcepts = concepts.filter(concept => formulaSupports(concept, [formula]).length);
  return {
    formula_id: formula.id,
    formula_name: formula.canonical_formula_name,
    lookup_terms: unique([formula.canonical_formula_name, ...(Array.isArray(formula.equivalent_formulas) ? formula.equivalent_formulas : [])]).slice(0, 20),
    related_concepts: relatedConcepts.map(c => c.id),
    source_documents: formula.source_documents || [],
    evidence_records: unique(relatedConcepts.flatMap(c => (evidenceByConcept.get(c.id) || []).filter(r => r.supporting_formulas.includes(formula.id)).map(r => r.evidence_id))),
  };
});

const regulationIndex = regulations.map(reg => {
  const names = unique([reg.canonical_regulation, ...(reg.aliases || []), ...(reg.document_identifiers || [])]);
  const relatedConcepts = concepts.filter(concept => (evidenceByConcept.get(concept.id) || []).some(r => r.supporting_regulations.includes(reg.id)));
  return {
    regulation_id: reg.id,
    regulation_name: reg.canonical_regulation,
    lookup_terms: names,
    source_documents: reg.source_documents || [],
    related_concepts: relatedConcepts.map(c => c.id),
    evidence_records: unique(relatedConcepts.flatMap(c => (evidenceByConcept.get(c.id) || []).filter(r => r.supporting_regulations.includes(reg.id)).map(r => r.evidence_id))),
  };
});

const documentIndex = unique(evidenceRecords.map(r => r.source_document)).map(docId => {
  const records = evidenceRecords.filter(r => r.source_document === docId);
  return {
    document_id: docId,
    source_document_path: docsById.get(docId)?.source_document || '',
    concepts_supported: unique(records.map(r => r.canonical_concept)),
    evidence_records: records.map(r => r.evidence_id),
    evidence_types: unique(records.map(r => r.evidence_type)),
  };
});

const domainIndex = domains.map(domain => {
  const terms = unique([domain.canonical_domain, ...(domain.aliases || []), ...(domain.source_domains || [])]);
  const relatedConcepts = concepts.filter(concept => (evidenceByConcept.get(concept.id) || []).some(r => {
    const docFacts = semanticByDoc.get(r.source_document);
    return docFacts && docFacts.domains.some(d => terms.includes(d));
  }));
  return {
    domain_id: domain.id,
    domain_name: domain.canonical_domain,
    lookup_terms: terms,
    related_concepts: relatedConcepts.map(c => c.id),
    evidence_records: unique(relatedConcepts.flatMap(c => (evidenceByConcept.get(c.id) || []).map(r => r.evidence_id))),
  };
});

const glossaryIndex = glossary.map(entry => {
  const terms = unique([entry.canonical_term, ...(entry.aliases || [])]);
  const concept = conceptByAnyTerm.get(indexEntryKey(entry.canonical_term));
  return {
    glossary_id: entry.id,
    glossary_term: entry.canonical_term,
    lookup_terms: terms,
    related_concept: concept ? concept.id : '',
    source_documents: entry.source_documents || [],
    evidence_records: concept ? (evidenceByConcept.get(concept.id) || []).filter(r => r.supporting_glossary_terms.includes(entry.id)).map(r => r.evidence_id) : [],
  };
});

writeYaml('retrieval/concept_index.yaml', 'concept_index', conceptIndex);
writeYaml('retrieval/formula_index.yaml', 'formula_index', formulaIndex);
writeYaml('retrieval/regulation_index.yaml', 'regulation_index', regulationIndex);
writeYaml('retrieval/document_index.yaml', 'document_index', documentIndex);
writeYaml('retrieval/domain_index.yaml', 'domain_index', domainIndex);
writeYaml('retrieval/glossary_index.yaml', 'glossary_index', glossaryIndex);

writeYaml('explainability/EXPLAINABILITY_MODEL.yaml', 'explainability_model', {
  retrieval_principle: 'Evidence-first retrieval. A result is returnable only when linked to at least one evidence record with a source document.',
  required_answer_fields: ['why_returned', 'evidence_supporting_result', 'documents_contributed', 'canonical_concept_matched', 'relationship_path_followed'],
  confidence_policy: {
    High: 'Direct semantic concept or glossary evidence in a source document.',
    Medium: 'Direct canonical source document evidence or semantic alias/topic evidence.',
    Low: 'Cross-reference evidence from a supported broader/narrower/related concept only.',
  },
  unsupported_policy: 'Do not return unsupported concepts as factual answers; surface them only as unsupported validation findings.',
  traceability_fields: ['evidence_id', 'canonical_concept', 'source_document', 'source_document_path', 'section_or_location', 'semantic_artifact', 'graph_evidence'],
});

const validationQueries = ['Expected Shortfall', 'Liquidity Horizon', 'Probability of Default', 'Operational Risk', 'CVA', 'SA-CCR', 'RWA'];
const aliases = new Map([
  ['cva', 'Credit Valuation Adjustment'],
  ['rwa', 'Risk Weighted Assets'],
  ['sa ccr', 'Counterparty Credit Risk'],
  ['sa-ccr', 'Counterparty Credit Risk'],
]);
function resolveQuery(query) {
  const key = indexEntryKey(query);
  return conceptByAnyTerm.get(key) || conceptByAnyTerm.get(indexEntryKey(aliases.get(key)));
}

let queryMd = '# Query Validation\n\n';
queryMd += `Generated: ${new Date().toISOString()}\n\n`;
for (const query of validationQueries) {
  const concept = resolveQuery(query);
  queryMd += `## ${query}\n\n`;
  if (!concept) {
    queryMd += '- Result: FAIL\n- Reason: no canonical concept or alias matched.\n\n';
    continue;
  }
  const records = evidenceByConcept.get(concept.id) || [];
  queryMd += `- Result: ${records.length ? 'PASS' : 'FAIL'}\n`;
  queryMd += `- Canonical Concept: ${concept.id} ${concept.canonical_name}\n`;
  queryMd += `- Evidence Records: ${records.map(r => r.evidence_id).join(', ') || 'None'}\n`;
  queryMd += `- Source Documents: ${unique(records.map(r => r.source_document)).join(', ') || 'None'}\n`;
  queryMd += '- Expected Retrieval Path:\n';
  for (const step of retrievalPaths.get(concept.id) || []) queryMd += `  - ${step}\n`;
  queryMd += '\n';
}
fs.writeFileSync(path.join(ROOT, 'validation', 'QUERY_VALIDATION.md'), queryMd, 'utf8');

const conceptsWithoutEvidence = concepts.filter(c => !(evidenceByConcept.get(c.id) || []).length);
const evidenceWithoutSource = evidenceRecords.filter(r => !r.source_document);
const terminatedPaths = concepts.filter(c => (retrievalPaths.get(c.id) || []).some(step => String(step).startsWith('Supporting Document '))).length;
const explainablePaths = concepts.filter(c => (evidenceByConcept.get(c.id) || []).length && (retrievalPaths.get(c.id) || []).length > 2).length;
const duplicateEvidenceKeys = evidenceRecords.map(r => `${r.canonical_concept}|${r.source_document}|${r.evidence_type}`);
const duplicateEvidence = duplicateEvidenceKeys.filter((key, index, all) => all.indexOf(key) !== index);
const orphanEvidence = evidenceRecords.filter(r => !conceptByName.has(r.canonical_concept_name));
const unsupportedConcepts = conceptsWithoutEvidence;

const summaryMd = `# Evidence Engine Summary

- Generated: ${new Date().toISOString()}
- Evidence bundles created: ${concepts.length}
- Evidence records created: ${evidenceRecords.length}
- Retrieval indexes created: 6
- Explainability model: explainability/EXPLAINABILITY_MODEL.yaml
- Query validation: validation/QUERY_VALIDATION.md

## Validation

- Every canonical concept has evidence: ${conceptsWithoutEvidence.length === 0 ? 'PASS' : 'FAIL'}
- Every evidence record has at least one source: ${evidenceWithoutSource.length === 0 ? 'PASS' : 'FAIL'}
- Retrieval paths terminate in source documents: ${terminatedPaths}/${concepts.length}
- Retrieval paths are explainable: ${explainablePaths}/${concepts.length}
- Orphan evidence records: ${orphanEvidence.length}
- Duplicated evidence records: ${duplicateEvidence.length}
- Unsupported concepts: ${unsupportedConcepts.length}

## Unsupported Concepts

${unsupportedConcepts.length ? unsupportedConcepts.map(c => `- ${c.id}: ${c.canonical_name}`).join('\n') : '- None'}
`;
fs.writeFileSync(path.join(ROOT, 'reports', 'EVIDENCE_ENGINE_SUMMARY.md'), summaryMd, 'utf8');

const confidenceCounts = evidenceRecords.reduce((acc, r) => {
  acc[r.confidence] = (acc[r.confidence] || 0) + 1;
  return acc;
}, {});
const typeCounts = evidenceRecords.reduce((acc, r) => {
  acc[r.evidence_type] = (acc[r.evidence_type] || 0) + 1;
  return acc;
}, {});
const statsMd = `# Retrieval Statistics

- Canonical concepts: ${concepts.length}
- Evidence bundles: ${concepts.length}
- Evidence records: ${evidenceRecords.length}
- Concept index entries: ${conceptIndex.length}
- Formula index entries: ${formulaIndex.length}
- Regulation index entries: ${regulationIndex.length}
- Document index entries: ${documentIndex.length}
- Domain index entries: ${domainIndex.length}
- Glossary index entries: ${glossaryIndex.length}
- Explainability coverage: ${explainablePaths}/${concepts.length}
- Retrieval path termination: ${terminatedPaths}/${concepts.length}

## Confidence Distribution

${Object.entries(confidenceCounts).sort().map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Evidence Type Distribution

${Object.entries(typeCounts).sort().map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Validation Findings

- Concepts without evidence: ${conceptsWithoutEvidence.length}
- Evidence without source: ${evidenceWithoutSource.length}
- Orphan evidence: ${orphanEvidence.length}
- Duplicate evidence keys: ${duplicateEvidence.length}
`;
fs.writeFileSync(path.join(ROOT, 'reports', 'RETRIEVAL_STATISTICS.md'), statsMd, 'utf8');

console.log(JSON.stringify({
  evidence_bundles_created: concepts.length,
  evidence_records_created: evidenceRecords.length,
  retrieval_indexes_created: 6,
  explainability_coverage: `${explainablePaths}/${concepts.length}`,
  query_validation_file: 'validation/QUERY_VALIDATION.md',
  orphan_evidence: orphanEvidence.length,
  unsupported_concepts: unsupportedConcepts.length,
  duplicate_evidence: duplicateEvidence.length,
  evidence_without_source: evidenceWithoutSource.length,
}, null, 2));
