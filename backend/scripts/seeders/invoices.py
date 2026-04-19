import random
import uuid
from datetime import date, timedelta
from decimal import Decimal

from psycopg2.extras import execute_values

from .config import TAX_RATE

_PAYMENT_METHODS = ["cash", "credit_card", "debit_card", "bank_transfer", "check", "insurance"]
_PAYMENT_WEIGHTS = [40, 25, 15, 12, 5, 3]

# ICD-10 first-letter chapter → preferred service catalog codes
_CHAPTER_SERVICES = {
    "A": ["SRV-CONS-PEDIAT"],
    "B": ["SRV-CONS-PEDIAT"],
    "C": ["SRV-CONS-ONCO", "SRV-USG-ABD"],
    "D": ["SRV-CONS-ONCO", "SRV-USG-ABD"],
    "E": ["SRV-CONS-ENDO"],
    "F": ["SRV-CONS-PSIQ"],
    "G": ["SRV-CONS-NEURO"],
    "I": ["SRV-CONS-CARDIO", "SRV-ECG", "SRV-ECHO"],
    "J": ["SRV-RX-TORAX"],
    "K": ["SRV-CONS-GASTRO", "SRV-USG-ABD"],
    "L": ["SRV-CONS-ALERG"],
    "M": ["SRV-CONS-REUMA", "SRV-RX-LUMBAR"],
    "N": ["SRV-USG-ABD"],
}


def insert_invoices(conn, appt_info: list, policies_by_patient: dict, all_services: list, all_meds: list, dry_run: bool = False) -> None:
    print("\n[8/8] Inserting invoices, items, and payments...")
    cur = conn.cursor()

    completed = [a for a in appt_info if a["status"] == "completed"]
    to_invoice = completed[: int(len(completed) * 0.85)]
    print(f"    Invoicing {len(to_invoice)} of {len(completed)} completed appointments...")

    cur.execute("SELECT COALESCE(MAX(last_sequence), 0) FROM invoice_sequences WHERE year = %s", [date.today().year])
    last_seq = cur.fetchone()[0]
    cur.execute("SELECT MAX(CAST(NULLIF(SPLIT_PART(invoice_number, '-', 3), '') AS INTEGER)) FROM invoices WHERE invoice_number LIKE 'FAC-%'")
    max_num = cur.fetchone()[0] or 0
    seq = max(last_seq, max_num)

    cur.execute("SELECT id, code, name, price FROM services_catalog WHERE is_active = true")
    svc_rows = cur.fetchall()
    svc_lookup = {r[0]: (r[2], r[3]) for r in svc_rows}
    svc_by_code = {r[1]: r[0] for r in svc_rows}
    cur.execute("SELECT id, name, price FROM medications_catalog WHERE is_active = true")
    med_lookup = {r[0]: (r[1], r[2]) for r in cur.fetchall()}

    # Bulk-fetch diagnoses for correlation (one query, not N+1)
    invoice_appt_ids = [a["id"] for a in to_invoice]
    cur.execute("SELECT appointment_id, icd10_code FROM diagnoses WHERE appointment_id = ANY(%s::uuid[])", [invoice_appt_ids])
    appt_diagnoses: dict[str, list[str]] = {}
    for appt_id, code in cur.fetchall():
        appt_diagnoses.setdefault(appt_id, []).append(code)

    invoice_rows, item_rows, payment_rows = [], [], []

    for appt in to_invoice:
        seq += 1
        inv_id = str(uuid.uuid4())
        items = _build_items(svc_lookup, med_lookup, appt_diagnoses.get(appt["id"], []), svc_by_code)
        if not items:
            continue

        subtotal = sum(price * qty for _, _, _, _, qty, price in items)
        tax = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
        total = subtotal + tax

        pol_info = policies_by_patient.get(appt["patient_id"])
        policy_id, insurance_coverage = _apply_policy(pol_info, total)
        patient_responsibility = total - insurance_coverage

        status = random.choices(
            ["paid", "partial_paid", "pending", "overdue", "cancelled"],
            weights=[50, 20, 15, 10, 5],
            k=1,
        )[0]

        issue_date = appt["scheduled_at"].date()
        due_date = issue_date + timedelta(days=random.randint(15, 30))

        invoice_rows.append((
            inv_id, f"FAC-{seq:05d}", appt["patient_id"], appt["id"],
            policy_id, subtotal, tax, total, insurance_coverage, patient_responsibility,
            status, issue_date, due_date, None,
        ))

        for item_type, svc_id, med_id, desc, qty, price in items:
            item_subtotal = (price * qty).quantize(Decimal("0.01"))
            item_rows.append((str(uuid.uuid4()), inv_id, svc_id, med_id, item_type, desc, qty, price, item_subtotal))

        if status in ("paid", "partial_paid") and patient_responsibility > 0:
            payment_rows.extend(_build_payments(inv_id, patient_responsibility, status, issue_date, due_date))

    if dry_run:
        print(f"    DRY-RUN: Would insert {len(invoice_rows)} invoices, {len(item_rows)} items, {len(payment_rows)} payments.")
        return

    if invoice_rows:
        execute_values(cur, """
            INSERT INTO invoices (id, invoice_number, patient_id, appointment_id, insurance_policy_id,
                subtotal, tax, total, insurance_coverage, patient_responsibility, status, issue_date, due_date, notes)
            VALUES %s
        """, invoice_rows)
        conn.commit()
        print(f"    Inserted {len(invoice_rows)} invoices.")

    if item_rows:
        execute_values(cur, """
            INSERT INTO invoice_items (id, invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal)
            VALUES %s
        """, item_rows)
        conn.commit()
        print(f"    Inserted {len(item_rows)} invoice items.")

    if payment_rows:
        execute_values(cur, """
            INSERT INTO payments (id, invoice_id, amount, payment_method, reference_number, notes, payment_date)
            VALUES %s
        """, payment_rows)
        conn.commit()
        print(f"    Inserted {len(payment_rows)} payments.")

    cur.execute(
        "INSERT INTO invoice_sequences (year, last_sequence) VALUES (%s, %s) ON CONFLICT (year) DO UPDATE SET last_sequence = EXCLUDED.last_sequence",
        [date.today().year, seq],
    )
    conn.commit()
    print(f"    Updated invoice sequence to {seq}.")


