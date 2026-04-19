import json
import random
import re
import unicodedata
from datetime import date, timedelta

try:
    from faker import Faker
    _fake = Faker("es_MX")
    HAS_FAKER = True
except ImportError:
    _fake = None
    HAS_FAKER = False
    print("WARNING: faker not installed. Using hardcoded names. Run: pip install faker")

from .config import BLOOD_TYPES, BLOOD_TYPE_WEIGHTS

_MALE_NAMES = [
    "Carlos", "Juan", "Miguel", "Pedro", "Luis", "Jose", "Antonio", "Roberto",
    "Fernando", "Daniel", "Ricardo", "Alberto", "Alejandro", "Eduardo", "Rafael",
    "Manuel", "Francisco", "Jorge", "Omar", "Hector", "Sergio", "Andres", "Pablo",
    "Marco", "Diego", "Raul", "Victor", "Arturo", "Guillermo", "Ernesto", "Ramon",
    "Alfredo", "Salvador", "Gilberto", "Armando", "Cesar", "Ignacio", "Julio",
    "Felix", "Cristian", "Emilio", "Horacio", "Ismael", "Leopoldo", "Nestor",
    "Osvaldo", "Rene", "Teodoro", "Valentin", "Wilfredo", "Xavier",
]

_FEMALE_NAMES = [
    "Maria", "Ana", "Patricia", "Carmen", "Rosa", "Gabriela", "Elena", "Sandra",
    "Lucia", "Teresa", "Laura", "Marta", "Silvia", "Claudia", "Adriana", "Veronica",
    "Norma", "Alicia", "Sofia", "Isabel", "Rocio", "Natalia", "Guadalupe", "Leticia",
    "Beatriz", "Daniela", "Monica", "Karina", "Paola", "Valeria", "Marcela",
    "Fernanda", "Andrea", "Lorena", "Esther", "Yolanda", "Olivia", "Susana",
    "Cecilia", "Araceli", "Esmeralda", "Graciela", "Irma", "Liliana", "Nora",
    "Pilar", "Rita", "Tania", "Virginia", "Ximena", "Zoila",
]

_LAST_NAMES = [
    "Garcia", "Hernandez", "Lopez", "Martinez", "Gonzalez", "Rodriguez", "Perez",
    "Sanchez", "Ramirez", "Torres", "Flores", "Rivera", "Gomez", "Diaz", "Cruz",
    "Morales", "Reyes", "Gutierrez", "Ortiz", "Ramos", "Vargas", "Castro", "Romero",
    "Medina", "Chavez", "Mendoza", "Herrera", "Aguilar", "Jimenez", "Ruiz",
    "Alvarez", "Munoz", "Navarro", "Dominguez", "Cardenas", "Salazar", "Vazquez",
    "Rojas", "Mejia", "Soto", "Leon", "Blanco", "Cortes", "Paredes", "Quintero",
    "Zavala",
]

_STREETS = [
    "Av. Insurgentes Sur", "Av. Reforma", "Calle Palma", "Blvd. Campestre",
    "Calle Roble", "Av. Universidad", "Calle Cedros", "Paseo de la Reforma",
    "Av. Juarez", "Calle Morelos", "Blvd. de la Luz", "Av. Patriotismo",
    "Calle Hidalgo", "Av. Revolucion", "Calle Zaragoza", "Blvd. Naciones Unidas",
    "Calle Libertad", "Av. Central", "Calle 5 de Mayo", "Paseo Tabasco",
]

_COLONIAS = [
    "Centro", "San Benito", "Del Valle", "Polanco", "Coyoacan", "Roma Norte",
    "Condesa", "Tlatelolco", "San Angel", "Cumbres", "Valle Verde", "Lomas",
    "Jardines", "Bosques", "Prados", "Real del Monte", "Altavista", "Moderna",
]


def ascii_email(name: str) -> str:
    nfd = unicodedata.normalize("NFD", name)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").lower().replace(" ", ".")


def generate_names(count: int) -> list[tuple[str, str, str]]:
    names = []
    for _ in range(count):
        gender = random.choice(["M", "F"])
        if HAS_FAKER:
            first = _fake.first_name_male() if gender == "M" else _fake.first_name_female()
            last = _fake.last_name()
        else:
            pool = _MALE_NAMES if gender == "M" else _FEMALE_NAMES
            first = random.choice(pool)
            last = random.choice(_LAST_NAMES)
        names.append((first, last, gender))
    return names


def generate_dni() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(13))


