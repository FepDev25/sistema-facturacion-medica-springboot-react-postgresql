import json
import os

SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")


def load_json(filename: str):
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_existing_data(conn: object) -> dict:
    print("  Loading existing data...")
    cur = conn.cursor()

    cur.execute("SELECT id FROM patients")
    existing_patients = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT id, specialty, is_active FROM doctors")
    existing_doctors = cur.fetchall()

    cur.execute("SELECT id FROM insurance_providers")
    existing_providers = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT id FROM services_catalog WHERE is_active = true")
    existing_services = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT id FROM medications_catalog WHERE is_active = true")
    existing_medications = {r[0] for r in cur.fetchall()}

    cur.execute(
        "SELECT patient_id, id, coverage_percentage, is_active FROM insurance_policies"
    )
    existing_policies = cur.fetchall()

    cur.execute(
        "SELECT COALESCE(MAX(last_sequence), 0) FROM invoice_sequences WHERE year = %s",
        [__import__("datetime").date.today().year],
    )
    last_seq = cur.fetchone()[0]

    cur.execute("SELECT username FROM system_users")
    existing_usernames = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT license_number FROM doctors")
    existing_licenses = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT policy_number FROM insurance_policies")
    existing_policy_numbers = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT code FROM insurance_providers")
    existing_provider_codes = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT code FROM services_catalog")
    existing_service_codes = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT code FROM medications_catalog")
    existing_med_codes = {r[0] for r in cur.fetchall()}

    cur.close()

    active_doctors = [(did, spec) for did, spec, active in existing_doctors if active]
    patient_policy_map = {}
    for pid, polid, cov, is_act in existing_policies:
        patient_policy_map.setdefault(pid, []).append((polid, cov, is_act))

    return {
        "existing_patients": existing_patients,
        "active_doctors": active_doctors,
        "existing_providers": existing_providers,
        "existing_services": list(existing_services),
        "existing_medications": list(existing_medications),
        "patient_policy_map": patient_policy_map,
        "last_seq": last_seq,
        "existing_usernames": existing_usernames,
        "existing_licenses": existing_licenses,
        "existing_policy_numbers": existing_policy_numbers,
        "existing_provider_codes": existing_provider_codes,
        "existing_service_codes": existing_service_codes,
        "existing_med_codes": existing_med_codes,
    }
