-- ============================================================================
-- 01_schema.sql - Sistema de Facturación Médica y Expediente Clínico (EHR Lite)
-- ============================================================================
-- Tablas principales, relaciones, índices y constraints
-- Sigue estándares PostgreSQL modernos con integridad referencial estricta
-- ============================================================================

-- ============================================================================
-- TABLA: patients
-- ============================================================================
-- Pacientes registrados en el sistema médico
-- ============================================================================

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dni VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    blood_type VARCHAR(5),
    allergies TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_patients_gender CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    CONSTRAINT chk_patients_birth_date CHECK (birth_date <= CURRENT_DATE),
    CONSTRAINT chk_patients_blood_type CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') OR blood_type IS NULL),
    CONSTRAINT chk_patients_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL)
);

-- Índices
CREATE INDEX idx_patients_dni ON patients(dni);
CREATE INDEX idx_patients_last_name ON patients(last_name);
CREATE INDEX idx_patients_email ON patients(email) WHERE email IS NOT NULL;

-- Comentarios
COMMENT ON TABLE patients IS 'Pacientes registrados en el sistema. RN-01: Requiere DNI único antes de atención.';
COMMENT ON COLUMN patients.dni IS 'Documento Nacional de Identidad o identificador único del paciente';
COMMENT ON COLUMN patients.birth_date IS 'Fecha de nacimiento. Debe ser anterior o igual a la fecha actual';
COMMENT ON COLUMN patients.blood_type IS 'Tipo de sangre del paciente (A+, A-, B+, B-, AB+, AB-, O+, O-)';
COMMENT ON COLUMN patients.allergies IS 'Alergias conocidas del paciente. Crítico para prescripciones y procedimientos.';

-- ============================================================================
-- TABLA: doctors
-- ============================================================================
-- Personal médico autorizado para atender pacientes
-- ============================================================================

CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_doctors_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices
CREATE INDEX idx_doctors_license_number ON doctors(license_number);
CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_is_active ON doctors(is_active);

-- Comentarios
COMMENT ON TABLE doctors IS 'Personal médico del sistema. Solo médicos activos pueden tener citas asignadas.';
COMMENT ON COLUMN doctors.license_number IS 'Número de licencia médica profesional único';
COMMENT ON COLUMN doctors.specialty IS 'Especialidad médica (ej: Cardiología, Pediatría, Medicina General)';
COMMENT ON COLUMN doctors.is_active IS 'Estado del médico. FALSE = No puede tener nuevas citas asignadas';

-- ============================================================================
-- TABLA: insurance_providers
-- ============================================================================
-- Compañías de seguros médicos
-- ============================================================================

CREATE TABLE insurance_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_insurance_providers_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL)
);

-- Índices
CREATE INDEX idx_insurance_providers_code ON insurance_providers(code);
CREATE INDEX idx_insurance_providers_is_active ON insurance_providers(is_active);

-- Comentarios
COMMENT ON TABLE insurance_providers IS 'Aseguradoras médicas registradas en el sistema';
COMMENT ON COLUMN insurance_providers.code IS 'Código único de la aseguradora (ej: ISS001, SURA002)';
COMMENT ON COLUMN insurance_providers.is_active IS 'Estado de la aseguradora. FALSE = No se pueden crear nuevas pólizas';

-- ============================================================================
-- TABLA: insurance_policies
-- ============================================================================
-- Pólizas de seguro médico de pacientes
-- ============================================================================

