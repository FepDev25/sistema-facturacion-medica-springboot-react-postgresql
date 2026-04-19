import random
import uuid

from psycopg2.extras import execute_values

from .config import SPECIALTIES
from .db import load_existing_data
from .generators import ascii_email, generate_names, generate_phone


def insert_system_users(conn, dry_run: bool = False) -> dict:
    print("\n[1/8] Inserting system users (doctors + receptionists)...")
    cur = conn.cursor()
    existing = load_existing_data(conn)["existing_usernames"]

    users = []
    for i in range(1, 26):
        username = f"doctor{i + 1}"
        if username not in existing:
            users.append((str(uuid.uuid4()), username, "doctor123", f"doctor{i + 1}@sfm.local", "DOCTOR", True))

    for i in range(2, 7):
        username = f"recep{i}"
        if username not in existing:
            users.append((str(uuid.uuid4()), username, "recep123", f"recep{i}@sfm.local", "RECEPTIONIST", True))

    if not users:
        print("    Already exists, skipping.")
        return {}

    sql = """
        INSERT INTO system_users (id, username, password_hash, email, role, is_active)
        VALUES (%s, %s, crypt(%s, gen_salt('bf', 10)), %s, %s, %s)
    """
    if dry_run:
        print(f"    DRY-RUN: Would insert {len(users)} system users.")
        return {}

    for u in users:
        cur.execute(sql, (u[0], u[1], u[2], u[3], u[4], u[5]))
    conn.commit()
    print(f"    Inserted {len(users)} system users.")

    cur.execute("SELECT username, id FROM system_users")
    return {r[0]: r[1] for r in cur.fetchall()}


def insert_doctors(conn, user_map: dict, dry_run: bool = False) -> None:
    print("\n[2/8] Inserting doctors...")
    cur = conn.cursor()

    existing_licenses = load_existing_data(conn)["existing_licenses"]
    user_doctor_ids = {
        uid for uname, uid in user_map.items()
        if uname.startswith("doctor") and uname != "doctor1"
    }

    cur.execute("SELECT DISTINCT specialty FROM doctors WHERE is_active = true")
    used_specs = {r[0] for r in cur.fetchall()}
    available_specs = [s for s in SPECIALTIES if s not in used_specs]

    new_doctors = []
    for idx, uid in enumerate(sorted(user_doctor_ids)):
        spec = available_specs[idx] if idx < len(available_specs) else random.choice(SPECIALTIES)
        first, last, _ = generate_names(1)[0]
        license_num = _unique_license(existing_licenses)

        new_doctors.append((
            str(uuid.uuid4()), license_num, first, last, spec,
            generate_phone(), f"{ascii_email(first)}.{ascii_email(last)}@sfm.local", True, uid,
        ))

    if not new_doctors:
        print("    Already exists, skipping.")
        return

    if dry_run:
        print(f"    DRY-RUN: Would insert {len(new_doctors)} doctors.")
        return

    execute_values(
        cur,
        "INSERT INTO doctors (id, license_number, first_name, last_name, specialty, phone, email, is_active, user_id) VALUES %s",
        new_doctors,
    )
    conn.commit()
    print(f"    Inserted {len(new_doctors)} doctors.")


def _unique_license(existing: set) -> str:
    while True:
        num = f"CED-{random.randint(100000, 999999)}-{random.choice(['A', 'B', 'C', 'D'])}"
        if num not in existing:
            existing.add(num)
            return num
