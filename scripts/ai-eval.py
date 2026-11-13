#!/usr/bin/env python3
"""Eval harness de los asistentes de IA (gate manual de release).

Uso local:
    python3 scripts/ai-eval.py --feature icd10 --username admin --password admin123
    python3 scripts/ai-eval.py --feature extraction
    AI_EVAL_INVOICE_HTA=<uuid> AI_EVAL_INVOICE_FARINGITIS=<uuid> \
        python3 scripts/ai-eval.py --feature suggestion
    python3 scripts/ai-eval.py --feature all          # gate completo

Contra produccion:
    AI_EVAL_BASE_URL=https://... AI_EVAL_USER=... AI_EVAL_PASS=... \
        python3 scripts/ai-eval.py --feature all

Reglas:
- La autenticacion usa cookies httpOnly (sfm_access/sfm_refresh), no bearer tokens.
- Los evals consumen cuota real. NO corren en CI; el calculo de metricas si se
  prueba offline en CI con scripts/ai-evals/test_eval_metrics.py.
- Los umbrales viven en backend/src/main/resources/ai-evals/thresholds.json.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "ai-evals"))

import eval_metrics as metrics  # noqa: E402

SCRIPTS_DIR = Path(__file__).resolve().parent
DEFAULT_THRESHOLDS = SCRIPTS_DIR.parent / "backend/src/main/resources/ai-evals/thresholds.json"
DATASETS = {
    "icd10": SCRIPTS_DIR / "ai-evals/icd10-golden.json",
    "extraction": SCRIPTS_DIR / "ai-evals/extraction-golden.json",
    "suggestion": SCRIPTS_DIR / "ai-evals/suggestion-golden.json",
}

COOKIE_JAR = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(COOKIE_JAR))


def post(base_url: str, path: str, body: dict | None) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(base_url.rstrip("/") + path, data=data, method="POST")
    request.add_header("Content-Type", "application/json")

    try:
        with OPENER.open(request, timeout=120) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            return error.code, json.loads(raw)
        except json.JSONDecodeError:
            return error.code, {"raw": raw}


def login(base_url: str, username: str, password: str, token: str | None) -> None:
    if token:
        COOKIE_JAR.set_cookie(http.cookiejar.Cookie(
            version=0, name="sfm_access", value=token, port=None, port_specified=False,
            domain=urllib.parse.urlparse(base_url).hostname or "localhost",
            domain_specified=False, domain_initial_dot=False, path="/api", path_specified=True,
            secure=base_url.startswith("https"), expires=None, discard=True, comment=None,
            comment_url=None, rest={}, rfc2109=False))
        return

    status, payload = post(base_url, "/api/v1/auth/login",
                           {"username": username, "password": password})
    if status != 200:
        raise SystemExit(f"No se pudo autenticar ({status}): {payload}")


def resolve_placeholders(value: object) -> object:
    if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
        name = value[2:-1]
        resolved = os.getenv(name)
        if not resolved:
            raise SystemExit(
                f"Falta la variable de entorno {name} para resolver '{value}'. "
                "Crea el escenario local y exporta el UUID de la factura.")
        return resolved
    if isinstance(value, dict):
        return {key: resolve_placeholders(item) for key, item in value.items()}
    if isinstance(value, list):
        return [resolve_placeholders(item) for item in value]
    return value


def evaluate_icd10(base_url: str, dataset: dict, pause: float) -> tuple[dict, list[dict]]:
    rows: list[dict] = []
    for case in dataset.get("cases", []):
        status, payload = post(base_url, "/api/v1/ai/icd10/suggest", {"query": case["query"]})
        codes = [item.get("code") for item in payload.get("suggestions", [])] if status == 200 else []
        top1 = bool(codes) and codes[0] in case["expectedTop1"]
        top3 = any(code in case["expectedTop3"] for code in codes[:3])
        rows.append({
            "id": case["id"], "status": status, "returned": codes[:3],
            "top1": top1, "top3": top3,
        })
        time.sleep(pause)
    return metrics.icd10_metrics(rows), rows


def evaluate_extraction(base_url: str, dataset: dict, pause: float) -> tuple[dict, list[dict]]:
    results: list[dict] = []
    rows: list[dict] = []
    for case in dataset.get("cases", []):
        request = resolve_placeholders(case["request"])
        status, payload = post(base_url, "/api/v1/ai/records/extract", request)
        returned = {
            "diagnoses": payload.get("diagnoses", []) if status == 200 else [],
            "prescriptions": payload.get("prescriptions", []) if status == 200 else [],
            "procedures": payload.get("procedures", []) if status == 200 else [],
        }
        results.append({"expected": case["expected"], "returned": returned})
        rows.append({
            "id": case["id"], "status": status,
            "diagnoses": len(returned["diagnoses"]),
            "prescriptions": len(returned["prescriptions"]),
            "procedures": len(returned["procedures"]),
        })
        time.sleep(pause)
    return metrics.extraction_metrics(results), rows


def evaluate_suggestion(base_url: str, dataset: dict, pause: float) -> tuple[dict, list[dict]]:
    results: list[dict] = []
    rows: list[dict] = []
    for case in dataset.get("cases", []):
        invoice_id = resolve_placeholders(case["invoiceId"])
        status, payload = post(base_url, f"/api/v1/ai/invoices/{invoice_id}/suggest-items", None)
        returned = payload.get("suggestedItems", []) if status == 200 else []
        results.append({"expectedItems": case["expectedItems"], "returnedItems": returned})
        rows.append({"id": case["id"], "status": status, "returned": len(returned)})
        time.sleep(pause)
    return metrics.suggestion_metrics(results), rows


def print_icd10(rows: list[dict], result: dict) -> None:
    print(f"{'caso':28} {'top1':6} {'top3':6} retornados")
    for row in rows:
        print(f"{row['id']:28} {str(row['top1']):6} {str(row['top3']):6} "
              f"{', '.join(row['returned']) or '-'}")
    print(f"\nTop-1: {result['top1']:.1%} | Top-3: {result['top3']:.1%}")


def print_entity_metrics(title: str, result: dict, entity_key: str) -> None:
    overall = result["overall"]
    print(f"\n{title}: precision {overall['precision']:.1%} | recall {overall['recall']:.1%} "
          f"| catalogo {overall['catalogAccuracy']:.1%} "
          f"| falsos positivos {overall['falsePositiveRate']:.1%}")
    for name, values in result[entity_key].items():
        print(f"  {name:16} P {values['precision']:.1%}  R {values['recall']:.1%} "
              f"TP {values['truePositives']} FP {values['falsePositives']} "
              f"FN {values['falseNegatives']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Eval de los asistentes de IA")
    parser.add_argument("--base-url", default=os.getenv("AI_EVAL_BASE_URL", "http://localhost:8080"))
    parser.add_argument("--username", default=os.getenv("AI_EVAL_USER", "admin"))
    parser.add_argument("--password", default=os.getenv("AI_EVAL_PASS", "admin123"))
    parser.add_argument("--token", default=os.getenv("AI_EVAL_TOKEN"),
                        help="Cookie sfm_access ya emitida (alternativa a usuario/password)")
    parser.add_argument("--feature", choices=["all", "icd10", "extraction", "suggestion"],
                        default="icd10")
    parser.add_argument("--dataset", help="Dataset explicito (JSON)")
    parser.add_argument("--thresholds", default=str(DEFAULT_THRESHOLDS))
    parser.add_argument("--pause", type=float, default=0.5, help="Segundos entre casos")
    args = parser.parse_args()

    with open(args.thresholds, encoding="utf-8") as handle:
        thresholds = json.load(handle)

    features = ["icd10", "extraction", "suggestion"] if args.feature == "all" else [args.feature]
    login(args.base_url, args.username, args.password, args.token)

    failures: list[str] = []
    for feature in features:
        dataset_path = Path(args.dataset) if args.dataset else DATASETS[feature]
        with open(dataset_path, encoding="utf-8") as handle:
            dataset = json.load(handle)

        if feature == "icd10":
            result, rows = evaluate_icd10(args.base_url, dataset, args.pause)
            print_icd10(rows, result)
        elif feature == "extraction":
            result, rows = evaluate_extraction(args.base_url, dataset, args.pause)
            print_entity_metrics("Extraccion", result, "byEntity")
        else:
            result, rows = evaluate_suggestion(args.base_url, dataset, args.pause)
            print_entity_metrics("Sugerencia de items", result, "byItemType")

        feature_failures = metrics.threshold_failures(feature, result, thresholds)
        if feature_failures:
            failures.extend(f"{feature}: {failure}" for failure in feature_failures)
        print(f"[{feature}] {'OK' if not feature_failures else 'FALLA'}")

    if failures:
        print("\nEVAL FALLIDA: la calidad quedo por debajo del umbral.", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1

    print("\nEVAL OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