CREATE TABLE insurance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    policy_number VARCHAR(100) NOT NULL UNIQUE,
    coverage_percentage NUMERIC(5, 2) NOT NULL,
    deductible NUMERIC(10, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_insurance_policies_coverage CHECK (coverage_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_insurance_policies_deductible CHECK (deductible >= 0),
    CONSTRAINT chk_insurance_policies_dates CHECK (end_date >= start_date),

    -- Foreign Keys
    CONSTRAINT fk_insurance_policies_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE RESTRICT,
    CONSTRAINT fk_insurance_policies_provider FOREIGN KEY (provider_id)
        REFERENCES insurance_providers(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_insurance_policies_patient_id ON insurance_policies(patient_id);
CREATE INDEX idx_insurance_policies_provider_id ON insurance_policies(provider_id);
CREATE INDEX idx_insurance_policies_policy_number ON insurance_policies(policy_number);
CREATE INDEX idx_insurance_policies_dates ON insurance_policies(start_date, end_date);
CREATE INDEX idx_insurance_policies_is_active ON insurance_policies(is_active);

-- Comentarios
COMMENT ON TABLE insurance_policies IS 'Pólizas de seguro de pacientes. RN-15: Debe estar activa y dentro de fechas válidas para usarse.';
COMMENT ON COLUMN insurance_policies.coverage_percentage IS 'Porcentaje de cobertura (0-100%). RN-16: Validado por constraint';
COMMENT ON COLUMN insurance_policies.deductible IS 'Deducible que el paciente debe pagar antes de que el seguro cubra';
COMMENT ON COLUMN insurance_policies.is_active IS 'Estado de la póliza. FALSE = No se puede usar en facturas';

-- ============================================================================
-- TABLA: appointments
-- ============================================================================
-- Citas médicas programadas
-- ============================================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    chief_complaint TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_appointments_status CHECK (
        status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
    ),
    CONSTRAINT chk_appointments_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480),

    -- Foreign Keys
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE RESTRICT,
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Comentarios
COMMENT ON TABLE appointments IS 'Citas médicas. RN-02: Requiere paciente + médico + fecha. RN-03: Estados válidos definidos por constraint.';
COMMENT ON COLUMN appointments.scheduled_at IS 'Fecha y hora programada de la cita';
COMMENT ON COLUMN appointments.duration_minutes IS 'Duración estimada de la cita en minutos (1-480 min = 8 horas máximo)';
COMMENT ON COLUMN appointments.status IS 'Estado actual de la cita. Ver RN-03 para estados válidos';
COMMENT ON COLUMN appointments.chief_complaint IS 'Motivo principal de consulta';

-- ============================================================================
-- TABLA: medical_records
-- ============================================================================
-- Expediente clínico por consulta
-- ============================================================================

CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL,
    appointment_id UUID NOT NULL,
    vital_signs JSONB,
    physical_exam TEXT,
    clinical_notes TEXT NOT NULL,
    record_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Keys
    CONSTRAINT fk_medical_records_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE RESTRICT,
    CONSTRAINT fk_medical_records_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_appointment_id ON medical_records(appointment_id);
CREATE INDEX idx_medical_records_record_date ON medical_records(record_date);

-- Comentarios
COMMENT ON TABLE medical_records IS 'Expediente clínico por consulta. RN-05: Se genera al completar una cita. RN-08: Es inmutable.';
COMMENT ON COLUMN medical_records.vital_signs IS 'Signos vitales en formato JSON (presión, temperatura, pulso, etc.)';
COMMENT ON COLUMN medical_records.physical_exam IS 'Examen físico realizado durante la consulta';
COMMENT ON COLUMN medical_records.clinical_notes IS 'Notas clínicas del médico (obligatorio)';

-- ============================================================================
-- TABLA: medications_catalog
-- ============================================================================
-- Catálogo de medicamentos disponibles
-- ============================================================================

CREATE TABLE medications_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    requires_prescription BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_medications_catalog_price CHECK (price >= 0),
    CONSTRAINT chk_medications_catalog_unit CHECK (unit IN ('tablet', 'capsule', 'ml', 'mg', 'g', 'unit', 'box', 'vial', 'inhaler'))
);

-- Índices
CREATE INDEX idx_medications_catalog_code ON medications_catalog(code);
CREATE INDEX idx_medications_catalog_name ON medications_catalog(name);
CREATE INDEX idx_medications_catalog_is_active ON medications_catalog(is_active);

-- Comentarios
COMMENT ON TABLE medications_catalog IS 'Catálogo de medicamentos. RN-19: Solo se facturan si is_active=TRUE. RN-20: Si requires_prescription=TRUE, debe existir prescripción.';
COMMENT ON COLUMN medications_catalog.code IS 'Código único del medicamento (ej: MED001, PARA500)';
COMMENT ON COLUMN medications_catalog.unit IS 'Unidad de medida/presentación del medicamento';
COMMENT ON COLUMN medications_catalog.requires_prescription IS 'TRUE = Requiere prescripción médica para ser dispensado';

-- ============================================================================
-- TABLA: prescriptions
-- ============================================================================
-- Recetas médicas
-- ============================================================================

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL,
    medical_record_id UUID NOT NULL,
    medication_id UUID NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_prescriptions_duration CHECK (duration_days > 0 AND duration_days <= 365),

    -- Foreign Keys
    CONSTRAINT fk_prescriptions_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prescriptions_medical_record FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prescriptions_medication FOREIGN KEY (medication_id)
        REFERENCES medications_catalog(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_prescriptions_appointment_id ON prescriptions(appointment_id);
CREATE INDEX idx_prescriptions_medical_record_id ON prescriptions(medical_record_id);
CREATE INDEX idx_prescriptions_medication_id ON prescriptions(medication_id);

-- Comentarios
COMMENT ON TABLE prescriptions IS 'Recetas médicas. RN-07: Debe incluir medicamento, dosis, frecuencia y duración.';
COMMENT ON COLUMN prescriptions.dosage IS 'Dosis prescrita (ej: "500mg", "2 tabletas")';
COMMENT ON COLUMN prescriptions.frequency IS 'Frecuencia de administración (ej: "cada 8 horas", "3 veces al día")';
COMMENT ON COLUMN prescriptions.duration_days IS 'Duración del tratamiento en días (1-365)';

-- ============================================================================
-- TABLA: diagnoses
-- ============================================================================
-- Diagnósticos médicos
-- ============================================================================

CREATE TABLE diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL,
    medical_record_id UUID NOT NULL,
    icd10_code VARCHAR(10) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20),
    diagnosed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_diagnoses_severity CHECK (
        severity IN ('mild', 'moderate', 'severe', 'critical') OR severity IS NULL
    ),

    -- Foreign Keys
    CONSTRAINT fk_diagnoses_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_diagnoses_medical_record FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_diagnoses_appointment_id ON diagnoses(appointment_id);
CREATE INDEX idx_diagnoses_medical_record_id ON diagnoses(medical_record_id);
CREATE INDEX idx_diagnoses_icd10_code ON diagnoses(icd10_code);

-- Comentarios
COMMENT ON TABLE diagnoses IS 'Diagnósticos médicos. RN-06: Deben usar códigos ICD-10 estándar.';
COMMENT ON COLUMN diagnoses.icd10_code IS 'Código ICD-10 (Clasificación Internacional de Enfermedades)';
COMMENT ON COLUMN diagnoses.severity IS 'Severidad del diagnóstico (leve, moderado, severo, crítico)';

-- ============================================================================
-- TABLA: services_catalog
-- ============================================================================
-- Catálogo de servicios médicos
-- ============================================================================

CREATE TABLE services_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_services_catalog_price CHECK (price >= 0),
    CONSTRAINT chk_services_catalog_category CHECK (
        category IN ('consultation', 'laboratory', 'imaging', 'surgery', 'therapy', 'emergency', 'other')
    )
);

