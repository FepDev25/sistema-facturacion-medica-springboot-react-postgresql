import random
import uuid

from psycopg2.extras import execute_values

from .config import DOSAGE_TEMPLATES, FREQUENCY_TEMPLATES, INSTRUCTION_TEMPLATES
from .db import load_json
from .generators import generate_clinical_note, generate_physical_exam, generate_vital_signs, weighted_icd10


def insert_medical_records(conn, appt_info: list, icd10_data: list, templates: dict, data: dict, dry_run: bool = False, note_templates: dict = None) -> None:
    print("\n[7/8] Inserting medical records, diagnoses, prescriptions, and procedures...")
    cur = conn.cursor()

    completed = [a for a in appt_info if a["status"] == "completed"]
    print(f"    Processing {len(completed)} completed appointments...")

    procedures_data = load_json("procedures.json")
    all_meds = data["existing_medications"]

    cur.execute("SELECT id, name FROM medications_catalog WHERE is_active = true")
    med_name_map = {r[0]: r[1] for r in cur.fetchall()}

    mr_rows, diag_rows, presc_rows, proc_rows = [], [], [], []

    for appt in completed:
        mr_id = str(uuid.uuid4())
        patient_age = 35

        icd_entry = weighted_icd10(icd10_data)
        severity = random.choices(["mild", "moderate", "severe", "critical"], weights=[55, 28, 13, 4], k=1)[0]

        # Select medications first so note can embed real drug names
        selected_meds = []
        treatment_plan_text = None
        if random.random() < 0.80:
            n_rx = random.choices([1, 2, 3, 4], weights=[50, 30, 15, 5], k=1)[0]
            selected_meds = random.sample(all_meds, min(n_rx, len(all_meds)))
            names = [med_name_map.get(mid, mid) for mid in selected_meds[:2]]
            treatment_plan_text = ", ".join(names)

        mr_rows.append((
            mr_id,
            appt["patient_id"],
            appt["id"],
            generate_vital_signs(patient_age),
            generate_physical_exam(appt["specialty"], templates),
            generate_clinical_note(
                appt["specialty"], appt["chief_complaint"], patient_age,
                templates, icd_entry, appt["days_ago"],
                note_templates=note_templates,
                treatment_plan=treatment_plan_text,
            ),
            appt["scheduled_at"],
        ))

        for d in range(random.choices([1, 2, 3], weights=[60, 30, 10], k=1)[0]):
            code = icd_entry if d == 0 else weighted_icd10(icd10_data)
            diag_rows.append((
                str(uuid.uuid4()), appt["id"], mr_id,
                code["code"], code["description"], severity, appt["scheduled_at"],
            ))

        for med_id in selected_meds:
            presc_rows.append((
                str(uuid.uuid4()), appt["id"], mr_id, med_id,
                random.choice(DOSAGE_TEMPLATES),
                random.choice(FREQUENCY_TEMPLATES),
                random.randint(3, 30),
                random.choice(INSTRUCTION_TEMPLATES),
            ))

        if random.random() < 0.40:
            n_proc = random.choices([1, 2], weights=[80, 20], k=1)[0]
            for proc in random.sample(procedures_data, min(n_proc, len(procedures_data))):
                proc_rows.append((
                    str(uuid.uuid4()), appt["id"], mr_id,
                    proc["code"], proc["description"],
                    "Procedimiento realizado durante la consulta" if random.random() < 0.5 else None,
                    appt["scheduled_at"],
                ))

    if dry_run:
        print(f"    DRY-RUN: Would insert {len(mr_rows)} records, {len(diag_rows)} diagnoses, "
              f"{len(presc_rows)} prescriptions, {len(proc_rows)} procedures.")
        return

    if mr_rows:
        execute_values(cur, "INSERT INTO medical_records (id, patient_id, appointment_id, vital_signs, physical_exam, clinical_notes, record_date) VALUES %s", mr_rows)
        conn.commit()
        print(f"    Inserted {len(mr_rows)} medical records.")

    if diag_rows:
        execute_values(cur, "INSERT INTO diagnoses (id, appointment_id, medical_record_id, icd10_code, description, severity, diagnosed_at) VALUES %s", diag_rows)
        conn.commit()
        print(f"    Inserted {len(diag_rows)} diagnoses.")

    if presc_rows:
        execute_values(cur, "INSERT INTO prescriptions (id, appointment_id, medical_record_id, medication_id, dosage, frequency, duration_days, instructions) VALUES %s", presc_rows)
        conn.commit()
        print(f"    Inserted {len(presc_rows)} prescriptions.")

    if proc_rows:
        execute_values(cur, "INSERT INTO procedures (id, appointment_id, medical_record_id, procedure_code, description, notes, performed_at) VALUES %s", proc_rows)
        conn.commit()
        print(f"    Inserted {len(proc_rows)} procedures.")
