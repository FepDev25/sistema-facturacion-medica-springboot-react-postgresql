import random
import uuid

from psycopg2.extras import execute_values

from .config import ALLERGIES_POOL
from .generators import ascii_email, generate_address, generate_birth_date, generate_blood_type, generate_dni, generate_names, generate_phone


def insert_patients(conn, count: int, dry_run: bool = False) -> list[str]:
    print(f"\n[3/8] Inserting {count} patients...")
    cur = conn.cursor()

    rows = []
    for first, last, gender in generate_names(count):
        gender_val = "male" if gender == "M" else "female"
        email = f"{ascii_email(first)}.{ascii_email(last)}{random.randint(1, 999)}@email.com"
        allergies = random.choice(ALLERGIES_POOL) if random.random() < 0.30 else None

        rows.append((
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

    if dry_run:
        print(f"    DRY-RUN: Would insert {count} patients.")
        return [r[0] for r in rows]

    execute_values(
        cur,
        """
        INSERT INTO patients (id, dni, first_name, last_name, birth_date, gender, phone, email, address, blood_type, allergies)
        VALUES %s
        """,
        rows,
    )
    conn.commit()
    print(f"    Inserted {count} patients.")
    return [r[0] for r in rows]
