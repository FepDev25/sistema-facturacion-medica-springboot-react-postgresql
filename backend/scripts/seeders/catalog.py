import uuid
from decimal import Decimal

from psycopg2.extras import execute_values

from .db import load_existing_data

_SERVICES = [
    ("SRV-CONS-PEDIAT", "Consulta pediatrica", "Consulta de medicina general pediatrica", 350, "consultation"),
    ("SRV-CONS-CARDIO", "Consulta cardiologia", "Consulta de cardiologia especializada", 800, "consultation"),
    ("SRV-CONS-NEURO", "Consulta neurologia", "Consulta de neurologia especializada", 850, "consultation"),
    ("SRV-CONS-PSIQ", "Consulta psiquiatria", "Consulta de psiquiatria especializada", 900, "consultation"),
    ("SRV-CONS-ONCO", "Consulta oncologia", "Consulta de oncologia especializada", 1000, "consultation"),
    ("SRV-CONS-GASTRO", "Consulta gastroenterologia", "Consulta de gastroenterologia especializada", 700, "consultation"),
    ("SRV-CONS-ENDO", "Consulta endocrinologia", "Consulta de endocrinologia especializada", 750, "consultation"),
    ("SRV-CONS-REUMA", "Consulta reumatologia", "Consulta de reumatologia especializada", 700, "consultation"),
    ("SRV-CONS-ALERG", "Consulta alergologia", "Consulta de alergologia especializada", 650, "consultation"),
    ("SRV-CONS-HEMAT", "Consulta hematologia", "Consulta de hematologia especializada", 700, "consultation"),
    ("SRV-ECG", "Electrocardiograma 12 derivaciones", "Electrocardiograma en reposo con interpretacion", 450, "imaging"),
    ("SRV-ECHO", "Ecocardiograma transtoracico", "Ecocardiograma con Doppler color", 2500, "imaging"),
    ("SRV-RX-TORAX", "Radiografia de torax", "Radiografia PA y lateral de torax", 350, "imaging"),
    ("SRV-RX-LUMBAR", "Radiografia columna lumbar", "Radiografia AP y lateral de columna lumbar", 400, "imaging"),
    ("SRV-USG-ABD", "Ultrasonido abdominal", "Ultrasonido completo de abdomen superior y pelvis", 1200, "imaging"),
]

