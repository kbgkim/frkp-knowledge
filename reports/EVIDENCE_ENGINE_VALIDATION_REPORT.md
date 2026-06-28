# Evidence Engine Validation Report

## 1. Executive Summary

Validation checked 53 canonical concepts, 53 evidence bundles, 667 evidence records, 6 retrieval indexes, and 17 required validation queries.

Final verdict: **EVIDENCE ENGINE VALIDATED WITH OBSERVATIONS**

## 2. Validation Scope

- Evidence coverage across canonical concepts and evidence bundles.
- Retrieval consistency for concept, formula, regulation, document, domain, and glossary indexes.
- Required query validation for FRKP v1.1 evidence-based publishing readiness.
- Evidence quality, traceability, explainability, duplicate detection, and failure detection.

## 3. Evidence Coverage

- Missing evidence bundles: 0
- Empty evidence bundles: 0
- Broken evidence references: 0
- Low-confidence-only concepts: 6

Missing bundles:

None.

Broken evidence references:

None.

## 4. Retrieval Index Validation

- concept_index.yaml: PASS, entries checked 98, broken references 0
- formula_index.yaml: PASS, entries checked 49, broken references 0
- regulation_index.yaml: PASS, entries checked 5, broken references 0
- document_index.yaml: PASS, entries checked 39, broken references 0
- domain_index.yaml: PASS, entries checked 17, broken references 0
- glossary_index.yaml: PASS, entries checked 36, broken references 0

Broken retrieval references:

None.

## 5. Query Validation Results

- Expected Shortfall: PASS -> Expected Shortfall (CAN-CON-000017), confidence {"Medium":6,"High":3}
- Liquidity Horizon: PASS -> Liquidity Horizon (CAN-CON-000023), confidence {"High":1}
- Probability of Default: PASS -> Probability of Default (CAN-CON-000038), confidence {"High":5}
- Loss Given Default: PASS -> Loss Given Default (CAN-CON-000024), confidence {"High":9}
- Exposure at Default: PASS -> Exposure at Default (CAN-CON-000018), confidence {"High":1}
- Expected Credit Loss: PASS -> Expected Credit Loss (CAN-CON-000016), confidence {"Low":8}
- SA-CCR: PASS -> Counterparty Credit Risk (CAN-CON-000009), confidence {"Medium":16}
- CVA: PASS -> Credit Valuation Adjustment (CAN-CON-000011), confidence {"Medium":1}
- RWA: PASS -> Risk Weighted Assets (CAN-CON-000046), confidence {"High":2}
- Market Risk: PASS -> Market Risk (CAN-CON-000027), confidence {"High":4,"Medium":24}
- Credit Risk: PASS -> Credit Risk (CAN-CON-000010), confidence {"Medium":14,"High":2}
- Operational Risk: PASS -> Operational Risk (CAN-CON-000032), confidence {"Medium":9,"High":1}
- NCR: PASS -> Net Capital Ratio (CAN-CON-000031), confidence {"High":12,"Medium":7}
- Stress Testing: PASS -> Stress Testing (CAN-CON-000049), confidence {"Medium":23,"High":2}
- Basel III: PASS -> Basel III (CAN-CON-000004), confidence {"Medium":8,"High":2}
- FRTB: PASS -> Fundamental Review of the Trading Book (CAN-CON-000019), confidence {"Medium":19}
- IFRS 9: PASS -> IFRS 9 (CAN-CON-000021), confidence {"Medium":1}

Failed queries:

None.

## 6. Evidence Quality Assessment

- Traceable records: 667/667
- Non-empty records: 667/667
- Duplicate evidence IDs: 0
- Duplicate evidence content fingerprints: 0

Evidence is considered traceable when source document and traceability metadata are present. Relevance is assessed structurally by concept-to-bundle and query-to-concept linkage, without judging financial correctness beyond available evidence.

## 7. Explainability Assessment

- Explainable query results: 17/17

Each passing query output includes why the result was returned, the matched canonical concept, evidence record IDs, source documents, and the relationship path followed.

## 8. Failures and Observations

- Unsupported concepts: 0
- Broken evidence references: 0
- Broken retrieval references: 0
- Queries with no valid result: 0
- Ambiguous query results: 0
- Low-confidence-only concepts: 6
- Low-confidence query results: 1

Low-confidence query results:

- {"query":"Expected Credit Loss","canonical_concept":"CAN-CON-000016","canonical_name":"Expected Credit Loss","confidence_distribution":{"Low":8}}

## 9. Recommendations

- Resolve all broken evidence and retrieval references before using the engine for controlled publishing.
- Review low-confidence-only concepts before publication workflows depend on them.
- Treat formula index entries with no evidence records as retrieval observations unless formula evidence is required by downstream FRKP templates.
- Preserve the generated validation outputs with the KC-005 evidence artifacts for auditability.

## 10. Final Verdict

EVIDENCE ENGINE VALIDATED WITH OBSERVATIONS
