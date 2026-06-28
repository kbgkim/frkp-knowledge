const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'validation', 'evidence-engine');
const REPORT_FILE = path.join(ROOT, 'reports', 'EVIDENCE_ENGINE_VALIDATION_REPORT.md');

const REQUIRED_QUERIES = [
  'Expected Shortfall',
  'Liquidity Horizon',
  'Probability of Default',
  'Loss Given Default',
  'Exposure at Default',
  'Expected Credit Loss',
  'SA-CCR',
  'CVA',
  'RWA',
  'Market Risk',
  'Credit Risk',
  'Operational Risk',
  'NCR',
  'Stress Testing',
  'Basel III',
  'FRTB',
  'IFRS 9',
];

const INDEX_FILES = [
  'concept_index.yaml',
  'formula_index.yaml',
  'regulation_index.yaml',
  'document_index.yaml',
  'domain_index.yaml',
  'glossary_index.yaml',
];

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });

function parseScalar(raw) {
  const value = String(raw ?? '').trim();
  if (value === '' || value === 'null' || value === '~') return '';
  if (value === '[]') return [];
  if (value === '{}') return {};
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function splitKeyValue(text) {
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch === '"' || ch === "'") && text[i - 1] !== '\\') quote = quote === ch ? '' : ch;
    if (ch === ':' && !quote) return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
  }
  return [text.trim(), ''];
}

function parseYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = text.split(/\r?\n/);

  function parentFor(indent) {
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    return stack[stack.length - 1].value;
  }

  function attach(parent, key, value) {
    if (Array.isArray(parent)) parent.push(value);
    else parent[key] = value;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const indent = raw.match(/^ */)[0].length;
    const trimmed = raw.trim();
    const parent = parentFor(indent);

    if (trimmed.startsWith('- ')) {
      const itemText = trimmed.slice(2);
      if (!Array.isArray(parent)) continue;
      if (itemText.includes(':')) {
        const [key, valueText] = splitKeyValue(itemText);
        const obj = {};
        parent.push(obj);
        if (valueText === '') {
          const next = nextContainer(lines, i, indent + 2);
          obj[key] = next;
          stack.push({ indent: indent + 2, value: next });
        } else {
          obj[key] = parseScalar(valueText);
        }
        stack.push({ indent, value: obj });
      } else {
        parent.push(parseScalar(itemText));
      }
      continue;
    }

    const [key, valueText] = splitKeyValue(trimmed);
    if (!key) continue;
    if (valueText === '') {
      const container = nextContainer(lines, i, indent);
      attach(parent, key, container);
      stack.push({ indent, value: container });
    } else {
      attach(parent, key, parseScalar(valueText));
    }
  }
  return root;
}

function nextContainer(lines, index, indent) {
  for (let j = index + 1; j < lines.length; j++) {
    const raw = lines[j];
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    const nextIndent = raw.match(/^ */)[0].length;
    if (nextIndent <= indent) return {};
    return raw.trim().startsWith('- ') ? [] : {};
  }
  return {};
}