_MEDICATIONS = [
    ("MED-PARACET",  "Paracetamol 500mg",               "Analgésico y antipirético",                    25,  "tablet",  False),
    ("MED-IBUPROF",  "Ibuprofeno 400mg",                 "Antiinflamatorio no esteroideo",               30,  "tablet",  False),
    ("MED-AMOX",     "Amoxicilina 500mg",                "Antibiótico beta-lactámico",                   45,  "capsule", True),
    ("MED-AZITRO",   "Azitromicina 500mg",               "Antibiótico macrólido",                        120, "tablet",  True),
    ("MED-CEFTRIA",  "Ceftriaxona 1g",                   "Antibiótico cefalosporínico inyectable",       180, "vial",    True),
    ("MED-OMEPRAZ",  "Omeprazol 20mg",                   "Inhibidor de bomba de protones",               35,  "capsule", False),
    ("MED-METFORM",  "Metformina 850mg",                 "Antidiabético biguanida",                      50,  "tablet",  True),
    ("MED-ENALAP",   "Enalapril 10mg",                   "Inhibidor ECA antihipertensivo",               40,  "tablet",  True),
    ("MED-LOSART",   "Losartán 50mg",                    "Antihipertensivo ARA-II",                      55,  "tablet",  True),
    ("MED-ATORVA",   "Atorvastatina 20mg",               "Estatina hipolipemiante",                      65,  "tablet",  True),
    ("MED-DICLOF",   "Diclofenaco 50mg",                 "Antiinflamatorio no esteroideo",               30,  "tablet",  False),
    ("MED-PREDNI",   "Prednisona 5mg",                   "Corticosteroide sistémico",                    25,  "tablet",  True),
    ("MED-SALBUT",   "Salbutamol inhalador",              "Broncodilatador beta-2 agonista",              180, "inhaler", True),
    ("MED-MONT",     "Montelukast 10mg",                 "Antagonista leucotrienos",                     85,  "tablet",  True),
    ("MED-LORAT",    "Loratadina 10mg",                  "Antihistamínico de segunda generación",        20,  "tablet",  False),
    ("MED-CETIRI",   "Cetirizina 10mg",                  "Antihistamínico de segunda generación",        22,  "tablet",  False),
    ("MED-RANIT",    "Ranitidina 150mg",                 "Antagonista H2 antiulceroso",                  30,  "tablet",  False),
    ("MED-DIPHEN",   "Difenhidramina 25mg",              "Antihistamínico de primera generación",        15,  "capsule", False),
    ("MED-AMBROX",   "Ambroxol 30mg",                   "Mucolítico expectorante",                      28,  "tablet",  False),
    ("MED-DEXAME",   "Dexametasona 4mg",                 "Corticosteroide potente inyectable",           45,  "vial",    True),
    ("MED-CIPROF",   "Ciprofloxacino 500mg",             "Antibiótico fluoroquinolona",                  70,  "tablet",  True),
    ("MED-TRAMAD",   "Tramadol 50mg",                    "Analgésico opiáceo débil",                     35,  "capsule", True),
    ("MED-CLOPER",   "Clorfenamina 4mg",                 "Antihistamínico de primera generación",        12,  "tablet",  False),
    ("MED-NAPROX",   "Naproxeno 250mg",                  "Antiinflamatorio no esteroideo",               28,  "tablet",  False),
    ("MED-GLIMEP",   "Glimepirida 2mg",                  "Antidiabético sulfonilurea",                   45,  "tablet",  True),
    ("MED-ATORV",    "Atorvastatina 40mg",               "Estatina dosis alta",                          80,  "tablet",  True),
    ("MED-CLOPID",   "Clopidogrel 75mg",                 "Antiagregante plaquetario",                    75,  "tablet",  True),
    ("MED-ASPIR",    "Ácido acetilsalicílico 100mg",     "Antiagregante plaquetario",                    15,  "tablet",  False),
    ("MED-ALENDR",   "Alendronato 70mg",                 "Bifosfonato para osteoporosis",                120, "tablet",  True),
    ("MED-LEVOTI",   "Levotiroxina 50mcg",               "Hormona tiroidea sintética",                   55,  "tablet",  True),
    ("MED-INSULI",   "Insulina glargina 100UI/mL",       "Insulina basal de accion prolongada",          450, "vial",    True),
    ("MED-PANTOP",   "Pantoprazol 40mg",                 "Inhibidor de bomba de protones",               60,  "tablet",  True),
    ("MET-DOXICI",   "Doxiciclina 100mg",                "Antibiótico tetraciclina",                     55,  "capsule", True),
    ("MET-FLUOXA",   "Fluoxetina 20mg",                  "ISRS antidepresivo",                           48,  "capsule", True),
    ("MET-CLOZAP",   "Clonazepam 0.5mg",                 "Benzodiacepina ansiolítico",                   30,  "tablet",  True),
    ("MET-WARFA",    "Warfarina 5mg",                    "Anticoagulante cumarínico",                    25,  "tablet",  True),
    ("MET-FUROSE",   "Furosemida 40mg",                  "Diurético asa",                                18,  "tablet",  True),
    ("MET-AMLOD",    "Amlodipino 5mg",                   "Antagonista calcio antihipertensivo",          42,  "tablet",  True),
    ("MET-SPIRON",   "Espironolactona 25mg",             "Diurético ahorrador de potasio",               30,  "tablet",  True),
    ("MET-METOC",    "Metoclopramida 10mg",              "Procinético antiemético",                      15,  "tablet",  False),
    ("MET-SUCRALF",  "Sucralfato 1g",                    "Citoprotector gástrico",                       35,  "tablet",  False),
    ("MET-LACTUL",   "Lactulosa 10g/15mL",               "Laxante osmótico",                             55,  "ml",      False),
    ("MET-DIPHENI",  "Difenoxilato 2.5mg",               "Antidiarreico",                                20,  "tablet",  True),
    ("MET-BROMUR",   "Bromuro de ipratropio inhalador",  "Broncodilatador anticolinérgico",              220, "inhaler", True),
    ("MET-BUDES",    "Budesonida inhalador 200mcg",      "Corticosteroide inhalado",                     280, "inhaler", True),
    ("MET-ALBUTE",   "Albuterol nebulizacion 5mg/mL",   "Broncodilatador para nebulizar",               90,  "ml",      True),
    ("MET-PHENO",    "Fenitoína 100mg",                  "Anticonvulsivante",                            22,  "capsule", True),
    ("MET-ACIDO",    "Ácido valproico 500mg",            "Anticonvulsivante estabilizador del ánimo",    65,  "tablet",  True),
]


def insert_catalog_items(conn, data: dict, dry_run: bool = False) -> tuple[list, list]:
    print("\n[5/8] Inserting new catalog items (services + medications)...")
    cur = conn.cursor()

    existing = load_existing_data(conn)
    existing_serv_codes = existing["existing_service_codes"]
    existing_med_codes = existing["existing_med_codes"]

    serv_rows = [
        (str(uuid.uuid4()), code, name, desc, Decimal(str(price)), cat, True)
        for code, name, desc, price, cat in _SERVICES
        if code not in existing_serv_codes
    ]
    med_rows = [
        (str(uuid.uuid4()), code, name, desc, Decimal(str(price)), unit, rx, True)
        for code, name, desc, price, unit, rx in _MEDICATIONS
        if code not in existing_med_codes
    ]

    if dry_run:
        print(f"    DRY-RUN: Would insert {len(serv_rows)} services, {len(med_rows)} medications.")
        return existing["existing_services"], existing["existing_medications"]

    if serv_rows:
        execute_values(
            cur,
            "INSERT INTO services_catalog (id, code, name, description, price, category, is_active) VALUES %s",
            serv_rows,
        )
        conn.commit()
        print(f"    Inserted {len(serv_rows)} services.")

    if med_rows:
        execute_values(
            cur,
            "INSERT INTO medications_catalog (id, code, name, description, price, unit, requires_prescription, is_active) VALUES %s",
            med_rows,
        )
        conn.commit()
        print(f"    Inserted {len(med_rows)} medications.")

    cur.execute("SELECT id FROM services_catalog WHERE is_active = true")
    all_services = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM medications_catalog WHERE is_active = true")
    all_meds = [r[0] for r in cur.fetchall()]
    return all_services, all_meds
