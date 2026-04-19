import random
import uuid
from datetime import datetime, timedelta

from psycopg2.extras import execute_values

from .config import DURATION_MINUTES_BY_SPECIALTY
from .db import load_json


def insert_appointments(conn, count: int, data: dict, dry_run: bool = False) -> list[dict]:
    print(f"\n[6/8] Inserting {count} historical appointments...")
    cur = conn.cursor()

    cur.execute("SELECT id FROM patients")
    all_patients = [r[0] for r in cur.fetchall()]

    active_doctors = data["active_doctors"]
    if not active_doctors:
        print("    ERROR: No active doctors found.")
        return []

    doctor_ids = [d[0] for d in active_doctors]
    doctor_specs = {d[0]: d[1] for d in active_doctors}
    doctor_weights = [random.randint(1, 5) for _ in doctor_ids]

    complaints = load_json("chief_complaints.json")
    cutoff_date = datetime.now() - timedelta(days=30)

    appt_rows = []
    appt_info = []

    for _ in range(count):
        patient_id = random.choice(all_patients)
        doctor_id = random.choices(doctor_ids, weights=doctor_weights, k=1)[0]
        specialty = doctor_specs[doctor_id]

        days_ago = random.randint(1, 700)
        appt_date = datetime.now() - timedelta(days=days_ago)
        if appt_date > cutoff_date:
            appt_date = cutoff_date - timedelta(days=random.randint(0, 60))

        hour = random.randint(8, 19)
        minute = random.choice([0, 15, 30, 45])
        scheduled_at = appt_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

        duration = random.choice(DURATION_MINUTES_BY_SPECIALTY.get(specialty, [30, 30, 45]))
        scheduled_end_at = scheduled_at + timedelta(minutes=duration)

        r = random.random()
        status = "completed" if r < 0.75 else ("cancelled" if r < 0.90 else "no_show")

        complaint_entry = random.choice(complaints)
        chief_complaint = complaint_entry["complaint"]

        notes = None
        if status == "cancelled":
            notes = random.choice([
                "El paciente no se presento y no fue posible localizarlo.",
                "Cancelado por el paciente con 24 horas de anticipacion.",
                "Cancelado por inasistencia reiterada.",
                "El paciente solicito reprogramar.",
            ])

        appt_id = str(uuid.uuid4())
        appt_rows.append((
            appt_id, patient_id, doctor_id, scheduled_at, scheduled_end_at,
            duration, status, chief_complaint, notes,
        ))
        appt_info.append({
            "id": appt_id,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "specialty": specialty,
            "scheduled_at": scheduled_at,
            "status": status,
            "chief_complaint": chief_complaint,
            "days_ago": days_ago,
        })

    if dry_run:
        print(f"    DRY-RUN: Would insert {count} appointments.")
        return appt_info

    execute_values(
        cur,
        """
        INSERT INTO appointments (id, patient_id, doctor_id, scheduled_at, scheduled_end_at, duration_minutes, status, chief_complaint, notes)
        VALUES %s
        """,
        appt_rows,
    )
    conn.commit()

    n_completed = sum(1 for a in appt_info if a["status"] == "completed")
    n_cancelled = sum(1 for a in appt_info if a["status"] == "cancelled")
    n_noshow = sum(1 for a in appt_info if a["status"] == "no_show")
    print(f"    Inserted {count} appointments ({n_completed} completed, {n_cancelled} cancelled, {n_noshow} no_show).")
    return appt_info
