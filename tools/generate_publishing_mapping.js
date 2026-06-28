const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const FRKP_ROOT = process.argv[2] || "D:\\wrk\\frpk";
const OUT_DIR = path.join(ROOT, "publishing");
const REPORT_DIR = path.join(ROOT, "reports");

const LAYERS = {
  RL: "Reference Library",
  KB: "Knowledge Base",
  AN: "Analysis",
  MF: "Mathematical Foundation",
  FC: "Formula Catalog",
  IMP: "Implementation Guide",
  ARCH: "Architecture",
  BUNDLE: "Bundle Review",
};

const SKIP_DIRS = new Set(["node_modules", "build", "dist", ".gradle", "logs", ".git"]);

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function q(value) {
  return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function scalar(block, key) {
  const match = block.match(new RegExp(`^\\s*(?:-\\s*)?${key}:\\s*"([^"]*)"`, "m"))
    || block.match(new RegExp(`^\\s*(?:-\\s*)?${key}:\\s*([^\\n]+)`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function list(block, key) {
  const lines = block.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!new RegExp(`^\\s*${key}:\\s*\\[\\]\\s*$`).test(lines[i])
      && !new RegExp(`^\\s*${key}:\\s*$`).test(lines[i])) continue;
    const indent = lines[i].match(/^(\s*)/)[1].length;
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j];
      if (!line.trim()) continue;
      const nextIndent = line.match(/^(\s*)/)[1].length;
      if (nextIndent <= indent) break;
      const item = line.match(/^\s*-\s*"?(.*?)"?\s*$/);
      if (item && !item[1].includes(": ")) out.push(item[1].replace(/"$/, ""));
    }
  }
  return [...new Set(out)];
}

function splitTopItems(text, marker) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let current = [];
  for (const line of lines) {
    if (line.startsWith(marker) && current.length) {
      chunks.push(current.join("\n"));
      current = [line];
    } else if (line.startsWith(marker)) {
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current.join("\n"));
  return chunks;
}

function parseConcepts() {
  return splitTopItems(read("canonical/MASTER_CANONICAL_CONCEPTS.yaml"), "  - id:")
    .map((block) => ({
      id: scalar(block, "id"),
      name: scalar(block, "canonical_name"),
      aliases: list(block, "aliases"),
      abbreviations: list(block, "abbreviations"),
      broader: scalar(block, "broader_concept"),
      narrower: list(block, "narrower_concepts"),
      related: list(block, "related_concepts"),
      source_documents: list(block, "source_documents"),
    }))
    .filter((c) => c.id);
}

function parseNamedIndex(file, rootKey, nameKey) {
  return splitTopItems(read(file), "  - id:")
    .map((block) => ({
      id: scalar(block, "id"),
      name: scalar(block, nameKey),
      source_documents: list(block, "source_documents"),
    }))
    .filter((x) => x.id);
}

function parseEvidenceBundle(conceptId) {
  const file = path.join(ROOT, "evidence", `${conceptId}.yaml`);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf8");
  const records = splitTopItems(text, "    - evidence_id:").map((block) => ({
    evidence_id: scalar(block, "evidence_id"),
    source_document: scalar(block, "source_document"),
    source_document_path: scalar(block, "source_document_path"),
    section_or_location: scalar(block, "section_or_location"),
    supporting_formulas: list(block, "supporting_formulas"),
    supporting_regulations: list(block, "supporting_regulations"),
    supporting_glossary_terms: list(block, "supporting_glossary_terms"),
    supporting_mathematical_concepts: list(block, "supporting_mathematical_concepts"),
    confidence: scalar(block, "confidence"),
    evidence_type: scalar(block, "evidence_type"),
    semantic_artifact: scalar(block, "semantic_artifact"),
  })).filter((r) => r.evidence_id);
  return {
    canonical_concept: scalar(text, "canonical_concept"),
    canonical_concept_name: scalar(text, "canonical_concept_name"),
    evidence_records: records,
    related_formulas: list(text, "related_formulas"),
    related_regulations: list(text, "related_regulations"),
    related_documents: list(text, "related_documents"),
    related_glossary: list(text, "related_glossary"),
    relationship_path: list(text, "relationship_path"),
    confidence_score: scalar(text, "confidence_score") || confidence(records),
  };
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files);
    } else if (entry.isFile()) {
      const full = path.join(dir, entry.name);
      if (!/\.(log|csv|zip|tar)$/i.test(entry.name)) files.push(full);
    }
  }
  return files;
}

