#!/usr/bin/env python3
"""Eval harness para los asistentes de IA.

Uso basico contra local:
    python3 scripts/ai-eval.py --username admin --password admin123

Contra produccion:
    AI_EVAL_TOKEN=... python3 scripts/ai-eval.py \
        --base-url https://sfm-backend-fepdev-a04e4eeac708.herokuapp.com

Mide top-1 y top-3 para la sugerencia CIE-10 y falla (exit 1) si baja de los
umbrales configurados. Pensado como gate manual antes de un release; no corre
en CI por defecto porque consume cuota real del proveedor de IA.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request


def post(base_url: str, path: str, body: dict | None, token: str | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(base_url.rstrip("/") + path, data=data, method="POST")
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read().decode()
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode()
        try:
            return error.code, json.loads(raw)
        except json.JSONDecodeError:
            return error.code, {"raw": raw}


def login(base_url: str, username: str, password: str) -> str:
    status, payload = post(base_url, "/api/v1/auth/login", {"username": username, "password": password})
    if status != 200 or not payload.get("accessToken"):
        raise SystemExit(f"No se pudo autenticar ({status}): {payload}")
    return payload["accessToken"]


def evaluate_icd10(base_url: str, token: str, dataset: dict, pause: float) -> tuple[float, float, list[dict]]:
    rows: list[dict] = []
    top1_hits = 0
    top3_hits = 0
    cases = dataset.get("cases", [])

    for case in cases:
        status, payload = post(base_url, "/api/v1/ai/icd10/suggest", {"query": case["query"]}, token)
        codes = [item.get("code") for item in payload.get("suggestions", [])] if status == 200 else []
        top1 = bool(codes) and codes[0] in case["expectedTop1"]
        top3 = any(code in case["expectedTop3"] for code in codes[:3])
        top1_hits += int(top1)
        top3_hits += int(top3)
        rows.append({
            "id": case["id"],
            "status": status,
            "returned": codes[:3],
            "expected_top1": case["expectedTop1"],
            "expected_top3": case["expectedTop3"],
            "top1": top1,
            "top3": top3,
        })
        time.sleep(pause)

    total = max(len(cases), 1)
    return top1_hits / total, top3_hits / total, rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Eval de los asistentes de IA")
    parser.add_argument("--base-url", default=os.getenv("AI_EVAL_BASE_URL", "http://localhost:8080"))
    parser.add_argument("--username", default=os.getenv("AI_EVAL_USER", "admin"))
    parser.add_argument("--password", default=os.getenv("AI_EVAL_PASS", "admin123"))
    parser.add_argument("--token", default=os.getenv("AI_EVAL_TOKEN"))
    parser.add_argument(
        "--dataset",
        default=os.path.join(os.path.dirname(__file__), "ai-evals", "icd10-golden.json"),
    )
    parser.add_argument("--min-top1", type=float, default=0.6)
    parser.add_argument("--min-top3", type=float, default=0.8)
    parser.add_argument("--pause", type=float, default=0.5, help="Segundos entre casos")
    args = parser.parse_args()

    with open(args.dataset, encoding="utf-8") as handle:
        dataset = json.load(handle)

    token = args.token or login(args.base_url, args.username, args.password)
    top1, top3, rows = evaluate_icd10(args.base_url, token, dataset, args.pause)

    print(f"{'caso':28} {'top1':6} {'top3':6} retornados")
    for row in rows:
        print(f"{row['id']:28} {str(row['top1']):6} {str(row['top3']):6} {', '.join(row['returned']) or '-'}")

    print(f"\nTop-1: {top1:.1%} (min {args.min_top1:.0%})")
    print(f"Top-3: {top3:.1%} (min {args.min_top3:.0%})")

    if top1 < args.min_top1 or top3 < args.min_top3:
        print("EVAL FALLIDA: la calidad quedo por debajo del umbral.", file=sys.stderr)
        return 1

    print("EVAL OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