def generate_phone() -> str:
    prefixes = ["55", "56", "33", "81", "222", "229", "442", "664", "662", "833"]
    return random.choice(prefixes) + "".join(str(random.randint(0, 9)) for _ in range(8))


def generate_blood_type() -> str:
    return random.choices(BLOOD_TYPES, weights=BLOOD_TYPE_WEIGHTS, k=1)[0]


def generate_address() -> str:
    nums = ["123", "456", "789", "234", "567", "890", "345", "678", "101", "202"]
    return f"{random.choice(_STREETS)} {random.choice(nums)}, Col. {random.choice(_COLONIAS)}"


def generate_birth_date() -> date:
    today = date.today()
    r = random.random()
    if r < 0.05:
        age = random.randint(1, 12)
    elif r < 0.20:
        age = random.randint(13, 17)
    elif r < 0.90:
        age = random.randint(18, 65)
    else:
        age = random.randint(66, 92)
    return today - timedelta(days=age * 365 + random.randint(0, 364))


def weighted_icd10(icd10_data: list) -> dict:
    freq_map = {"very_high": 10, "high": 6, "medium": 3, "low": 1}
    weights = [freq_map.get(c["frequency"], 1) for c in icd10_data]
    return random.choices(icd10_data, weights=weights, k=1)[0]


def generate_vital_signs(patient_age: int) -> str:
    bp_systolic = random.randint(110, 170) if patient_age > 60 else random.randint(90, 140)
    bp_diastolic = random.randint(60, 90)
    hr = random.randint(80, 130) if patient_age < 12 else random.randint(55, 100)
    temp = round(random.uniform(36.0, 37.5), 1)
    spo2 = random.randint(94, 100)

    vs = {
        "bloodPressure": f"{bp_systolic}/{bp_diastolic} mmHg",
        "heartRate": f"{hr} bpm",
        "temperature": f"{temp} C",
        "oxygenSaturation": f"{spo2}%",
    }
    if random.random() < 0.5:
        vs["weight"] = f"{round(random.uniform(20, 100), 1)} kg"
    if random.random() < 0.3:
        vs["height"] = f"{round(random.uniform(100, 185), 1)} cm"
    return json.dumps(vs, ensure_ascii=False)


def generate_clinical_note(
    specialty: str,
    chief_complaint: str,
    patient_age: int,
    templates: dict,
    icd10_entry: dict,
    days_ago: int,
    note_templates: dict = None,
    treatment_plan: str = None,
) -> str:
    base_key = specialty if specialty in templates["specialties"] else "Medicina General"
    base_tpl = templates["specialties"][base_key]

    if note_templates:
        note_key = specialty if specialty in note_templates["specialties"] else "Medicina General"
        note_tpl = random.choice(note_templates["specialties"][note_key]["clinical_note_templates"])
    else:
        note_tpl = random.choice(base_tpl["clinical_note_templates"])

    severity_map = {"mild": "leve", "moderate": "moderado", "severe": "severo", "critical": "critico"}
    sev = severity_map.get(icd10_entry.get("severity", "mild"), "leve")

    exam_tpl = random.choice(base_tpl["physical_exam_templates"])
    findings = re.sub(r"\{[^{}]+\}", "no especificado", exam_tpl).split(".")[0].strip()

    fmt_kwargs = {
        "chief_complaint": chief_complaint,
        "symptoms": f"sintomas de {icd10_entry['description'].lower()} ({sev})",
        "days": days_ago,
        "duration": f"{days_ago} dias de evolucion",
        "age": patient_age,
        "findings": findings,
        "presumptive_diagnosis": icd10_entry["description"],
        "treatment_plan": treatment_plan or "medicamentos segun receta",
        "rest_days": random.randint(3, 10),
        "follow_up": random.randint(7, 30),
        "studies": "laboratorio general",
        "improvement_status": "mejoria parcial" if days_ago > 7 else "sin cambio significativo",
        "symptoms_improved": "algunos sintomas han cedido",
    }
    try:
        note = note_tpl.format(**fmt_kwargs)
    except KeyError:
        text = note_tpl
        for k, v in fmt_kwargs.items():
            text = text.replace("{" + k + "}", str(v))
        note = re.sub(r"\{[^{}]+\}", "no especificado", text)
    return note


def generate_physical_exam(specialty: str, templates: dict) -> str:
    specialty_key = specialty if specialty in templates["specialties"] else "Medicina General"
    tpl = templates["specialties"][specialty_key]
    exam = random.choice(tpl["physical_exam_templates"])
    exam = exam.replace("{", "").replace("}", "").split(".")[0].strip()
    return exam or "Examen fisico sin hallazgos relevantes."