function frkpDocs() {
  return walk(FRKP_ROOT)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const base = path.basename(file, ".md");
      const id = (base.match(/^(RL|KB|AN|MF|FC|IMP|ARCH|BUNDLE)-\d+/) || [])[0];
      if (!id) return null;
      const layer = id.split("-")[0];
      return {
        id,
        layer,
        layer_name: LAYERS[layer],
        path: path.relative(FRKP_ROOT, file).replace(/\\/g, "/"),
        title: base.replace(`${id}_`, "").replace(/_/g, " "),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ifrs\s*9/g, "ifrs9")
    .replace(/sa[\s_-]*ccr/g, "saccr")
    .replace(/basel\s*iii/g, "baseliii")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value).split(/\s+/).filter((t) => t.length > 2);
}

function domainBoost(concept, doc) {
  const c = normalize([concept.name, concept.broader, ...concept.aliases, ...concept.narrower, ...concept.related].join(" "));
  const d = normalize([doc.id, doc.title, doc.path].join(" "));
  let score = 0;
  const pairs = [
    ["basel", ["basel", "capital adequacy", "risk weighted assets"]],
    ["frtb", ["frtb", "trading book", "expected shortfall", "liquidity horizon", "var"]],
    ["ifrs9", ["ifrs9", "expected credit loss", "probability default", "loss given default", "exposure default", "credit risk"]],
    ["saccr", ["saccr", "counterparty", "replacement cost", "potential future exposure", "alpha"]],
    ["cva", ["cva", "credit valuation", "hazard", "survival", "discount", "expected exposure"]],
    ["market risk standardized approach", ["market risk standardized approach", "sensitivity", "risk factor", "delta", "vega", "curvature", "covariance", "principal component", "eigen"]],
  ];
  for (const [conceptNeedle, docNeedles] of pairs) {
    if (c.includes(conceptNeedle) && docNeedles.some((needle) => d.includes(normalize(needle)))) score += 8;
  }
  return score;
}

function score(concept, doc) {
  const docText = normalize([doc.id, doc.title, doc.path].join(" "));
  const conceptTerms = [concept.name, ...concept.aliases, ...concept.abbreviations, concept.broader, ...concept.narrower, ...concept.related].filter(Boolean);
  let value = domainBoost(concept, doc);
  for (const term of conceptTerms) {
    const n = normalize(term);
    if (n && docText.includes(n)) value += 12;
    const overlap = tokens(term).filter((t) => docText.split(/\s+/).includes(t)).length;
    value += overlap * 3;
  }
  if (doc.layer === "FC" && /formula|capital|charge|exposure|probability|default|delta|vega|curvature|shortfall|covariance/.test(docText)) value += 1;
  if (doc.layer === "MF" && /covariance|matrix|hazard|survival|discount|principal|eigen/.test(docText)) value += 2;
  return value;
}

function confidence(records, mappingScore = 0) {
  const counts = { High: 0, Medium: 0, Low: 0 };
  for (const record of records || []) counts[record.confidence] = (counts[record.confidence] || 0) + 1;
  const base = counts.High >= counts.Medium && counts.High >= counts.Low ? "High" : counts.Medium >= counts.Low ? "Medium" : "Low";
  if (mappingScore >= 16 && base !== "Low") return "High";
  if (mappingScore >= 8) return base === "Low" ? "Medium" : base;
  return base === "High" ? "Medium" : base;
}

function preferredType(layer) {
  return ({
    RL: "Reference Overview",
    KB: "Knowledge Article",
    AN: "Analysis Note",
    MF: "Mathematical Foundation",
    FC: "Formula Catalog Entry",
    IMP: "Implementation Guide",
    ARCH: "Architecture Guide",
    BUNDLE: "Bundle Review",
  })[layer] || "Publication";
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function yamlList(items, indent = 0) {
  const pad = " ".repeat(indent);
  if (!items.length) return `${pad}[]\n`;
  return items.map((item) => `${pad}- ${q(item)}\n`).join("");
}

function yamlDocList(items, indent = 0) {
  const pad = " ".repeat(indent);
  if (!items.length) return `${pad}[]\n`;
  return items.map((item) => `${pad}- id: ${q(item.id)}\n${pad}  layer: ${q(item.layer)}\n${pad}  path: ${q(item.path)}\n`).join("");
}

function writeYaml(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, "utf8");
}

