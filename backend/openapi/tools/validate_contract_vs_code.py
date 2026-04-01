#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[2]
SPEC_PATH = ROOT / "openapi" / "openapi.yaml"
CONTROLLERS_GLOB = "src/main/java/com/fepdev/sfm/backend/domain/**/*Controller.java"


def fail(msg: str) -> None:
    print(f"ERROR: {msg}")
    sys.exit(1)


def extract_path(args: str | None) -> str:
    if not args:
        return ""
    m = re.search(r'"([^"]+)"', args)
    return m.group(1) if m else ""


def normalize(base: str, sub: str) -> str:
    if not base:
        base = ""
    if not sub:
        path = base
    elif sub.startswith("/"):
        path = f"{base}{sub}"
    else:
        path = f"{base}/{sub}"
    path = re.sub(r"//+", "/", path)
    if not path.startswith("/"):
        path = "/" + path
    return path


def extract_controller_ops(file_path: Path) -> set[tuple[str, str]]:
    text = file_path.read_text(encoding="utf-8")

    class_base = ""
    class_rm = re.search(r"@RequestMapping\(([^)]*)\)\s*public class", text, re.S)
    if class_rm:
        class_base = extract_path(class_rm.group(1))

    pattern = re.compile(
        r"@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)(?:\(([^)]*)\))?"
    )
    out: set[tuple[str, str]] = set()
    for m in pattern.finditer(text):
        ann = m.group(1)
        args = m.group(2)
        method = ann.replace("Mapping", "").upper()
        sub_path = extract_path(args)
        out.add((method, normalize(class_base, sub_path)))
    return out


def collect_code_ops() -> set[tuple[str, str]]:
    ops: set[tuple[str, str]] = set()
    for file_path in ROOT.glob(CONTROLLERS_GLOB):
        ops |= extract_controller_ops(file_path)
    return ops


def collect_spec_ops() -> set[tuple[str, str]]:
    spec = yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))
    ops: set[tuple[str, str]] = set()
    for path, item in (spec.get("paths") or {}).items():
        if not isinstance(item, dict):
            continue
        for method in item.keys():
            m = method.upper()
            if m in {"GET", "POST", "PUT", "DELETE", "PATCH"}:
                ops.add((m, path))
    return ops


def main() -> None:
    code_ops = collect_code_ops()
    spec_ops = collect_spec_ops()

    missing_in_spec = sorted(code_ops - spec_ops)
    missing_in_code = sorted(spec_ops - code_ops)

    if missing_in_spec:
        print("ERROR: Endpoints en codigo que faltan en OpenAPI:")
        for method, path in missing_in_spec:
            print(f"- {method} {path}")
        sys.exit(1)

    if missing_in_code:
        print("ERROR: Endpoints en OpenAPI que no existen en codigo:")
        for method, path in missing_in_code:
            print(f"- {method} {path}")
        sys.exit(1)

    print("OK: contrato OpenAPI coincide con endpoints de controllers")
    print(f"- Operaciones en codigo: {len(code_ops)}")
    print(f"- Operaciones en OpenAPI: {len(spec_ops)}")


if __name__ == "__main__":
    main()
