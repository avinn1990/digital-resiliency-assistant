from typing import Any


def score_control(control: dict, facts: dict) -> dict:
    """Score a single control from extracted facts (rule-based; extend as needed)."""
    questions = control.get("questions", [])
    if not questions:
        return {
            "control_id": control["id"],
            "score": 0,
            "status": "unknown",
            "evidence": "No questions defined for control",
            "recommendations": [],
        }

    scores: list[float] = []
    evidence_parts: list[str] = []
    recommendations: list[str] = []

    for question in questions:
        key = question["field_key"]
        value = facts.get(key)
        response_type = question.get("response_type", "text")

        if value is None:
            scores.append(0)
            recommendations.append(f"Provide information for: {question['prompt']}")
            continue

        evidence_parts.append(f"{key}={value!r}")

        if response_type == "boolean":
            scores.append(100.0 if value else 25.0)
            if not value:
                recommendations.append(
                    f"Address gap: {control.get('title', control['id'])}"
                )
        elif response_type == "number":
            try:
                hours = float(value)
                if hours <= 4:
                    scores.append(95.0)
                elif hours <= 24:
                    scores.append(70.0)
                else:
                    scores.append(45.0)
                    recommendations.append("Consider lowering RTO for critical services")
            except (TypeError, ValueError):
                scores.append(40.0)
        else:
            text = str(value)
            if len(text) >= 20:
                scores.append(80.0)
            elif len(text) >= 5:
                scores.append(55.0)
            else:
                scores.append(30.0)
                recommendations.append(f"Add more detail for: {question['prompt']}")

    avg = sum(scores) / len(scores) if scores else 0
    if avg >= 75:
        status = "met"
    elif avg >= 50:
        status = "partial"
    elif avg > 0:
        status = "gap"
    else:
        status = "unknown"

    return {
        "control_id": control["id"],
        "score": round(avg, 1),
        "status": status,
        "evidence": "; ".join(evidence_parts) or "No evidence captured",
        "recommendations": recommendations,
    }


def run_assessment(framework: dict, facts: dict) -> dict:
    control_results: list[dict] = []
    weights: list[float] = []
    weighted_scores: list[float] = []

    for domain in framework.get("domains", []):
        for control in domain.get("controls", []):
            result = score_control(control, facts)
            control_results.append(result)
            weight = float(control.get("weight", 1.0))
            weights.append(weight)
            weighted_scores.append(result["score"] * weight)

    total_weight = sum(weights) or 1.0
    overall = sum(weighted_scores) / total_weight

    if overall >= 80:
        maturity = "Managed"
    elif overall >= 60:
        maturity = "Developing"
    elif overall >= 40:
        maturity = "Emerging"
    else:
        maturity = "Initial"

    gaps = [r for r in control_results if r["status"] in ("gap", "partial", "unknown")]
    summary = (
        f"Assessed {len(control_results)} controls across framework "
        f"'{framework['name']}'. {len(gaps)} area(s) need attention."
    )

    return {
        "framework_id": framework["id"],
        "overall_score": round(overall, 1),
        "maturity_label": maturity,
        "control_results": control_results,
        "summary": summary,
    }