function readYaml(rel) {
  return parseYaml(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function scalar(value) {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  return JSON.stringify(String(value));
}

function yaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return '\n' + value.map(item => {
      if (item && typeof item === 'object') return `${pad}- ${yamlObject(item, indent + 2).trimStart()}`;
      return `${pad}- ${scalar(item)}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') return '\n' + yamlObject(value, indent);
  return scalar(value);
}

function yamlObject(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  return Object.entries(obj).map(([key, value]) => {
    if (Array.isArray(value) || (value && typeof value === 'object')) return `${pad}${key}: ${yaml(value, indent + 2)}`;
    return `${pad}${key}: ${yaml(value, indent)}`;
  }).join('\n');
}

function writeYaml(rel, rootKey, value) {
  const body = `${rootKey}: ${yaml(value, 2)}\n`;
  fs.writeFileSync(path.join(ROOT, rel), body, 'utf8');
}

function list(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, ' ').trim();
}

function uniq(values) {
  return [...new Set(values.filter(v => v !== undefined && v !== null && String(v) !== ''))];
}

function loadCanonical(rootKey, file) {
  return list(readYaml(`canonical/${file}`)[rootKey]);
}

const concepts = loadCanonical('canonical_concepts', 'MASTER_CANONICAL_CONCEPTS.yaml');
const formulas = loadCanonical('canonical_formulas', 'MASTER_CANONICAL_FORMULAS.yaml');
const regulations = loadCanonical('canonical_regulations', 'MASTER_CANONICAL_REGULATIONS.yaml');
const domains = loadCanonical('canonical_domains', 'MASTER_CANONICAL_DOMAINS.yaml');
const glossary = loadCanonical('canonical_glossary', 'MASTER_CANONICAL_GLOSSARY.yaml');
const metadataFiles = fs.readdirSync(path.join(ROOT, 'metadata')).filter(f => /^KC-\d{6}\.yaml$/.test(f));

const conceptIds = new Set(concepts.map(c => c.id));
const formulaIds = new Set(formulas.map(f => f.id));
const regulationIds = new Set(regulations.map(r => r.id));
const domainIds = new Set(domains.map(d => d.id));
const glossaryIds = new Set(glossary.map(g => g.id));
const documentIds = new Set(metadataFiles.map(f => f.slice(0, 9)));

const evidenceFiles = fs.readdirSync(path.join(ROOT, 'evidence')).filter(f => /^CAN-CON-\d{6}\.yaml$/.test(f)).sort();
const evidenceBundles = new Map();
const evidenceById = new Map();
const duplicateEvidence = [];
for (const file of evidenceFiles) {
  const bundle = readYaml(`evidence/${file}`).evidence_bundle || {};
  evidenceBundles.set(bundle.canonical_concept || file.replace(/\.yaml$/, ''), bundle);
  for (const record of list(bundle.evidence_records)) {
    if (evidenceById.has(record.evidence_id)) duplicateEvidence.push(record.evidence_id);
    evidenceById.set(record.evidence_id, record);
  }
}

const indexes = Object.fromEntries(INDEX_FILES.map(file => [file, readYaml(`retrieval/${file}`)[file.replace('.yaml', '')] || []]));

function recordProblems(record) {
  const problems = [];
  if (!record.evidence_id) problems.push('missing evidence_id');
  if (!record.source_document) problems.push('missing source_document');
  else if (!documentIds.has(record.source_document)) problems.push(`unknown source_document ${record.source_document}`);
  if (!record.confidence) problems.push('missing confidence');
  if (!record.evidence_type) problems.push('missing evidence_type');
  if (!record.canonical_concept || !conceptIds.has(record.canonical_concept)) problems.push(`unknown canonical_concept ${record.canonical_concept || ''}`.trim());
  if (record.traceability && record.traceability.semantic_artifact) {
    const semanticPath = path.join(ROOT, record.traceability.semantic_artifact);
    if (!fs.existsSync(semanticPath)) problems.push(`missing semantic artifact ${record.traceability.semantic_artifact}`);
  }
  return problems;
}

const missingEvidenceBundles = [];
const emptyEvidenceBundles = [];
const brokenEvidenceReferences = [];
const lowConfidenceOnlyConcepts = [];
const evidenceCoverage = [];

for (const concept of concepts) {
  const bundle = evidenceBundles.get(concept.id);
  const records = list(bundle && bundle.evidence_records);
  if (!bundle) missingEvidenceBundles.push(concept.id);
  if (bundle && !records.length) emptyEvidenceBundles.push(concept.id);
  const confidenceDistribution = {};
  for (const record of records) {
    confidenceDistribution[record.confidence || 'Missing'] = (confidenceDistribution[record.confidence || 'Missing'] || 0) + 1;
    const problems = recordProblems(record);
    if (problems.length) brokenEvidenceReferences.push({ concept_id: concept.id, evidence_id: record.evidence_id || '', problems });
  }
  if (records.length && Object.keys(confidenceDistribution).every(k => k === 'Low')) lowConfidenceOnlyConcepts.push({ concept_id: concept.id, canonical_name: concept.canonical_name, evidence_records: records.length });
  evidenceCoverage.push({
    concept_id: concept.id,
    canonical_name: concept.canonical_name,
    has_bundle: Boolean(bundle),
    evidence_record_count: records.length,
    confidence_distribution: confidenceDistribution,
  });
}

function checkEvidenceIds(ids, context, out) {
  for (const id of list(ids)) if (!evidenceById.has(id)) out.push(`${context} references missing evidence ${id}`);
}

function checkDocumentIds(ids, context, out) {
  for (const id of list(ids)) if (!documentIds.has(id)) out.push(`${context} references missing document ${id}`);
}

const retrievalValidation = {};
const brokenRetrievalReferences = [];

for (const [file, rows] of Object.entries(indexes)) {
  const problems = [];
  rows.forEach((row, i) => {
    const context = `${file}[${i}]`;
    if (row.canonical_concept && !conceptIds.has(row.canonical_concept)) problems.push(`${context} has unknown canonical_concept ${row.canonical_concept}`);
    if (row.related_concept && !conceptIds.has(row.related_concept)) problems.push(`${context} has unknown related_concept ${row.related_concept}`);
    for (const id of list(row.related_concepts).concat(list(row.concepts_supported))) {
      if (!conceptIds.has(id)) problems.push(`${context} references missing concept ${id}`);
    }
    if (row.formula_id && !formulaIds.has(row.formula_id)) problems.push(`${context} has unknown formula_id ${row.formula_id}`);
    if (row.regulation_id && !regulationIds.has(row.regulation_id)) problems.push(`${context} has unknown regulation_id ${row.regulation_id}`);
    if (row.domain_id && !domainIds.has(row.domain_id)) problems.push(`${context} has unknown domain_id ${row.domain_id}`);
    if (row.glossary_id && !glossaryIds.has(row.glossary_id)) problems.push(`${context} has unknown glossary_id ${row.glossary_id}`);
    if (row.document_id && !documentIds.has(row.document_id)) problems.push(`${context} has unknown document_id ${row.document_id}`);
    checkEvidenceIds(row.evidence_records, context, problems);
    checkDocumentIds(row.source_documents, context, problems);
  });
  retrievalValidation[file] = { entries_checked: rows.length, broken_reference_count: problems.length, status: problems.length ? 'FAIL' : 'PASS' };
  brokenRetrievalReferences.push(...problems);
}

const conceptLookup = new Map();
for (const row of indexes['concept_index.yaml']) {
  const terms = uniq([row.lookup_key, row.lookup_term, row.canonical_name, ...list(row.aliases), ...list(row.abbreviations)]);
  for (const term of terms) conceptLookup.set(norm(term), row);
}
for (const concept of concepts) {
  const terms = uniq([concept.canonical_name, ...list(concept.aliases), ...list(concept.abbreviations), ...list(concept.equivalent_terms)]);
  for (const term of terms) if (!conceptLookup.has(norm(term))) conceptLookup.set(norm(term), { canonical_concept: concept.id, canonical_name: concept.canonical_name });
}

const extraQueryAliases = {
  'sa ccr': 'Counterparty Credit Risk',
  cva: 'Credit Valuation Adjustment',
  rwa: 'Risk Weighted Assets',
  ncr: 'Net Capital Ratio',
  frtb: 'Fundamental Review of the Trading Book',
  'ifrs 9': 'IFRS 9 Financial Instruments',
};

function findQuery(query) {
  const direct = conceptLookup.get(norm(query));
  if (direct) return { row: direct, matchType: 'direct' };
  const alias = extraQueryAliases[norm(query)];
  if (alias && conceptLookup.get(norm(alias))) return { row: conceptLookup.get(norm(alias)), matchType: `alias:${alias}` };
  const candidates = [];
  for (const [key, row] of conceptLookup.entries()) {
    if (key && (key.includes(norm(query)) || norm(query).includes(key))) candidates.push(row);
  }
  const uniqueCandidates = uniq(candidates.map(c => c.canonical_concept)).map(id => candidates.find(c => c.canonical_concept === id));
  if (uniqueCandidates.length === 1) return { row: uniqueCandidates[0], matchType: 'fuzzy' };
  if (uniqueCandidates.length > 1) return { ambiguous: uniqueCandidates };
  return {};
}

const queryResults = [];
const failedQueries = [];
const lowConfidenceResults = [];
const ambiguousQueryResults = [];

for (const query of REQUIRED_QUERIES) {
  const found = findQuery(query);
  if (found.ambiguous) {
    const row = { query, status: 'AMBIGUOUS', candidates: found.ambiguous.map(c => ({ canonical_concept: c.canonical_concept, canonical_name: c.canonical_name })) };
    queryResults.push(row);
    failedQueries.push({ query, reason: 'ambiguous query result', candidates: row.candidates });
    ambiguousQueryResults.push(row);
    continue;
  }
  if (!found.row) {
    const row = { query, status: 'NO_RESULT', missing_evidence: ['no canonical concept match'] };
    queryResults.push(row);
    failedQueries.push({ query, reason: 'no valid result' });
    continue;
  }
  const conceptId = found.row.canonical_concept;
  const concept = concepts.find(c => c.id === conceptId) || {};
  const bundle = evidenceBundles.get(conceptId) || {};
  const records = list(bundle.evidence_records);
  const confidenceDistribution = {};
  const sources = [];
  for (const record of records) {
    confidenceDistribution[record.confidence || 'Missing'] = (confidenceDistribution[record.confidence || 'Missing'] || 0) + 1;
    sources.push(record.source_document);
  }
  const missing = [];
  if (!records.length) missing.push('no supporting evidence records');
  for (const record of records) {
    const problems = recordProblems(record);
    if (problems.length) missing.push(`${record.evidence_id}: ${problems.join('; ')}`);
  }
  const retrievalPath = list(found.row.retrieval_path).length ? list(found.row.retrieval_path) : list(bundle.retrieval_path);
  const supportingEvidence = records.map(r => ({
    evidence_id: r.evidence_id,
    source_document: r.source_document,
    confidence: r.confidence || '',
    evidence_type: r.evidence_type || '',
  }));
  const status = missing.length ? 'FAILED' : 'PASS';
  const row = {
    query,
    status,
    match_type: found.matchType,
    matched_canonical_concept: conceptId,
    matched_canonical_name: concept.canonical_name || found.row.canonical_name || '',
    retrieval_path: retrievalPath,
    supporting_evidence_records: supportingEvidence,
    source_documents: uniq(sources),
    confidence_distribution: confidenceDistribution,
    missing_evidence: missing,
    explainability: {
      why_returned: `Query normalized to ${found.matchType} match for ${concept.canonical_name || found.row.canonical_name}.`,
      canonical_concept_matched: conceptId,
      evidence_records_supporting_result: supportingEvidence.map(r => r.evidence_id),
      source_documents_contributed: uniq(sources),
      relationship_path_followed: retrievalPath,
    },
  };
  queryResults.push(row);
  if (status !== 'PASS') failedQueries.push({ query, reason: 'missing or broken evidence', missing_evidence: missing });
  if (records.length && Object.keys(confidenceDistribution).every(k => k === 'Low')) {
    const low = { query, canonical_concept: conceptId, canonical_name: concept.canonical_name || '', confidence_distribution: confidenceDistribution };
    lowConfidenceResults.push(low);
  }
}

const evidenceFingerprint = new Map();
const duplicateEvidenceContent = [];
for (const record of evidenceById.values()) {
  const fp = [record.canonical_concept, record.source_document, record.section_or_location, record.evidence_type].join('|');
  if (evidenceFingerprint.has(fp)) duplicateEvidenceContent.push({ evidence_id: record.evidence_id, duplicate_of: evidenceFingerprint.get(fp), fingerprint: fp });
  else evidenceFingerprint.set(fp, record.evidence_id);
}

const quality = {
  traceable_records: [...evidenceById.values()].filter(r => r.traceability && r.traceability.source_preserved !== undefined && r.source_document).length,
  total_records: evidenceById.size,
  non_empty_records: [...evidenceById.values()].filter(r => r.evidence_id && r.canonical_concept && r.source_document && r.evidence_type).length,
  duplicate_evidence_ids: uniq(duplicateEvidence),
  duplicate_evidence_content_count: duplicateEvidenceContent.length,
  explainable_query_results: queryResults.filter(q => q.explainability && list(q.explainability.relationship_path_followed).length).length,
};

const validationResults = {
  generated_at: new Date().toISOString(),
  validation_scope: {
    canonical_concepts: concepts.length,
    evidence_bundles: evidenceBundles.size,
    evidence_records: evidenceById.size,
    retrieval_indexes: INDEX_FILES,
    required_queries: REQUIRED_QUERIES.length,
  },
  evidence_coverage: {
    status: missingEvidenceBundles.length || emptyEvidenceBundles.length || brokenEvidenceReferences.length ? 'FAIL' : 'PASS',
    missing_evidence_bundles: missingEvidenceBundles,
    empty_evidence_bundles: emptyEvidenceBundles,
    broken_evidence_references: brokenEvidenceReferences,
    low_confidence_only_concepts: lowConfidenceOnlyConcepts,
    concept_results: evidenceCoverage,
  },
  retrieval_index_validation: retrievalValidation,
  broken_retrieval_references: brokenRetrievalReferences,
  evidence_quality: quality,
  failure_detection: {
    unsupported_concepts: missingEvidenceBundles.concat(emptyEvidenceBundles),
    duplicate_evidence: uniq(duplicateEvidence),
    duplicate_evidence_content: duplicateEvidenceContent,
    queries_with_no_valid_result: failedQueries.filter(q => q.reason === 'no valid result').map(q => q.query),
    ambiguous_query_results: ambiguousQueryResults,
  },
};

const success =
  !missingEvidenceBundles.length &&
  !emptyEvidenceBundles.length &&
  !brokenEvidenceReferences.length &&
  !brokenRetrievalReferences.length &&
  !failedQueries.length &&
  quality.duplicate_evidence_ids.length === 0;

const observations =
  lowConfidenceOnlyConcepts.length ||
  lowConfidenceResults.length ||
  duplicateEvidenceContent.length ||
  Object.values(retrievalValidation).some(v => v.broken_reference_count > 0);

const verdict = success && !observations
  ? 'EVIDENCE ENGINE VALIDATED'
  : success
    ? 'EVIDENCE ENGINE VALIDATED WITH OBSERVATIONS'
    : 'EVIDENCE ENGINE NOT READY';

writeYaml('validation/evidence-engine/EVIDENCE_VALIDATION_RESULTS.yaml', 'evidence_validation_results', { ...validationResults, final_verdict: verdict });
writeYaml('validation/evidence-engine/QUERY_RESULTS.yaml', 'query_results', queryResults);
writeYaml('validation/evidence-engine/FAILED_QUERIES.yaml', 'failed_queries', failedQueries);
writeYaml('validation/evidence-engine/LOW_CONFIDENCE_RESULTS.yaml', 'low_confidence_results', lowConfidenceResults);

function mdList(items, empty = 'None.') {
  if (!items.length) return empty;
  return items.map(item => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n');
}

const report = `# Evidence Engine Validation Report

## 1. Executive Summary

Validation checked ${concepts.length} canonical concepts, ${evidenceBundles.size} evidence bundles, ${evidenceById.size} evidence records, ${INDEX_FILES.length} retrieval indexes, and ${REQUIRED_QUERIES.length} required validation queries.

Final verdict: **${verdict}**

## 2. Validation Scope

- Evidence coverage across canonical concepts and evidence bundles.
- Retrieval consistency for concept, formula, regulation, document, domain, and glossary indexes.
- Required query validation for FRKP v1.1 evidence-based publishing readiness.
- Evidence quality, traceability, explainability, duplicate detection, and failure detection.

## 3. Evidence Coverage

- Missing evidence bundles: ${missingEvidenceBundles.length}
- Empty evidence bundles: ${emptyEvidenceBundles.length}
- Broken evidence references: ${brokenEvidenceReferences.length}
- Low-confidence-only concepts: ${lowConfidenceOnlyConcepts.length}

Missing bundles:

${mdList(missingEvidenceBundles)}

Broken evidence references:

${mdList(brokenEvidenceReferences)}

## 4. Retrieval Index Validation

${Object.entries(retrievalValidation).map(([file, result]) => `- ${file}: ${result.status}, entries checked ${result.entries_checked}, broken references ${result.broken_reference_count}`).join('\n')}

Broken retrieval references:

${mdList(brokenRetrievalReferences)}

## 5. Query Validation Results

${queryResults.map(q => `- ${q.query}: ${q.status} -> ${q.matched_canonical_name || 'no match'} (${q.matched_canonical_concept || 'n/a'}), confidence ${JSON.stringify(q.confidence_distribution || {})}`).join('\n')}

Failed queries:

${mdList(failedQueries)}

## 6. Evidence Quality Assessment

- Traceable records: ${quality.traceable_records}/${quality.total_records}
- Non-empty records: ${quality.non_empty_records}/${quality.total_records}
- Duplicate evidence IDs: ${quality.duplicate_evidence_ids.length}
- Duplicate evidence content fingerprints: ${quality.duplicate_evidence_content_count}

Evidence is considered traceable when source document and traceability metadata are present. Relevance is assessed structurally by concept-to-bundle and query-to-concept linkage, without judging financial correctness beyond available evidence.

## 7. Explainability Assessment

- Explainable query results: ${quality.explainable_query_results}/${queryResults.length}

Each passing query output includes why the result was returned, the matched canonical concept, evidence record IDs, source documents, and the relationship path followed.

## 8. Failures and Observations

- Unsupported concepts: ${validationResults.failure_detection.unsupported_concepts.length}
- Broken evidence references: ${brokenEvidenceReferences.length}
- Broken retrieval references: ${brokenRetrievalReferences.length}
- Queries with no valid result: ${validationResults.failure_detection.queries_with_no_valid_result.length}
- Ambiguous query results: ${ambiguousQueryResults.length}
- Low-confidence-only concepts: ${lowConfidenceOnlyConcepts.length}
- Low-confidence query results: ${lowConfidenceResults.length}

Low-confidence query results:

${mdList(lowConfidenceResults)}

## 9. Recommendations

- Resolve all broken evidence and retrieval references before using the engine for controlled publishing.
- Review low-confidence-only concepts before publication workflows depend on them.
- Treat formula index entries with no evidence records as retrieval observations unless formula evidence is required by downstream FRKP templates.
- Preserve the generated validation outputs with the KC-005 evidence artifacts for auditability.

## 10. Final Verdict

${verdict}
`;

fs.writeFileSync(REPORT_FILE, report, 'utf8');

console.log(JSON.stringify({
  verdict,
  concepts: concepts.length,
  evidence_bundles: evidenceBundles.size,
  evidence_records: evidenceById.size,
  failed_queries: failedQueries.length,
  broken_evidence_references: brokenEvidenceReferences.length,
  broken_retrieval_references: brokenRetrievalReferences.length,
  low_confidence_results: lowConfidenceResults.length,
}, null, 2));