def _build_items(svc_lookup: dict, med_lookup: dict, icd10_codes: list = None, svc_by_code: dict = None) -> list:
    n_items = random.choices([1, 2, 3, 4, 5], weights=[20, 35, 25, 15, 5], k=1)[0]
    items = []

    # First item: prefer a service correlated with the diagnosis (70% of the time)
    correlated_id = _correlated_service(icd10_codes, svc_lookup, svc_by_code)
    if correlated_id and random.random() < 0.70:
        name, price = svc_lookup[correlated_id]
        items.append(("service", correlated_id, None, name, 1, price))
        n_items -= 1

    for _ in range(n_items):
        if random.random() < 0.6 and svc_lookup:
            svc_id = random.choice(list(svc_lookup.keys()))
            name, price = svc_lookup[svc_id]
            qty = random.choices([1, 2, 3], weights=[70, 25, 5], k=1)[0]
            items.append(("service", svc_id, None, name, qty, price))
        elif med_lookup:
            med_id = random.choice(list(med_lookup.keys()))
            name, price = med_lookup[med_id]
            qty = random.choices([1, 2, 3, 5], weights=[50, 30, 15, 5], k=1)[0]
            items.append(("medication", None, med_id, name, qty, price))
    return items


def _correlated_service(icd10_codes: list, svc_lookup: dict, svc_by_code: dict):
    if not icd10_codes or not svc_by_code:
        return None
    chapter = icd10_codes[0][0].upper()
    preferred = [svc_by_code[c] for c in _CHAPTER_SERVICES.get(chapter, []) if c in svc_by_code and svc_by_code[c] in svc_lookup]
    return random.choice(preferred) if preferred else None


def _apply_policy(pol_info, total: Decimal) -> tuple:
    if not pol_info:
        return None, Decimal("0")
    pol_id, coverage_pct = pol_info
    if not coverage_pct or not pol_id:
        return None, Decimal("0")
    coverage = (total * Decimal(str(coverage_pct)) / Decimal("100")).quantize(Decimal("0.01"))
    return pol_id, coverage


def _build_payments(inv_id: str, patient_responsibility: Decimal, status: str, issue_date, due_date) -> list:
    payments = []
    if status == "paid":
        pay_amount = patient_responsibility
    else:
        pay_amount = (patient_responsibility * Decimal(str(random.uniform(0.3, 0.7)))).quantize(Decimal("0.01"))

    method = random.choices(_PAYMENT_METHODS, weights=_PAYMENT_WEIGHTS, k=1)[0]
    pay_date = issue_date + timedelta(days=random.randint(0, 30))
    ref = f"REF-{random.randint(100000, 999999)}" if random.random() < 0.3 else None
    payments.append((str(uuid.uuid4()), inv_id, pay_amount, method, ref, None, pay_date))

    if status == "partial_paid" and random.random() < 0.4:
        remaining = (patient_responsibility - pay_amount).quantize(Decimal("0.01"))
        if remaining > 0:
            pay2_method = random.choices(["cash", "credit_card", "bank_transfer"], weights=[40, 35, 25], k=1)[0]
            pay2_date = pay_date + timedelta(days=random.randint(10, 45))
            payments.append((str(uuid.uuid4()), inv_id, remaining, pay2_method, None, None, pay2_date))

    return payments
