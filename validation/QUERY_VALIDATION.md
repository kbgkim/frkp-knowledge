# Query Validation

Generated: 2026-06-28T04:47:58.974Z

## Expected Shortfall

- Result: PASS
- Canonical Concept: CAN-CON-000017 Expected Shortfall
- Evidence Records: EVD-000183, EVD-000184, EVD-000185, EVD-000186, EVD-000187, EVD-000188, EVD-000189, EVD-000190, EVD-000191
- Source Documents: KC-000001, KC-000016, KC-000018, KC-000019, KC-000022, KC-000023, KC-000025, KC-000036, KC-000042
- Expected Retrieval Path:
  - Expected Shortfall
  - Canonical Concept CAN-CON-000017
  - Formula CAN-FOR-000012
  - Formula CAN-FOR-000048
  - Formula ES
  - Formula i=1 60 VaR t-i × 3+ α c + Max SVaR t-1 , 1 60 i=1 60 SVaR t-i × 3+ α s 사후검증( Back testing) 과 손익 산출 개요 산출된 VaR 값을 포트폴리오의 실제
  - Regulation CAN-REG-000001
  - Regulation CAN-REG-000002
  - Regulation CAN-REG-000004
  - Regulation CAN-REG-000005
  - Supporting Document KC-000001
  - Supporting Document KC-000016
  - Supporting Document KC-000018
  - Supporting Document KC-000019
  - Supporting Document KC-000022
  - Supporting Document KC-000023
  - Supporting Document KC-000025
  - Supporting Document KC-000036
  - Supporting Document KC-000042
  - KC-000001 --contains--> Expected Shortfall
  - ES --equivalent_to--> Expected Shortfall
  - KC-000016 --contains--> Expected Shortfall
  - Expected Shortfall --defines--> Expected Shortfall
  - Expected Shortfall --defined_by--> Expected Shortfall
  - ES --equivalent_to--> Expected Shortfall
  - KC-000018 --contains--> Expected Shortfall
  - ES --equivalent_to--> Expected Shortfall

## Liquidity Horizon

- Result: PASS
- Canonical Concept: CAN-CON-000023 Liquidity Horizon
- Evidence Records: EVD-000229
- Source Documents: KC-000016
- Expected Retrieval Path:
  - Liquidity Horizon
  - Canonical Concept CAN-CON-000023
  - Regulation CAN-REG-000001
  - Regulation CAN-REG-000004
  - Regulation CAN-REG-000005
  - Supporting Document KC-000016
  - KC-000016 --contains--> Liquidity Horizon
  - Liquidity Horizon --referenced_by--> KC-000016
  - Liquidity Horizon --belongs_to--> Credit Risk
  - Liquidity Horizon --belongs_to--> Market Risk
  - Liquidity Horizon --belongs_to--> Mathematics
  - Liquidity Horizon --belongs_to--> Optimization
  - Liquidity Horizon --belongs_to--> Regulation
  - Liquidity Horizon --belongs_to--> Statistics

## Probability of Default

- Result: PASS
- Canonical Concept: CAN-CON-000038 Probability of Default
- Evidence Records: EVD-000438, EVD-000439, EVD-000440, EVD-000441, EVD-000442
- Source Documents: KC-000016, KC-000022, KC-000033, KC-000034, KC-000037
- Expected Retrieval Path:
  - Probability of Default
  - Canonical Concept CAN-CON-000038
  - Formula CAN-FOR-000011
  - Formula CAN-FOR-000031
  - Formula CAN-FOR-000034
  - Formula CAN-FOR-000046
  - Formula EL = CE x PD x LGD 변수 적용방안 CE (Credit Exposure) CCE + PFE CCE (Counterparty Credit Exposure) 대체비용 - 가상채권 대체비용 평가금액 (IFRS) + 경
  - Regulation CAN-REG-000001
  - Regulation CAN-REG-000004
  - Regulation CAN-REG-000005
  - Supporting Document KC-000016
  - Supporting Document KC-000022
  - Supporting Document KC-000033
  - Supporting Document KC-000034
  - Supporting Document KC-000037
  - PD --equivalent_to--> Probability of Default
  - KC-000016 --contains--> Probability of Default
  - Probability of Default --referenced_by--> KC-000016
  - Probability of Default --belongs_to--> Credit Risk
  - Probability of Default --belongs_to--> Market Risk
  - Probability of Default --belongs_to--> Mathematics
  - Probability of Default --belongs_to--> Optimization
  - Probability of Default --belongs_to--> Regulation

## Operational Risk