-- Índices
CREATE INDEX idx_services_catalog_code ON services_catalog(code);
CREATE INDEX idx_services_catalog_name ON services_catalog(name);
CREATE INDEX idx_services_catalog_category ON services_catalog(category);
CREATE INDEX idx_services_catalog_is_active ON services_catalog(is_active);

-- Comentarios
COMMENT ON TABLE services_catalog IS 'Catálogo de servicios médicos. RN-19: Solo se facturan si is_active=TRUE.';
COMMENT ON COLUMN services_catalog.code IS 'Código único del servicio (ej: CONS001, XRAY001)';
COMMENT ON COLUMN services_catalog.category IS 'Categoría del servicio médico';

-- ============================================================================
-- TABLA: procedures
-- ============================================================================
-- Procedimientos médicos realizados
-- ============================================================================

CREATE TABLE procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL,
    medical_record_id UUID NOT NULL,
    procedure_code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Keys
    CONSTRAINT fk_procedures_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_procedures_medical_record FOREIGN KEY (medical_record_id)
        REFERENCES medical_records(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_procedures_appointment_id ON procedures(appointment_id);
CREATE INDEX idx_procedures_medical_record_id ON procedures(medical_record_id);
CREATE INDEX idx_procedures_procedure_code ON procedures(procedure_code);

-- Comentarios
COMMENT ON TABLE procedures IS 'Procedimientos médicos realizados durante consultas';
COMMENT ON COLUMN procedures.procedure_code IS 'Código del procedimiento (puede corresponder a services_catalog)';
COMMENT ON COLUMN procedures.performed_at IS 'Fecha y hora en que se realizó el procedimiento';

-- ============================================================================
-- TABLA: invoices
-- ============================================================================
-- Facturas generadas por servicios médicos
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id UUID NOT NULL,
    appointment_id UUID NOT NULL,
    insurance_policy_id UUID,
    subtotal NUMERIC(10, 2) NOT NULL,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    insurance_coverage NUMERIC(10, 2) NOT NULL DEFAULT 0,
    patient_responsibility NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_invoices_status CHECK (
        status IN ('draft', 'pending', 'partial_paid', 'paid', 'cancelled', 'overdue')
    ),
    CONSTRAINT chk_invoices_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_invoices_tax CHECK (tax >= 0),
    CONSTRAINT chk_invoices_total CHECK (total >= 0),
    CONSTRAINT chk_invoices_insurance_coverage CHECK (insurance_coverage >= 0),
    CONSTRAINT chk_invoices_patient_responsibility CHECK (patient_responsibility >= 0),
    CONSTRAINT chk_invoices_total_calculation CHECK (total = subtotal + tax),
    CONSTRAINT chk_invoices_responsibility_sum CHECK (insurance_coverage + patient_responsibility = total),
    CONSTRAINT chk_invoices_dates CHECK (due_date >= issue_date),

    -- Foreign Keys
    CONSTRAINT fk_invoices_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_insurance_policy FOREIGN KEY (insurance_policy_id)
        REFERENCES insurance_policies(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX idx_invoices_appointment_id ON invoices(appointment_id);
CREATE INDEX idx_invoices_insurance_policy_id ON invoices(insurance_policy_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Comentarios
COMMENT ON TABLE invoices IS 'Facturas médicas. RN-09: Se genera al completar cita. RN-11: total=subtotal+tax. RN-12: Se divide entre seguro y paciente.';
COMMENT ON COLUMN invoices.invoice_number IS 'Número único de factura (ej: FAC-2024-00001)';
COMMENT ON COLUMN invoices.insurance_coverage IS 'Monto cubierto por el seguro médico';
COMMENT ON COLUMN invoices.patient_responsibility IS 'Monto que debe pagar el paciente';
COMMENT ON COLUMN invoices.status IS 'Estado de la factura. Ver RN-10 para estados válidos';

-- ============================================================================
-- TABLA: invoice_items
-- ============================================================================
-- Conceptos/líneas de detalle de facturas
-- ============================================================================

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL,
    service_id UUID,
    medication_id UUID,
    item_type VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_invoice_items_type CHECK (item_type IN ('service', 'medication', 'procedure', 'other')),
    CONSTRAINT chk_invoice_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_invoice_items_unit_price CHECK (unit_price >= 0),
    CONSTRAINT chk_invoice_items_subtotal CHECK (subtotal >= 0),
    CONSTRAINT chk_invoice_items_subtotal_calculation CHECK (subtotal = quantity * unit_price),
    CONSTRAINT chk_invoice_items_reference CHECK (
        (item_type = 'service' AND service_id IS NOT NULL AND medication_id IS NULL) OR
        (item_type = 'medication' AND medication_id IS NOT NULL AND service_id IS NULL) OR
        (item_type IN ('procedure', 'other'))
    ),

    -- Foreign Keys
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoice_items_service FOREIGN KEY (service_id)
        REFERENCES services_catalog(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoice_items_medication FOREIGN KEY (medication_id)
        REFERENCES medications_catalog(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_service_id ON invoice_items(service_id);
CREATE INDEX idx_invoice_items_medication_id ON invoice_items(medication_id);
CREATE INDEX idx_invoice_items_type ON invoice_items(item_type);

-- Comentarios
COMMENT ON TABLE invoice_items IS 'Conceptos de facturación. Cada línea representa un servicio o medicamento facturado.';
COMMENT ON COLUMN invoice_items.item_type IS 'Tipo de concepto: servicio, medicamento, procedimiento u otro';
COMMENT ON COLUMN invoice_items.subtotal IS 'Subtotal del concepto (quantity * unit_price)';

-- ============================================================================
-- TABLA: payments
-- ============================================================================
-- Pagos aplicados a facturas
-- ============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_payments_amount CHECK (amount > 0),
    CONSTRAINT chk_payments_method CHECK (
        payment_method IN ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'check', 'insurance', 'other')
    ),

    -- Foreign Keys
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);

-- Comentarios
COMMENT ON TABLE payments IS 'Pagos aplicados a facturas. RN-13: La suma de pagos no puede exceder el total de la factura.';
COMMENT ON COLUMN payments.amount IS 'Monto del pago (debe ser > 0)';
COMMENT ON COLUMN payments.payment_method IS 'Método de pago utilizado';
COMMENT ON COLUMN payments.reference_number IS 'Número de referencia/transacción (ej: número de cheque, autorización de tarjeta)';
