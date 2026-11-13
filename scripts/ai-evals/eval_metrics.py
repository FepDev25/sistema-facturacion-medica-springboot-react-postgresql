"""Metricas puras para los evals de IA (sin red, sin dependencias externas).

Se usan desde scripts/ai-eval.py y se validan en CI con unittest. Mantener estas
funciones libres de HTTP permite probar el gate sin gastar cuota del proveedor.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Callable, Iterable


def normalize(value: object) -> str:
    """Normaliza texto para comparar entidades: minusculas, sin acentos ni puntuacion."""
    if value is None:
        return ""
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.casefold()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _first_key(entity: dict, fields: Iterable[str]) -> str:
    for field in fields:
        normalized = normalize(entity.get(field))
        if normalized:
            return normalized
    return ""


def diagnosis_key(entity: dict) -> str:
    # El codigo CIE-10 es la senal fuerte; la descripcion es el fallback.
    return _first_key(entity, ("icd10Code", "code", "description"))


def prescription_key(entity: dict) -> str:
    return _first_key(entity, ("medicationName", "name"))


def procedure_key(entity: dict) -> str:
    return _first_key(entity, ("procedureCode", "code", "description"))


def item_key(entity: dict) -> str:
    item_type = normalize(entity.get("itemType"))
    name = _first_key(entity, ("name",))
    return f"{item_type}|{name}" if item_type else name


def has_catalog_match(entity: dict) -> bool:
    return bool(
        entity.get("matchedMedicationId")
        or entity.get("matchedCatalogId")
        or entity.get("matched_catalog_id")
    )


def score_sets(expected: list[dict], returned: list[dict], key: Callable[[dict], str]) -> dict:
    """Precision/recall por conjuntos para un tipo de entidad."""
    expected_keys = [k for k in (key(item) for item in expected) if k]
    returned_keys = [k for k in (key(item) for item in returned) if k]

    expected_set = set(expected_keys)
    returned_set = set(returned_keys)
    true_positives = len(expected_set & returned_set)
    false_positives = len(returned_set - expected_set)
    false_negatives = len(expected_set - returned_set)

    precision = _safe_div(true_positives, true_positives + false_positives)
    recall = _safe_div(true_positives, true_positives + false_negatives)
    return {
        "expected": len(expected_set),
        "returned": len(returned_set),
        "truePositives": true_positives,
        "falsePositives": false_positives,
        "falseNegatives": false_negatives,
        "precision": precision,
        "recall": recall,
    }


def _safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _empty_totals() -> dict:
    return {"truePositives": 0, "falsePositives": 0, "falseNegatives": 0}


def _add_totals(target: dict, score: dict) -> None:
    for field in target:
        target[field] += score[field]


def _finalize(totals: dict, catalog_matched: int, catalog_returned: int) -> dict:
    precision = _safe_div(totals["truePositives"],
                          totals["truePositives"] + totals["falsePositives"])
    recall = _safe_div(totals["truePositives"],
                       totals["truePositives"] + totals["falseNegatives"])
    return {
        **totals,
        "precision": precision,
        "recall": recall,
        "falsePositiveRate": _safe_div(totals["falsePositives"],
                                       totals["truePositives"] + totals["falsePositives"]),
        "catalogAccuracy": _safe_div(catalog_matched, catalog_returned),
    }


def extraction_metrics(results: list[dict]) -> dict:
    """`results` contiene expected/returned por caso para diagnoses, prescriptions y procedures."""
    per_entity = {
        "diagnoses": _empty_totals(),
        "prescriptions": _empty_totals(),
        "procedures": _empty_totals(),
    }
    overall = _empty_totals()
    catalog_matched = 0
    catalog_returned = 0

    for case in results:
        expected = case.get("expected", {})
        returned = case.get("returned", {})
        for entity, key in (
            ("diagnoses", diagnosis_key),
            ("prescriptions", prescription_key),
            ("procedures", procedure_key),
        ):
            score = score_sets(expected.get(entity, []), returned.get(entity, []), key)
            _add_totals(per_entity[entity], score)
            _add_totals(overall, score)
            if entity == "prescriptions":
                catalog_returned += len(returned.get(entity, []))
                catalog_matched += sum(
                    1 for item in returned.get(entity, []) if has_catalog_match(item)
                )

    return {
        "overall": _finalize(overall, catalog_matched, catalog_returned),
        "byEntity": {entity: _finalize(totals, 0, 0) for entity, totals in per_entity.items()},
    }


def suggestion_metrics(results: list[dict]) -> dict:
    """`results` contiene expectedItems/returnedItems por caso."""
    overall = _empty_totals()
    per_type: dict[str, dict] = {}
    catalog_matched = 0
    catalog_returned = 0

    for case in results:
        expected = case.get("expectedItems", [])
        returned = case.get("returnedItems", [])
        score = score_sets(expected, returned, item_key)
        _add_totals(overall, score)
        catalog_returned += len(returned)
        catalog_matched += sum(1 for item in returned if has_catalog_match(item))

        for item_type in {normalize(item.get("itemType")) for item in expected + returned}:
            if not item_type:
                continue
            type_expected = [i for i in expected if normalize(i.get("itemType")) == item_type]
            type_returned = [i for i in returned if normalize(i.get("itemType")) == item_type]
            type_score = score_sets(type_expected, type_returned, item_key)
            bucket = per_type.setdefault(item_type, _empty_totals())
            _add_totals(bucket, type_score)

    return {
        "overall": _finalize(overall, catalog_matched, catalog_returned),
        "byItemType": {name: _finalize(totals, 0, 0) for name, totals in per_type.items()},
    }


def icd10_metrics(results: list[dict]) -> dict:
    total = max(len(results), 1)
    top1 = sum(1 for case in results if case.get("top1"))
    top3 = sum(1 for case in results if case.get("top3"))
    return {"top1": top1 / total, "top3": top3 / total}


def threshold_failures(feature: str, metrics: dict, thresholds: dict) -> list[str]:
    """Devuelve mensajes de las metricas que incumplen el umbral de la feature."""
    limits = thresholds.get("features", {}).get(feature, {})
    checks = {
        "minTop1": ("top1", lambda value, limit: value >= limit),
        "minTop3": ("top3", lambda value, limit: value >= limit),
        "minPrecision": ("overall.precision", lambda value, limit: value >= limit),
        "minRecall": ("overall.recall", lambda value, limit: value >= limit),
        "minCatalogAccuracy": ("overall.catalogAccuracy", lambda value, limit: value >= limit),
        "maxFalsePositiveRate": ("overall.falsePositiveRate", lambda value, limit: value <= limit),
    }

    failures: list[str] = []
    for limit_name, (metric_path, comparator) in checks.items():
        if limit_name not in limits:
            continue
        value = _metric(metrics, metric_path)
        limit = float(limits[limit_name])
        if not comparator(value, limit):
            failures.append(f"{limit_name}: {value:.1%} (limite {limit:.1%})")
    return failures


def _metric(metrics: dict, path: str) -> float:
    value: object = metrics
    for part in path.split("."):
        value = value.get(part, 0.0) if isinstance(value, dict) else 0.0
    return float(value)