- Result: PASS
- Canonical Concept: CAN-CON-000032 Operational Risk
- Evidence Records: EVD-000330, EVD-000331, EVD-000332, EVD-000333, EVD-000334, EVD-000335, EVD-000336, EVD-000337, EVD-000338, EVD-000339
- Source Documents: KC-000001, KC-000003, KC-000022, KC-000023, KC-000031, KC-000032, KC-000034, KC-000036, KC-000037, KC-000042
- Expected Retrieval Path:
  - Operational Risk
  - Canonical Concept CAN-CON-000032
  - Regulation CAN-REG-000001
  - Regulation CAN-REG-000002
  - Regulation CAN-REG-000004
  - Regulation CAN-REG-000005
  - Supporting Document KC-000001
  - Supporting Document KC-000003
  - Supporting Document KC-000022
  - Supporting Document KC-000023
  - Supporting Document KC-000031
  - Supporting Document KC-000032
  - Supporting Document KC-000034
  - Supporting Document KC-000036
  - Supporting Document KC-000037
  - Supporting Document KC-000042
  - KC-000001 --belongs_to--> Operational Risk
  - Backtesting --belongs_to--> Operational Risk
  - Batch Scheduler --belongs_to--> Operational Risk
  - Capital Requirement --belongs_to--> Operational Risk
  - Correlation --belongs_to--> Operational Risk
  - Data Loader --belongs_to--> Operational Risk
  - Default --belongs_to--> Operational Risk
  - Default Risk Charge --belongs_to--> Operational Risk

## CVA

- Result: PASS
- Canonical Concept: CAN-CON-000011 Credit Valuation Adjustment
- Evidence Records: EVD-000119
- Source Documents: KC-000022
- Expected Retrieval Path:
  - Credit Valuation Adjustment
  - Canonical Concept CAN-CON-000011
  - Formula CAN-FOR-000006
  - Formula CVA
  - Regulation CAN-REG-000001
  - Regulation CAN-REG-000004
  - Regulation CAN-REG-000005
  - Supporting Document KC-000022

## SA-CCR

- Result: PASS
- Canonical Concept: CAN-CON-000009 Counterparty Credit Risk
- Evidence Records: EVD-000087, EVD-000088, EVD-000089, EVD-000090, EVD-000091, EVD-000092, EVD-000093, EVD-000094, EVD-000095, EVD-000096, EVD-000097, EVD-000098, EVD-000099, EVD-000100, EVD-000101, EVD-000102
- Source Documents: KC-000001, KC-000006, KC-000008, KC-000011, KC-000012, KC-000016, KC-000022, KC-000023, KC-000031, KC-000032, KC-000033, KC-000034, KC-000036, KC-000037, KC-000040, KC-000042
- Expected Retrieval Path:
  - Counterparty Credit Risk
  - Canonical Concept CAN-CON-000009
  - Regulation CAN-REG-000001
  - Regulation CAN-REG-000002
  - Regulation CAN-REG-000004
  - Regulation CAN-REG-000005
  - Supporting Document KC-000001
  - Supporting Document KC-000006
  - Supporting Document KC-000008
  - Supporting Document KC-000011
  - Supporting Document KC-000012
  - Supporting Document KC-000016
  - Supporting Document KC-000022
  - Supporting Document KC-000023
  - Supporting Document KC-000031
  - Supporting Document KC-000032
  - Supporting Document KC-000033
  - Supporting Document KC-000034
  - KC-000001 --contains--> Counterparty Credit Risk
  - KC-000006 --contains--> Counterparty Credit Risk
  - KC-000008 --contains--> Counterparty Credit Risk
  - KC-000011 --contains--> Counterparty Credit Risk
  - KC-000012 --contains--> Counterparty Credit Risk
  - KC-000016 --contains--> Counterparty Credit Risk
  - KC-000022 --contains--> Counterparty Credit Risk
  - KC-000023 --contains--> Counterparty Credit Risk

## RWA

- Result: PASS
- Canonical Concept: CAN-CON-000046 Risk Weighted Assets
- Evidence Records: EVD-000527, EVD-000528
- Source Documents: KC-000003, KC-000022
- Expected Retrieval Path:
  - Risk Weighted Assets
  - Canonical Concept CAN-CON-000046
  - Regulation CAN-REG-000001
  - Regulation CAN-REG-000002
  - Regulation CAN-REG-000004
  - Regulation CAN-REG-000005
  - Supporting Document KC-000003
  - Supporting Document KC-000022
  - KC-000003 --contains--> Risk Weighted Assets
  - Risk Weighted Assets --referenced_by--> KC-000003
  - Risk Weighted Assets --belongs_to--> Basel
  - Risk Weighted Assets --belongs_to--> Basel II
  - Risk Weighted Assets --belongs_to--> Basel III
  - Risk Weighted Assets --belongs_to--> Credit Risk
  - Risk Weighted Assets --belongs_to--> FRTB
  - Risk Weighted Assets --belongs_to--> Market Risk

