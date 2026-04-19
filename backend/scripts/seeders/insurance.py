import random
import uuid
from datetime import date, timedelta
from decimal import Decimal

from psycopg2.extras import execute_values

from .config import COVERAGE_PERCENTAGES, INSURANCE_PROVIDERS
from .db import load_existing_data
from .generators import generate_address, generate_phone


def insert_insurance_data(conn, new_patient_ids: list, data: dict, dry_run: bool = False) -> dict:
    print("\n[4/8] Inserting insurance providers and policies...")
    cur = conn.cursor()

    existing_prov = load_existing_data(conn)["existing_providers"]
    new_provider_ids = _insert_providers(cur, conn, existing_prov, dry_run)
    all_provider_ids = list(existing_prov) + [p[0] for p in new_provider_ids]

    existing_pol_numbers = load_existing_data(conn)["existing_policy_numbers"]
    policies_by_patient = _insert_policies(cur, conn, new_patient_ids, all_provider_ids, existing_pol_numbers, dry_run)

    return policies_by_patient


def _insert_providers(cur, conn, existing_prov: set, dry_run: bool) -> list:
    new_providers = []
    for name, code, is_active in INSURANCE_PROVIDERS:
        pid = str(uuid.uuid4())
        new_providers.append((
            pid, name, code,
            generate_phone(),
            f"{code.lower()}@seguros.com",
            generate_address(),
            is_active,
        ))

    if dry_run:
        print(f"    DRY-RUN: Would insert {len(new_providers)} insurance providers.")
        return [(p[0], p[1], p[2], p[6]) for p in new_providers]

    execute_values(
        cur,
        "INSERT INTO insurance_providers (id, name, code, phone, email, address, is_active) VALUES %s",
        new_providers,
    )
    conn.commit()
    print(f"    Inserted {len(new_providers)} insurance providers.")
    return [(p[0], p[1], p[2], p[6]) for p in new_providers]


def _insert_policies(cur, conn, patient_ids: list, provider_ids: list, existing_pol_numbers: set, dry_run: bool) -> dict:
    used_pol_nums = set(existing_pol_numbers)
    policy_rows = []
    policies_by_patient = {}

    for patient_id in patient_ids:
        if random.random() >= 0.40:
            continue

        provider_id = random.choice(provider_ids)
        coverage = random.choice(COVERAGE_PERCENTAGES)
        deductible = random.choice([0, 200, 500, 1000]) if coverage < 100 else 0
        is_active = random.random() < 0.85

        start = date.today() - timedelta(days=random.randint(180, 730))
        end = (date.today() + timedelta(days=random.randint(30, 365))) if is_active else (start + timedelta(days=random.randint(365, 730)))

        pol_id = str(uuid.uuid4())
        pol_num = _unique_policy_number(used_pol_nums)
        policy_rows.append((pol_id, patient_id, provider_id, pol_num, coverage, Decimal(str(deductible)), start, end, is_active))
        policies_by_patient[patient_id] = (pol_id, coverage if is_active else None)

        if random.random() < 0.05:
            others = [p for p in provider_ids if p != provider_id]
            if others:
                pol_id2 = str(uuid.uuid4())
                pol_num2 = _unique_policy_number(used_pol_nums)
                cov2 = random.choice([50, 60, 70, 80])
                policy_rows.append((pol_id2, patient_id, random.choice(others), pol_num2, cov2, 0, start, end, is_active))

    if dry_run:
        print(f"    DRY-RUN: Would insert {len(policy_rows)} insurance policies.")
        return policies_by_patient

    execute_values(
        cur,
        """
        INSERT INTO insurance_policies (id, patient_id, provider_id, policy_number, coverage_percentage, deductible, start_date, end_date, is_active)
        VALUES %s
        """,
        policy_rows,
    )
    conn.commit()
    print(f"    Inserted {len(policy_rows)} insurance policies.")
    return policies_by_patient


def _unique_policy_number(used: set) -> str:
    while True:
        n = f"POL-{random.randint(100000, 999999)}"
        if n not in used:
            used.add(n)
            return n