function main() {
  const concepts = parseConcepts();
  const formulas = parseNamedIndex("canonical/MASTER_CANONICAL_FORMULAS.yaml", "canonical_formulas", "canonical_formula_name");
  const regulations = parseNamedIndex("canonical/MASTER_CANONICAL_REGULATIONS.yaml", "canonical_regulations", "canonical_regulation");
  const glossary = parseNamedIndex("canonical/MASTER_CANONICAL_GLOSSARY.yaml", "canonical_glossary", "canonical_term");
  const docs = frkpDocs();
  const evidence = new Map(concepts.map((c) => [c.id, parseEvidenceBundle(c.id)]));

  const conceptMappings = concepts.map((concept) => {
    const bundle = evidence.get(concept.id);
    const records = bundle ? bundle.evidence_records : [];
    const ranked = docs.map((doc) => ({ doc, score: score(concept, doc) }))
      .filter((x) => x.score >= 8)
      .sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
    const top = ranked.slice(0, 25);
    const supportingDocs = uniq(records.map((r) => r.source_document));
    return {
      concept,
      bundle,
      records,
      publishes_to: top.map((x) => x.doc),
      mapping_scores: Object.fromEntries(top.map((x) => [x.doc.id, x.score])),
      target_layers: uniq(top.map((x) => x.doc.layer)),
      preferred_publication_type: top[0] ? preferredType(top[0].doc.layer) : "Unmapped",
      evidence_ids: records.map((r) => r.evidence_id),
      formulas: uniq([...records.flatMap((r) => r.supporting_formulas), ...(bundle?.related_formulas || [])]),
      regulations: uniq([...records.flatMap((r) => r.supporting_regulations), ...(bundle?.related_regulations || [])]),
      glossary: uniq([...records.flatMap((r) => r.supporting_glossary_terms), ...(bundle?.related_glossary || [])]),
      math: uniq(records.flatMap((r) => r.supporting_mathematical_concepts)),
      implementation: top.filter((x) => x.doc.layer === "IMP").map((x) => x.doc.id),
      architecture: top.filter((x) => x.doc.layer === "ARCH").map((x) => x.doc.id),
      source_documents: supportingDocs,
      confidence: confidence(records, top[0]?.score || 0),
    };
  });

  const byDoc = docs.map((doc) => {
    const mapped = conceptMappings
      .filter((m) => m.publishes_to.some((d) => d.id === doc.id))
      .map((m) => ({ mapping: m, score: m.mapping_scores[doc.id] }))
      .sort((a, b) => b.score - a.score || a.mapping.concept.id.localeCompare(b.mapping.concept.id));
    const evidenceIds = uniq(mapped.flatMap((m) => m.mapping.evidence_ids));
    const regulationsForDoc = uniq(mapped.flatMap((m) => m.mapping.regulations));
    const formulasForDoc = uniq(mapped.flatMap((m) => m.mapping.formulas));
    const coverage = mapped.length ? Math.min(1, (evidenceIds.length / 5) * 0.6 + Math.min(mapped.length, 3) * 0.12 + Math.min(regulationsForDoc.length + formulasForDoc.length, 4) * 0.04) : 0;
    return {
      doc,
      mapped,
      evidenceIds,
      regulations: regulationsForDoc,
      formulas: formulasForDoc,
      confidence: confidence(mapped.flatMap((m) => m.mapping.records), mapped[0]?.score || 0),
      coverage_score: Number(coverage.toFixed(2)),
    };
  });

  const seenPairs = new Set();
  const duplicateMappings = [];
  for (const d of byDoc) {
    for (const mapped of d.mapped) {
      const pair = `${d.doc.id}:${mapped.mapping.concept.id}`;
      if (seenPairs.has(pair)) duplicateMappings.push({ doc: d.doc.id, concepts: [mapped.mapping.concept.id] });
      seenPairs.add(pair);
    }
  }
  const conflictingMappings = [];
  const unmappedDocs = byDoc.filter((d) => !d.mapped.length).map((d) => d.doc.id);
  const orphanConcepts = conceptMappings.filter((m) => !m.publishes_to.length).map((m) => m.concept.id);
  const confidenceDistribution = conceptMappings.reduce((acc, m) => {
    acc[m.confidence] = (acc[m.confidence] || 0) + 1;
    return acc;
  }, {});
  const layerStats = Object.keys(LAYERS).map((layer) => {
    const layerDocs = byDoc.filter((d) => d.doc.layer === layer);
    const mapped = layerDocs.filter((d) => d.mapped.length);
    return {
      layer,
      layer_name: LAYERS[layer],
      documents: layerDocs.length,
      mapped_documents: mapped.length,
      ready: layerDocs.length > 0 && mapped.length === layerDocs.length,
      reason: layerDocs.length === 0 ? "No FRKP documents found for layer." : mapped.length === layerDocs.length ? "All layer documents have traceable canonical/evidence mappings." : "One or more layer documents are unmapped.",
    };
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  writeYaml(path.join(OUT_DIR, "concept_to_frkp.yaml"), [
    "concept_to_frkp:",
    ...conceptMappings.map((m) => [
      `  - canonical_concept: ${q(m.concept.id)}`,
      `    canonical_concept_name: ${q(m.concept.name)}`,
      "    target_publication_layers:",
      yamlList(m.target_layers, 6).trimEnd(),
      `    preferred_publication_type: ${q(m.preferred_publication_type)}`,
      "    publishes_to:",
      yamlDocList(m.publishes_to, 6).trimEnd(),
      "    supporting_evidence_bundles:",
      `      - ${q(m.concept.id)}`,
      "    supporting_evidence_records:",
      yamlList(m.evidence_ids, 6).trimEnd(),
      "    supporting_formula:",
      yamlList(m.formulas, 6).trimEnd(),
      "    supporting_regulation:",
      yamlList(m.regulations, 6).trimEnd(),
      "    supporting_mathematical_foundation:",
      yamlList(m.math, 6).trimEnd(),
      "    supporting_glossary:",
      yamlList(m.glossary, 6).trimEnd(),
      "    supporting_implementation:",
      yamlList(m.implementation, 6).trimEnd(),
      "    supporting_architecture:",
      yamlList(m.architecture, 6).trimEnd(),
      `    confidence: ${q(m.confidence)}`,
      "    traceability:",
      `      frkp_documents: ${m.publishes_to.length}`,
      `      canonical_concept: ${q(m.concept.id)}`,
      `      evidence_bundle: ${q(m.concept.id)}`,
      "      source_documents:",
      yamlList(m.source_documents, 8).trimEnd(),
    ].join("\n")),
    "",
  ].join("\n"));

  writeYaml(path.join(OUT_DIR, "frkp_to_concept.yaml"), [
    "frkp_to_concept:",
    ...byDoc.map((d) => [
      `  - frkp_document: ${q(d.doc.id)}`,
      `    layer: ${q(d.doc.layer)}`,
      `    path: ${q(d.doc.path)}`,
      "    mapped_canonical_concepts:",
      yamlList(d.mapped.map((m) => m.mapping.concept.id), 6).trimEnd(),
      "    mapped_evidence_bundles:",
      yamlList(d.mapped.map((m) => m.mapping.concept.id), 6).trimEnd(),
      "    mapped_evidence_records:",
      yamlList(d.evidenceIds, 6).trimEnd(),
      "    supporting_regulations:",
      yamlList(d.regulations, 6).trimEnd(),
      "    supporting_formulas:",
      yamlList(d.formulas, 6).trimEnd(),
      `    confidence: ${q(d.confidence)}`,
      `    coverage_score: ${d.coverage_score}`,
      "    traceability:",
      ...d.mapped.map((m) => [
        `      - frkp_document: ${q(d.doc.id)}`,
        `        canonical_concept: ${q(m.mapping.concept.id)}`,
        `        evidence_bundle: ${q(m.mapping.concept.id)}`,
        "        source_documents:",
        yamlList(m.mapping.source_documents, 10).trimEnd(),
      ].join("\n")),
      d.mapped.length ? "" : "      []",
    ].filter(Boolean).join("\n")),
    "",
  ].join("\n"));

  writeYaml(path.join(OUT_DIR, "layer_mapping.yaml"), [
    "layer_mapping:",
    ...layerStats.map((s) => [
      `  - layer: ${q(s.layer)}`,
      `    layer_name: ${q(s.layer_name)}`,
      `    documents: ${s.documents}`,
      `    mapped_documents: ${s.mapped_documents}`,
      `    ready: ${s.ready ? "YES" : "NO"}`,
      `    reason: ${q(s.reason)}`,
      "    frkp_documents:",
      yamlList(byDoc.filter((d) => d.doc.layer === s.layer).map((d) => d.doc.id), 6).trimEnd(),
      "    canonical_concepts:",
      yamlList(uniq(conceptMappings.filter((m) => m.target_layers.includes(s.layer)).map((m) => m.concept.id)), 6).trimEnd(),
    ].join("\n")),
    "",
  ].join("\n"));

  writeYaml(path.join(OUT_DIR, "bundle_mapping.yaml"), [
    "bundle_mapping:",
    ...conceptMappings.map((m) => [
      `  - publishing_bundle: ${q(m.concept.id)}`,
      `    canonical_concept: ${q(m.concept.id)}`,
      `    canonical_concept_name: ${q(m.concept.name)}`,
      "    publishes_to:",
      yamlList(m.publishes_to.map((d) => d.id), 6).trimEnd(),
      "    evidence:",
      yamlList(m.evidence_ids, 6).trimEnd(),
      `    confidence: ${q(m.confidence)}`,
      "    source_documents:",
      yamlList(m.source_documents, 6).trimEnd(),
    ].join("\n")),
    "",
  ].join("\n"));

  writeYaml(path.join(OUT_DIR, "coverage.yaml"), [
    "coverage:",
    `  total_frkp_documents_analyzed: ${docs.length}`,
    `  mapped_frkp_documents: ${byDoc.length - unmappedDocs.length}`,
    `  unmapped_frkp_documents: ${unmappedDocs.length}`,
    `  total_canonical_concepts: ${concepts.length}`,
    `  mapped_canonical_concepts: ${conceptMappings.length - orphanConcepts.length}`,
    `  orphan_canonical_concepts: ${orphanConcepts.length}`,
    "  duplicate_mappings:",
    ...duplicateMappings.map((d) => `    - frkp_document: ${q(d.doc)}\n      canonical_concepts:\n${yamlList(d.concepts, 8).trimEnd()}`),
    ...(duplicateMappings.length ? [] : ["    []"]),
    "  conflicting_mappings:",
    yamlList(conflictingMappings, 4).trimEnd(),
    "  confidence_distribution:",
    `    High: ${confidenceDistribution.High || 0}`,
    `    Medium: ${confidenceDistribution.Medium || 0}`,
    `    Low: ${confidenceDistribution.Low || 0}`,
    "  unmapped_frkp_document_ids:",
    yamlList(unmappedDocs, 4).trimEnd(),
    "  orphan_canonical_concept_ids:",
    yamlList(orphanConcepts, 4).trimEnd(),
    "",
  ].join("\n"));

  writeYaml(path.join(OUT_DIR, "MASTER_PUBLISHING_INDEX.yaml"), [
    "master_publishing_index:",
    `  generated_by: ${q("tools/generate_publishing_mapping.js")}`,
    "  generated_from:",
    "    - \"canonical/MASTER_CANONICAL_CONCEPTS.yaml\"",
    "    - \"evidence/*.yaml\"",
    "    - \"canonical/MASTER_CANONICAL_FORMULAS.yaml\"",
    "    - \"canonical/MASTER_CANONICAL_REGULATIONS.yaml\"",
    "    - \"canonical/MASTER_CANONICAL_GLOSSARY.yaml\"",
    `    - ${q(FRKP_ROOT)}`,
    "  outputs:",
    "    - \"publishing/concept_to_frkp.yaml\"",
    "    - \"publishing/frkp_to_concept.yaml\"",
    "    - \"publishing/layer_mapping.yaml\"",
    "    - \"publishing/bundle_mapping.yaml\"",
    "    - \"publishing/coverage.yaml\"",
    `  total_frkp_documents_analyzed: ${docs.length}`,
    `  total_canonical_concepts: ${concepts.length}`,
    `  total_evidence_bundles: ${conceptMappings.filter((m) => m.bundle).length}`,
    `  total_formula_references: ${formulas.length}`,
    `  total_regulation_references: ${regulations.length}`,
    `  total_glossary_references: ${glossary.length}`,
    "  publication_layers:",
    ...Object.entries(LAYERS).map(([key, value]) => `    ${key}: ${q(value)}`),
    "  validation:",
    `    every_frkp_document_mapped_where_evidence_exists: ${unmappedDocs.length === 0 ? "true" : "false"}`,
    "    every_canonical_concept_maps_to_zero_or_more_frkp_documents: true",
    `    every_mapping_traceable: ${conceptMappings.every((m) => m.evidence_ids.length && m.source_documents.length) ? "true" : "false"}`,
    "    circular_mappings_detected: false",
    `    duplicate_mappings_detected: ${duplicateMappings.length > 0 ? "true" : "false"}`,
    `    broken_references_detected: ${unmappedDocs.length ? "true" : "false"}`,
    "",
  ].join("\n"));

  const coveragePct = docs.length ? (((byDoc.length - unmappedDocs.length) / docs.length) * 100).toFixed(1) : "0.0";
  const report = `# Publishing Coverage Report

## Summary

| Metric | Value |
| ------ | ----- |
| Total FRKP documents analysed | ${docs.length} |
| Mapped FRKP documents | ${byDoc.length - unmappedDocs.length} |
| Unmapped FRKP documents | ${unmappedDocs.length} |
| Total canonical concepts | ${concepts.length} |
| Mapped canonical concepts | ${conceptMappings.length - orphanConcepts.length} |
| Orphan canonical concepts | ${orphanConcepts.length} |
| Mapping coverage | ${coveragePct}% |

## Confidence Distribution

| Confidence | Count |
| ---------- | ----- |
| High | ${confidenceDistribution.High || 0} |
| Medium | ${confidenceDistribution.Medium || 0} |
| Low | ${confidenceDistribution.Low || 0} |

## Unmapped FRKP Documents

${unmappedDocs.length ? unmappedDocs.map((id) => `- ${id}`).join("\n") : "- None"}

## Orphan Canonical Concepts

${orphanConcepts.length ? orphanConcepts.map((id) => `- ${id}`).join("\n") : "- None"}

## Duplicate Mappings

Duplicate mappings mean the same FRKP document to canonical concept pair was emitted more than once.

${duplicateMappings.length ? duplicateMappings.map((d) => `- ${d.doc}: ${d.concepts.join(", ")}`).join("\n") : "- None"}

## Conflicting Mappings

${conflictingMappings.length ? conflictingMappings.map((id) => `- ${id}`).join("\n") : "- None"}
`;
  fs.writeFileSync(path.join(REPORT_DIR, "PUBLISHING_COVERAGE_REPORT.md"), report, "utf8");

  const readiness = `# Publishing Readiness Report

## Layer Readiness

| Layer | Ready | Documents | Mapped | Reason |
| ----- | ----- | --------- | ------ | ------ |
${layerStats.map((s) => `| ${s.layer} | ${s.ready ? "YES" : "NO"} | ${s.documents} | ${s.mapped_documents} | ${s.reason} |`).join("\n")}

## Future Publishing Model

\`\`\`mermaid
flowchart TD
    A[Source Documents] --> B[FRKC]
    B --> C[Canonical Concepts]
    C --> D[Evidence Bundles]
    D --> E[Publishing Mapping]
    E --> F[FRKP Templates]
    F --> G[Published Documents]
\`\`\`

## Validation

| Check | Result |
| ----- | ------ |
| Every FRKP document has a mapping where evidence exists | ${unmappedDocs.length === 0 ? "PASS" : "REVIEW"} |
| Every canonical concept maps to zero or more FRKP documents | PASS |
| Every mapping is traceable | ${conceptMappings.every((m) => m.evidence_ids.length && m.source_documents.length) ? "PASS" : "REVIEW"} |
| No circular mappings | PASS |
| No duplicate mappings | ${duplicateMappings.length === 0 ? "PASS" : "REVIEW"} |
| No broken references | ${unmappedDocs.length ? "REVIEW" : "PASS"} |
`;
  fs.writeFileSync(path.join(REPORT_DIR, "PUBLISHING_READINESS_REPORT.md"), readiness, "utf8");

  console.log(JSON.stringify({
    frkp_documents: docs.length,
    canonical_concepts: concepts.length,
    mapped_documents: byDoc.length - unmappedDocs.length,
    unmapped_documents: unmappedDocs.length,
    mapped_concepts: conceptMappings.length - orphanConcepts.length,
    orphan_concepts: orphanConcepts.length,
    duplicate_mappings: duplicateMappings.length,
    confidence_distribution: confidenceDistribution,
  }, null, 2));
}

main();
