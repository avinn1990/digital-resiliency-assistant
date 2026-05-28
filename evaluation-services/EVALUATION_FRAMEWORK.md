# Evaluation framework (all services)

Shared rubric and scoring rules for every folder under `evaluation-services/`.

## Per-capability dimensions

Each capability is scored on five dimensions:

| Dimension | 0 | 1 | 2 | Max |
|-----------|---|---|---|-----|
| Documented | None | Informal | Documented | 2 |
| Implemented | No adoption | Partial | Enterprise-wide | 2 |
| Automatable | Not at all | Partial | Enterprise-wide | 2 |
| Integrated | Siloed / cannot integrate | Well integrated | — | 1 |
| Monitored | Cannot observe | Observed, not measured | Well measured | 2 |

**Raw capability score:** sum of the five dimension scores (max **9** per capability).

## Resiliency weights

- Each capability has a `resiliency_weight` in `capabilities.json` (relevance to resiliency).
- **Weighted rollup:**  
  `(Σ actualᵢ × weightᵢ) / (Σ maxᵢ × weightᵢ) × 5`  
  where `maxᵢ = 9` unless a capability defines a different max.
- **New service:** ask the stakeholder for weights for every capability before scoring or publishing the service pack.
- **Information Security Strategy and Planning:** all capabilities use **weight 1**.

## Pillar alignment

Tag each capability to one of: **Strategy**, **People**, **Process/Service**, **Technology**.

Report normalized scores per pillar using the same formula, restricted to capabilities in that pillar.

Some services may have **no Technology capabilities**; in those cases, do not compute or report a Technology pillar score.

## Normalized score (scale of 5)

For any rollup (overall, service, or pillar):

```
normalized = (sum of actual scores) / (sum of max scores) × 5
```

With weights:

```
normalized = (sum of actual × weight) / (sum of max × weight) × 5
```

Example: Process pillar with two groups scoring 5/10 and 45/118 → `(5+45)/(10+118) × 5`.

## Service content layout

Each service directory should include:

| File | Purpose |
|------|---------|
| `capabilities.json` | Capabilities, `resiliency_weight`, evaluation metadata |
| `reference-questions.json` | Questions per capability |
| `validate_evaluation_content.py` | Sync and weight validation |
