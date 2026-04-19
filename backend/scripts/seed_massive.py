#!/usr/bin/env python3
"""
Massive seed generator for SFM (Sistema de Facturacion Medica).

Usage:
    python seed_massive.py --db-url "postgresql://postgres:postgres@localhost:5432/sfm"
    python seed_massive.py --db-url "..." --dry-run
    python seed_massive.py --db-url "..." --clean
"""

import argparse
import random
import sys

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2-binary not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

from seeders.appointments import insert_appointments
from seeders.catalog import insert_catalog_items
from seeders.chronic_patients import insert_chronic_cohort
from seeders.db import load_existing_data, load_json
from seeders.insurance import insert_insurance_data
from seeders.invoices import insert_invoices
from seeders.medical_records import insert_medical_records
from seeders.patients import insert_patients
from seeders.users import insert_doctors, insert_system_users

random.seed(42)

_ORIGINAL_PATIENTS = [
    "a0000000-0000-0000-0000-000000000001", "a0000000-0000-0000-0000-000000000002",
    "a0000000-0000-0000-0000-000000000003", "a0000000-0000-0000-0000-000000000004",
    "a0000000-0000-0000-0000-000000000005", "a0000000-0000-0000-0000-000000000006",
    "a0000000-0000-0000-0000-000000000007", "a0000000-0000-0000-0000-000000000008",
    "a0000000-0000-0000-0000-000000000009", "a0000000-0000-0000-0000-000000000010",
]
_ORIGINAL_DOCTORS = [
    "b0000000-0000-0000-0000-000000000001", "b0000000-0000-0000-0000-000000000002",
    "b0000000-0000-0000-0000-000000000003", "b0000000-0000-0000-0000-000000000004",
    "b0000000-0000-0000-0000-000000000005", "b0000000-0000-0000-0000-000000000006",
]
_GENERATED_PROVIDER_CODES = ["GNP", "SATL", "QUAL", "AXA", "METL", "BNTE", "PRIM", "MAPF", "ZRCH", "ALNZ", "HDI", "LAS"]


def _clean(conn) -> None:
    print("[CLEAN] Removing previously generated massive data...")
    cur = conn.cursor()

    tables = ["invoice_items", "payments", "procedures", "prescriptions", "diagnoses",
              "medical_records", "invoices", "appointments", "insurance_policies", "patients"]
    for t in tables:
        cur.execute(f"ALTER TABLE {t} DISABLE TRIGGER ALL")
    conn.commit()
    print("    Disabled triggers.")

    orig_pat = ", ".join(f"'{p}'" for p in _ORIGINAL_PATIENTS)
    new_pat = f"(SELECT id FROM patients WHERE id NOT IN ({orig_pat}))"
    cur.execute(f"DELETE FROM payments WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN {new_pat})")
    cur.execute(f"DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN {new_pat})")
    cur.execute(f"DELETE FROM invoices WHERE patient_id IN {new_pat}")
    cur.execute(f"DELETE FROM procedures WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id IN {new_pat})")
    cur.execute(f"DELETE FROM prescriptions WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id IN {new_pat})")
    cur.execute(f"DELETE FROM diagnoses WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id IN {new_pat})")
    cur.execute(f"DELETE FROM medical_records WHERE appointment_id IN (SELECT id FROM appointments WHERE patient_id IN {new_pat})")
    cur.execute(f"DELETE FROM appointments WHERE patient_id IN {new_pat}")
    cur.execute(f"DELETE FROM insurance_policies WHERE patient_id IN {new_pat}")
    cur.execute(f"DELETE FROM patients WHERE id IN {new_pat}")

    orig_doc = ", ".join(f"'{d}'" for d in _ORIGINAL_DOCTORS)
    new_doc = f"(SELECT id FROM doctors WHERE id NOT IN ({orig_doc}))"
    cur.execute(f"DELETE FROM appointments WHERE doctor_id IN {new_doc}")
    cur.execute(f"DELETE FROM doctors WHERE id IN {new_doc}")
    cur.execute("DELETE FROM system_users WHERE username LIKE 'doctor%%' AND username NOT IN ('doctor1', 'doctor2')")

    codes = ", ".join(f"'{c}'" for c in _GENERATED_PROVIDER_CODES)
    cur.execute(f"DELETE FROM insurance_providers WHERE code IN ({codes})")

    for t in reversed(tables):
        cur.execute(f"ALTER TABLE {t} ENABLE TRIGGER ALL")
    conn.commit()
    print("    Clean complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="SFM Massive Seed Generator")
    parser.add_argument("--db-url", required=True, help="PostgreSQL connection string")
    parser.add_argument("--dry-run", action="store_true", help="Print counts without inserting")
    parser.add_argument("--clean", action="store_true", help="Remove generated data before inserting")
    args = parser.parse_args()

    print("=" * 60)
    print("SFM Massive Seed Generator")
    print("=" * 60)
    if args.dry_run:
        print("MODE: DRY-RUN (no data will be inserted)")
    print(f"DB: {args.db_url.split('@')[-1] if '@' in args.db_url else args.db_url}")
    print()

    conn = psycopg2.connect(args.db_url)
    conn.autocommit = False

    if args.clean:
        _clean(conn)

    try:
        data = load_existing_data(conn)
        print(f"  Existing: {len(data['existing_patients'])} patients, "
              f"{len(data['active_doctors'])} active doctors, "
              f"{len(data['existing_services'])} services, "
              f"{len(data['existing_medications'])} medications")

        user_map = insert_system_users(conn, dry_run=args.dry_run)
        insert_doctors(conn, user_map, dry_run=args.dry_run)

        data = load_existing_data(conn)
        new_patient_ids = insert_patients(conn, 1000, dry_run=args.dry_run)

        icd10_data = load_json("icd10_codes.json")
        templates = load_json("clinical_templates.json")
        try:
            note_templates = load_json("clinical_note_templates_rich.json")
            print("  Rich note templates loaded.")
        except FileNotFoundError:
            note_templates = None
            print("  NOTE: clinical_note_templates_rich.json not found, using basic templates.")

        policies = insert_insurance_data(conn, new_patient_ids, data, dry_run=args.dry_run)
        data = load_existing_data(conn)
        all_services, all_meds = insert_catalog_items(conn, data, dry_run=args.dry_run)

        data = load_existing_data(conn)
        data["existing_medications"] = all_meds
        data["existing_services"] = all_services

        appt_info = insert_appointments(conn, 5000, data, dry_run=args.dry_run)
        _, chronic_appt_info = insert_chronic_cohort(conn, data, dry_run=args.dry_run)
        all_appt_info = appt_info + chronic_appt_info

        insert_medical_records(conn, all_appt_info, icd10_data, templates, data, dry_run=args.dry_run, note_templates=note_templates)
        insert_invoices(conn, all_appt_info, policies, all_services, all_meds, dry_run=args.dry_run)

        print("\n" + "=" * 60)
        print("SEED GENERATION COMPLETE")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
