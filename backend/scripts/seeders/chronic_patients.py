import random
import uuid
from datetime import datetime, timedelta

from psycopg2.extras import execute_values

from .config import ALLERGIES_POOL, DURATION_MINUTES_BY_SPECIALTY
from .db import load_json
from .generators import (
    ascii_email, generate_address, generate_birth_date,
    generate_blood_type, generate_dni, generate_names, generate_phone,
)

_CHRONIC_COUNT = 80
_MIN_VISITS = 12
_MAX_VISITS = 15


def insert_chronic_cohort(conn, data: dict, dry_run: bool = False) -> tuple[list[str], list[dict]]:
    """Insert chronic patients with 12-15 completed visits spread over 2 years."""
    print(f"\n[Crónicos] Insertando {_CHRONIC_COUNT} pacientes crónicos ({_MIN_VISITS}-{_MAX_VISITS} visitas c/u)...")

    active_doctors = data["active_doctors"]
    if not active_doctors:
        print("    ERROR: No active doctors found.")
        return [], []

    doctor_ids = [d[0] for d in active_doctors]
    doctor_specs = {d[0]: d[1] for d in active_doctors}
    doctor_weights = [random.randint(1, 5) for _ in doctor_ids]
    complaints = load_json("chief_complaints.json")

    patient_rows = []
    for first, last, gender in generate_names(_CHRONIC_COUNT):
        gender_val = "male" if gender == "M" else "female"
        email = f"{ascii_email(first)}.{ascii_email(last)}{random.randint(1, 999)}@cronico.com"
        # Chronic patients have higher allergy rate (more complex profile)
        allergies = random.choice(ALLERGIES_POOL) if random.random() < 0.50 else None
        patient_rows.append((
            str(uuid.uuid4()),
            generate_dni(),
            first,
            last,
            generate_birth_date(),
            gender_val,
            generate_phone(),
            email,
            generate_address() if random.random() < 0.7 else None,
            generate_blood_type(),
            allergies,
        ))

    appt_rows = []
    appt_info = []
    for pat_row in patient_rows:
        patient_id = pat_row[0]
        n_visits = random.randint(_MIN_VISITS, _MAX_VISITS)

        # Each chronic patient sees the same primary doctor for consistency
        primary_doctor_id = random.choices(doctor_ids, weights=doctor_weights, k=1)[0]
        primary_specialty = doctor_specs[primary_doctor_id]

        # Visits distributed across 2 years, all at least 31 days ago
        visit_days = sorted(random.sample(range(31, 731), n_visits))

        for days_ago in visit_days:
            appt_date = datetime.now() - timedelta(days=days_ago)
            hour = random.randint(8, 18)
            minute = random.choice([0, 15, 30, 45])
            scheduled_at = appt_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            duration = random.choice(DURATION_MINUTES_BY_SPECIALTY.get(primary_specialty, [30, 30, 45]))
            scheduled_end_at = scheduled_at + timedelta(minutes=duration)
            complaint_entry = random.choice(complaints)
            appt_id = str(uuid.uuid4())

            appt_rows.append((
                appt_id, patient_id, primary_doctor_id,
                scheduled_at, scheduled_end_at,
                duration, "completed", complaint_entry["complaint"], None,
            ))
            appt_info.append({
                "id": appt_id,
                "patient_id": patient_id,
                "doctor_id": primary_doctor_id,
                "specialty": primary_specialty,
                "scheduled_at": scheduled_at,
                "status": "completed",
                "chief_complaint": complaint_entry["complaint"],
                "days_ago": days_ago,
            })

    if dry_run:
        print(f"    DRY-RUN: {_CHRONIC_COUNT} pacientes crónicos, {len(appt_rows)} citas ({len(appt_rows) / _CHRONIC_COUNT:.1f} promedio).")
        return [r[0] for r in patient_rows], appt_info

    cur = conn.cursor()
    execute_values(
        cur,
        "INSERT INTO patients (id, dni, first_name, last_name, birth_date, gender, phone, email, address, blood_type, allergies) VALUES %s",
        patient_rows,
    )
    conn.commit()
    print(f"    Insertados {_CHRONIC_COUNT} pacientes crónicos.")

    execute_values(
        cur,
        "INSERT INTO appointments (id, patient_id, doctor_id, scheduled_at, scheduled_end_at, duration_minutes, status, chief_complaint, notes) VALUES %s",
        appt_rows,
    )
    conn.commit()
    print(f"    Insertadas {len(appt_rows)} citas ({len(appt_rows) / _CHRONIC_COUNT:.1f} promedio por paciente).")

    return [r[0] for r in patient_rows], appt_info
