-- ============================================================================
-- seeds.sql - Sistema de Facturación Médica y Expediente Clínico (EHR Lite)
-- ============================================================================
-- Datos de prueba REALISTAS y contextuales
-- Incluye escenarios complejos para testing exhaustivo
-- ============================================================================

-- ============================================================================
-- LIMPIEZA (solo para desarrollo/testing)
-- ============================================================================

TRUNCATE TABLE catalog_price_history CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE invoice_items CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE procedures CASCADE;
TRUNCATE TABLE prescriptions CASCADE;
TRUNCATE TABLE diagnoses CASCADE;
TRUNCATE TABLE medical_records CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE insurance_policies CASCADE;
TRUNCATE TABLE insurance_providers CASCADE;
TRUNCATE TABLE medications_catalog CASCADE;
TRUNCATE TABLE services_catalog CASCADE;
TRUNCATE TABLE doctors CASCADE;
TRUNCATE TABLE patients CASCADE;
TRUNCATE TABLE invoice_sequences CASCADE;

-- ============================================================================
-- PACIENTES (10 pacientes con datos realistas)
-- ============================================================================

INSERT INTO patients (id, dni, first_name, last_name, birth_date, gender, phone, email, address, blood_type, allergies) VALUES
-- Paciente 1: Adulta con múltiples consultas y alergias críticas
('a0000000-0000-0000-0000-000000000001', '12345678', 'María', 'González Pérez', '1985-03-15', 'female', '+52-555-1234-5678', 'maria.gonzalez@email.com', 'Av. Insurgentes Sur 1234, Col. del Valle, CDMX', 'O+', 'Penicilina (anafilaxia), Polen, Mariscos'),

-- Paciente 2: Adulto mayor con seguro médico
('a0000000-0000-0000-0000-000000000002', '87654321', 'Roberto', 'Martínez Silva', '1955-11-20', 'male', '+52-555-8765-4321', 'roberto.martinez@email.com', 'Calle Morelos 456, Col. Centro, Guadalajara', 'A+', NULL),

-- Paciente 3: Joven sin seguro, con factura vencida
('a0000000-0000-0000-0000-000000000003', '45678912', 'Ana', 'Rodríguez López', '2000-07-08', 'female', '+52-555-4567-8912', 'ana.rodriguez@email.com', 'Paseo de la Reforma 789, Col. Juárez, CDMX', 'B+', 'Aspirina'),

-- Paciente 4: Niño con seguro familiar
('a0000000-0000-0000-0000-000000000004', '98765432', 'Carlos', 'Hernández Torres', '2015-02-28', 'male', '+52-555-9876-5432', 'carlos.hernandez@email.com', 'Av. Universidad 321, Col. Copilco, CDMX', 'AB+', 'Lactosa'),

-- Paciente 5: Adulta embarazada
('a0000000-0000-0000-0000-000000000005', '11223344', 'Laura', 'Sánchez Ramírez', '1992-09-12', 'female', '+52-555-1122-3344', 'laura.sanchez@email.com', 'Calle 5 de Mayo 555, Col. Polanco, CDMX', 'O-', NULL),

-- Paciente 6: Adulto con diabetes e hipertensión
('a0000000-0000-0000-0000-000000000006', '55667788', 'José', 'Fernández Ortiz', '1970-05-30', 'male', '+52-555-5566-7788', 'jose.fernandez@email.com', 'Av. Revolución 888, Col. San Ángel, CDMX', 'A-', NULL),

-- Paciente 7: Joven deportista
('a0000000-0000-0000-0000-000000000007', '22334455', 'Diana', 'Castro Morales', '1998-12-05', 'female', '+52-555-2233-4455', 'diana.castro@email.com', 'Av. Constituyentes 999, Col. Lomas, CDMX', 'B-', NULL),

-- Paciente 8: Adulto con cita cancelada
('a0000000-0000-0000-0000-000000000008', '33445566', 'Miguel', 'Ruiz Vega', '1988-04-18', 'male', '+52-555-3344-5566', 'miguel.ruiz@email.com', 'Calle Juárez 111, Col. Roma, CDMX', 'AB-', 'Ibuprofeno'),

-- Paciente 9: Adulta con múltiples alergias
('a0000000-0000-0000-0000-000000000009', '66778899', 'Patricia', 'López García', '1978-08-22', 'female', '+52-555-6677-8899', 'patricia.lopez@email.com', 'Av. Chapultepec 222, Col. Condesa, CDMX', 'O+', 'Penicilina, Sulfonamidas, Látex, Frutos secos'),

-- Paciente 10: Adulto preferir no decir género
('a0000000-0000-0000-0000-000000000010', '77889900', 'Alex', 'Moreno Díaz', '1995-01-10', 'prefer_not_to_say', '+52-555-7788-9900', 'alex.moreno@email.com', 'Calle Amsterdam 333, Col. Hipódromo, CDMX', 'B+', NULL);

-- ============================================================================
-- MÉDICOS (6 médicos con especialidades diferentes)
-- ============================================================================

INSERT INTO doctors (id, license_number, first_name, last_name, specialty, phone, email, is_active) VALUES
-- Médico 1: Medicina General (activo)
('b0000000-0000-0000-0000-000000000001', 'MED-001-2015', 'Fernando', 'García López', 'Medicina General', '+52-555-1111-1111', 'dr.garcia@hospital.com', TRUE),

-- Médico 2: Pediatría (activo)
('b0000000-0000-0000-0000-000000000002', 'MED-002-2018', 'Isabel', 'Ramírez Soto', 'Pediatría', '+52-555-2222-2222', 'dra.ramirez@hospital.com', TRUE),

-- Médico 3: Cardiología (activo)
('b0000000-0000-0000-0000-000000000003', 'MED-003-2012', 'Alejandro', 'Torres Mendoza', 'Cardiología', '+52-555-3333-3333', 'dr.torres@hospital.com', TRUE),

-- Médico 4: Ginecología (activo)
('b0000000-0000-0000-0000-000000000004', 'MED-004-2016', 'Gabriela', 'Morales Cruz', 'Ginecología y Obstetricia', '+52-555-4444-4444', 'dra.morales@hospital.com', TRUE),

-- Médico 5: Traumatología (activo)
('b0000000-0000-0000-0000-000000000005', 'MED-005-2014', 'Ricardo', 'Jiménez Flores', 'Traumatología y Ortopedia', '+52-555-5555-5555', 'dr.jimenez@hospital.com', TRUE),

-- Médico 6: Endocrinología (inactivo - de baja temporal)
('b0000000-0000-0000-0000-000000000006', 'MED-006-2019', 'Sofía', 'Vargas Rojas', 'Endocrinología', '+52-555-6666-6666', 'dra.vargas@hospital.com', FALSE);

-- ============================================================================
-- ASEGURADORAS (4 compañías de seguros)
-- ============================================================================

INSERT INTO insurance_providers (id, name, code, phone, email, address, is_active) VALUES
('c0000000-0000-0000-0000-000000000001', 'Seguros Médicos del Pacífico', 'SMP-001', '+52-800-111-2222', 'contacto@segurospacifico.com', 'Av. Paseo de la Reforma 500, Torre Mayor, CDMX', TRUE),
('c0000000-0000-0000-0000-000000000002', 'Aseguradora Nacional de Salud', 'ANS-002', '+52-800-333-4444', 'info@aseguranacional.com', 'Av. Insurgentes Norte 1000, CDMX', TRUE),
('c0000000-0000-0000-0000-000000000003', 'Protección Familiar Seguros', 'PFS-003', '+52-800-555-6666', 'servicios@proteccionfamiliar.com', 'Calle Montes Urales 424, Lomas de Chapultepec, CDMX', TRUE),
('c0000000-0000-0000-0000-000000000004', 'Seguros Vida Plena (Inactiva)', 'SVP-004', '+52-800-777-8888', 'contacto@vidaplena.com', 'Av. Santa Fe 482, Santa Fe, CDMX', FALSE);

-- ============================================================================
-- PÓLIZAS DE SEGURO (6 pólizas con diferentes estados)
-- ============================================================================

INSERT INTO insurance_policies (id, patient_id, provider_id, policy_number, coverage_percentage, deductible, start_date, end_date, is_active) VALUES
-- Póliza 1: Paciente 2 (Roberto) - Seguro activo y vigente
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'POL-2025-001234', 80.00, 500.00, '2025-01-01', '2025-12-31', TRUE),

-- Póliza 2: Paciente 4 (Carlos) - Seguro familiar activo
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'POL-2025-005678', 90.00, 300.00, '2025-01-15', '2026-01-14', TRUE),

-- Póliza 3: Paciente 5 (Laura) - Seguro activo con cobertura completa
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'POL-2025-009012', 100.00, 0.00, '2024-06-01', '2026-05-31', TRUE),

-- Póliza 4: Paciente 6 (José) - Seguro vencido (inactivo)
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'POL-2024-003456', 70.00, 1000.00, '2024-01-01', '2024-12-31', FALSE),

-- Póliza 5: Paciente 7 (Diana) - Seguro activo básico
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000002', 'POL-2025-007890', 60.00, 800.00, '2025-02-01', '2026-01-31', TRUE),

-- Póliza 6: Paciente 2 (Roberto) - Segunda póliza (complementaria, inactiva)
('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'POL-2024-011111', 50.00, 500.00, '2024-01-01', '2025-01-15', FALSE);

-- ============================================================================
-- CATÁLOGO DE SERVICIOS MÉDICOS (15 servicios)
-- ============================================================================

INSERT INTO services_catalog (id, code, name, description, price, category, is_active) VALUES
-- Consultas
('e0000000-0000-0000-0000-000000000001', 'CONS-001', 'Consulta Medicina General', 'Consulta de primera vez con médico general', 600.00, 'consultation', TRUE),
('e0000000-0000-0000-0000-000000000002', 'CONS-002', 'Consulta Especialista', 'Consulta con médico especialista', 1200.00, 'consultation', TRUE),
('e0000000-0000-0000-0000-000000000003', 'CONS-003', 'Consulta Pediátrica', 'Consulta pediátrica completa', 800.00, 'consultation', TRUE),

-- Laboratorio
('e0000000-0000-0000-0000-000000000004', 'LAB-001', 'Química Sanguínea 6 Elementos', 'Glucosa, Urea, Creatinina, Ácido Úrico, Colesterol, Triglicéridos', 350.00, 'laboratory', TRUE),
('e0000000-0000-0000-0000-000000000005', 'LAB-002', 'Biometría Hemática Completa', 'Conteo completo de células sanguíneas', 280.00, 'laboratory', TRUE),
('e0000000-0000-0000-0000-000000000006', 'LAB-003', 'Examen General de Orina', 'Análisis físico, químico y microscópico de orina', 180.00, 'laboratory', TRUE),
('e0000000-0000-0000-0000-000000000007', 'LAB-004', 'Perfil Tiroideo Completo', 'TSH, T3, T4, T4 Libre', 950.00, 'laboratory', TRUE),

-- Imagenología
('e0000000-0000-0000-0000-000000000008', 'IMG-001', 'Radiografía Simple', 'Radiografía de región específica (1 placa)', 400.00, 'imaging', TRUE),
('e0000000-0000-0000-0000-000000000009', 'IMG-002', 'Ultrasonido Obstétrico', 'Ultrasonido para seguimiento de embarazo', 800.00, 'imaging', TRUE),
('e0000000-0000-0000-0000-000000000010', 'IMG-003', 'Electrocardiograma', 'ECG de 12 derivaciones', 350.00, 'imaging', TRUE),

-- Procedimientos
('e0000000-0000-0000-0000-000000000011', 'PROC-001', 'Curación Simple', 'Curación y limpieza de herida superficial', 300.00, 'therapy', TRUE),
('e0000000-0000-0000-0000-000000000012', 'PROC-002', 'Aplicación de Inyección', 'Aplicación de medicamento intramuscular o intravenoso', 150.00, 'therapy', TRUE),
('e0000000-0000-0000-0000-000000000013', 'PROC-003', 'Terapia Física (Sesión)', 'Sesión individual de fisioterapia', 500.00, 'therapy', TRUE),

-- Emergencias
('e0000000-0000-0000-0000-000000000014', 'EMRG-001', 'Atención en Urgencias', 'Valoración inicial en urgencias', 1500.00, 'emergency', TRUE),

-- Servicio inactivo (descontinuado)
('e0000000-0000-0000-0000-000000000015', 'CONS-999', 'Servicio Descontinuado', 'Este servicio ya no está disponible', 100.00, 'other', FALSE);

-- ============================================================================
-- CATÁLOGO DE MEDICAMENTOS (20 medicamentos)
-- ============================================================================

INSERT INTO medications_catalog (id, code, name, description, price, unit, requires_prescription, is_active) VALUES
-- Antibióticos (requieren prescripción)
('f0000000-0000-0000-0000-000000000001', 'MED-001', 'Amoxicilina 500mg', 'Antibiótico de amplio espectro', 85.00, 'capsule', TRUE, TRUE),
('f0000000-0000-0000-0000-000000000002', 'MED-002', 'Azitromicina 500mg', 'Antibiótico macrólido', 180.00, 'tablet', TRUE, TRUE),
('f0000000-0000-0000-0000-000000000003', 'MED-003', 'Ciprofloxacino 500mg', 'Antibiótico fluoroquinolona', 120.00, 'tablet', TRUE, TRUE),

-- Analgésicos (algunos sin prescripción)
('f0000000-0000-0000-0000-000000000004', 'MED-004', 'Paracetamol 500mg', 'Analgésico y antipirético', 35.00, 'tablet', FALSE, TRUE),
('f0000000-0000-0000-0000-000000000005', 'MED-005', 'Ibuprofeno 400mg', 'Antiinflamatorio no esteroideo', 45.00, 'tablet', FALSE, TRUE),
('f0000000-0000-0000-0000-000000000006', 'MED-006', 'Ketorolaco 10mg', 'Analgésico antiinflamatorio', 65.00, 'tablet', TRUE, TRUE),

-- Antihipertensivos (requieren prescripción)
('f0000000-0000-0000-0000-000000000007', 'MED-007', 'Losartán 50mg', 'Antihipertensivo', 95.00, 'tablet', TRUE, TRUE),
('f0000000-0000-0000-0000-000000000008', 'MED-008', 'Enalapril 10mg', 'Inhibidor de la ECA', 75.00, 'tablet', TRUE, TRUE),

-- Antidiabéticos (requieren prescripción)
('f0000000-0000-0000-0000-000000000009', 'MED-009', 'Metformina 850mg', 'Antidiabético oral', 120.00, 'tablet', TRUE, TRUE),
('f0000000-0000-0000-0000-000000000010', 'MED-010', 'Glibenclamida 5mg', 'Hipoglucemiante oral', 85.00, 'tablet', TRUE, TRUE),

-- Antiácidos y gastrointestinales
('f0000000-0000-0000-0000-000000000011', 'MED-011', 'Omeprazol 20mg', 'Inhibidor de bomba de protones', 95.00, 'capsule', TRUE, TRUE),
('f0000000-0000-0000-0000-000000000012', 'MED-012', 'Ranitidina 150mg', 'Antagonista H2', 60.00, 'tablet', FALSE, TRUE),

-- Vitaminas y suplementos (sin prescripción)
('f0000000-0000-0000-0000-000000000013', 'MED-013', 'Ácido Fólico 5mg', 'Suplemento vitamínico', 40.00, 'tablet', FALSE, TRUE),
('f0000000-0000-0000-0000-000000000014', 'MED-014', 'Complejo B', 'Vitaminas del complejo B', 85.00, 'tablet', FALSE, TRUE),

-- Antiinflamatorios tópicos
('f0000000-0000-0000-0000-000000000015', 'MED-015', 'Diclofenaco Gel 1%', 'Antiinflamatorio tópico', 120.00, 'g', FALSE, TRUE),

-- Antihistamínicos
('f0000000-0000-0000-0000-000000000016', 'MED-016', 'Loratadina 10mg', 'Antihistamínico', 55.00, 'tablet', FALSE, TRUE),
('f0000000-0000-0000-0000-000000000017', 'MED-017', 'Cetirizina 10mg', 'Antihistamínico de segunda generación', 65.00, 'tablet', FALSE, TRUE),

-- Broncodilatadores
('f0000000-0000-0000-0000-000000000018', 'MED-018', 'Salbutamol Inhalador', 'Broncodilatador para asma', 280.00, 'inhaler', TRUE, TRUE),

-- Corticosteroides
('f0000000-0000-0000-0000-000000000019', 'MED-019', 'Prednisona 5mg', 'Corticosteroide oral', 45.00, 'tablet', TRUE, TRUE),

-- Medicamento inactivo (descontinuado)
('f0000000-0000-0000-0000-000000000020', 'MED-999', 'Medicamento Descontinuado', 'Ya no disponible', 10.00, 'tablet', TRUE, FALSE);

-- ============================================================================
-- CITAS MÉDICAS (15 citas con diferentes estados)
-- ============================================================================

INSERT INTO appointments (id, patient_id, doctor_id, scheduled_at, duration_minutes, status, chief_complaint, notes) VALUES
-- Cita 1: María - Completada con diagnóstico y prescripción
('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-01-15 09:00:00-06', 30, 'completed', 'Dolor de garganta y fiebre', 'Paciente con alergias a penicilina - IMPORTANTE'),

-- Cita 2: Roberto - Completada con seguro
('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '2026-01-20 10:30:00-06', 45, 'completed', 'Control de hipertensión arterial', 'Paciente estable, continuar tratamiento'),

-- Cita 3: Ana - Completada, factura vencida sin pago
('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '2026-01-10 14:00:00-06', 30, 'completed', 'Dolor de cabeza recurrente', 'Sin antecedentes relevantes'),

-- Cita 4: Carlos (niño) - Completada con pediatra
('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', '2026-01-22 11:00:00-06', 30, 'completed', 'Resfriado común', 'Acompañado por madre'),

-- Cita 5: Laura (embarazada) - Completada con ginecóloga
('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', '2026-01-25 15:00:00-06', 45, 'completed', 'Control prenatal - Semana 20', 'Embarazo sin complicaciones'),

-- Cita 6: José - Completada sin seguro vigente
('10000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', '2026-01-28 09:30:00-06', 30, 'completed', 'Control de diabetes tipo 2', 'Seguro vencido, pago directo'),

-- Cita 7: Diana - Completada con traumatólogo
('10000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', '2026-01-29 16:00:00-06', 45, 'completed', 'Esguince de tobillo', 'Lesión deportiva - futbol'),

-- Cita 8: Miguel - CANCELADA
('10000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', '2026-01-18 10:00:00-06', 30, 'cancelled', 'Check-up general', 'Paciente canceló por viaje'),

-- Cita 9: Patricia - Completada con múltiples alergias
('10000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', '2026-01-30 08:00:00-06', 30, 'completed', 'Reacción alérgica leve', 'CUIDADO: Múltiples alergias documentadas'),

-- Cita 10: María - Segunda consulta (seguimiento)
('10000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-01-23 09:00:00-06', 30, 'completed', 'Seguimiento faringitis', 'Evolución favorable'),

-- Cita 11: Alex - NO SHOW
('10000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', '2026-01-19 14:30:00-06', 30, 'no_show', 'Primera consulta', 'Paciente no se presentó'),

-- Cita 12: Roberto - Programada (futura)
('10000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', '2026-03-15 10:00:00-06', 45, 'scheduled', 'Control cardiológico trimestral', 'Próxima revisión'),

-- Cita 13: Carlos - Confirmada (próxima)
('10000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', '2026-02-20 11:00:00-06', 30, 'confirmed', 'Vacunación', 'Refuerzo de vacunas escolares'),

-- Cita 14: Laura - En progreso
('10000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', '2026-02-06 09:00:00-06', 45, 'in_progress', 'Consulta actual', 'Atención en curso'),

-- Cita 15: Diana - Segunda consulta completada
('10000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', '2026-02-05 16:00:00-06', 30, 'completed', 'Seguimiento esguince', 'Recuperación satisfactoria');

-- ============================================================================
-- EXPEDIENTES CLÍNICOS (solo para citas completadas)
-- ============================================================================

INSERT INTO medical_records (id, patient_id, appointment_id, vital_signs, physical_exam, clinical_notes, record_date) VALUES
-- Expediente 1: María - Faringitis
('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
'{"temperatura": "38.2°C", "presion": "120/80 mmHg", "frecuencia_cardiaca": "82 lpm", "frecuencia_respiratoria": "18 rpm", "saturacion_oxigeno": "98%"}',
'Faringe hiperémica con exudado blanquecino. Amígdalas aumentadas de tamaño. Adenopatías cervicales palpables. Resto de exploración normal.',
'Paciente femenino de 40 años con cuadro de 3 días de evolución de odinofagia, fiebre y malestar general. ALERGIA A PENICILINA (anafilaxia documentada). Se prescribe antibiótico alternativo. Reposo relativo.',
'2026-01-15 09:30:00-06'),

-- Expediente 2: Roberto - Hipertensión
('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
'{"temperatura": "36.5°C", "presion": "135/85 mmHg", "frecuencia_cardiaca": "72 lpm", "peso": "78 kg", "talla": "1.72 m", "imc": "26.3"}',
'Ruidos cardíacos rítmicos, sin soplos. Campos pulmonares bien ventilados. Abdomen blando, no doloroso. Pulsos periféricos presentes y simétricos.',
'Paciente masculino de 70 años con hipertensión arterial controlada. Apegado a tratamiento. Continuar con Losartán 50mg/día. Control en 3 meses. ECG solicitado.',
'2026-01-20 11:15:00-06'),

-- Expediente 3: Ana - Cefalea
('20000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
'{"temperatura": "36.8°C", "presion": "110/70 mmHg", "frecuencia_cardiaca": "76 lpm"}',
'Exploración neurológica normal. Pupilas isocóricas normorreactivas. Pares craneales íntegros. Fondo de ojo normal.',
'Paciente femenino de 25 años con cefalea tensional recurrente. Relacionada con estrés laboral. Se prescribe analgésico y se recomienda manejo de estrés.',
'2026-01-10 14:30:00-06'),

-- Expediente 4: Carlos - Resfriado
('20000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
'{"temperatura": "37.5°C", "presion": "95/60 mmHg", "frecuencia_cardiaca": "98 lpm", "peso": "28 kg", "talla": "1.35 m"}',
'Nariz con rinorrea hialina abundante. Faringe levemente hiperémica. Auscultación pulmonar normal. Otoscopia normal bilateral.',
'Paciente pediátrico de 10 años con cuadro viral de vías respiratorias altas de 2 días de evolución. ALERGIA A LACTOSA documentada. Tratamiento sintomático. Evolución esperada favorable.',
'2026-01-22 11:30:00-06'),

-- Expediente 5: Laura - Control prenatal
('20000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005',
'{"temperatura": "36.7°C", "presion": "115/75 mmHg", "frecuencia_cardiaca": "80 lpm", "peso": "68 kg", "altura_uterina": "20 cm", "fcf": "140 lpm"}',
'Útero grávido de 20 semanas por altura uterina. Frecuencia cardíaca fetal 140 lpm. Movimientos fetales presentes. Edema leve en miembros inferiores.',
'Paciente femenino de 33 años, G2P1, cursando embarazo de 20 semanas sin complicaciones. Ultrasonido obstétrico solicitado. Continuar con ácido fólico y hierro.',
'2026-01-25 15:45:00-06'),

-- Expediente 6: José - Diabetes
('20000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006',
'{"temperatura": "36.6°C", "presion": "140/90 mmHg", "frecuencia_cardiaca": "78 lpm", "peso": "85 kg", "talla": "1.68 m", "imc": "30.1", "glucosa_capilar": "165 mg/dL"}',
'Abdomen globoso, adiposo. Acantosis nigricans en cuello y axilas. Pulsos pedios disminuidos. Sensibilidad conservada en pies.',
'Paciente masculino de 55 años con diabetes mellitus tipo 2 de 10 años de evolución. Control glucémico subóptimo. Se solicitan estudios de laboratorio. Ajuste de medicación.',
'2026-01-28 10:00:00-06'),

-- Expediente 7: Diana - Esguince
('20000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007',
'{"temperatura": "36.5°C", "presion": "118/76 mmHg", "frecuencia_cardiaca": "70 lpm"}',
'Tobillo derecho con edema moderado y equimosis en región lateral. Dolor a la palpación del ligamento peroneoastragalino anterior. Movilidad limitada por dolor. Rayos X sin fractura.',
'Paciente femenino de 27 años con esguince de tobillo derecho grado II. Mecanismo de inversión durante actividad deportiva. Se indica inmovilización, reposo y fisioterapia.',
'2026-01-29 16:45:00-06'),

-- Expediente 9: Patricia - Alergia
('20000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009',
'{"temperatura": "36.9°C", "presion": "125/80 mmHg", "frecuencia_cardiaca": "88 lpm"}',
'Eritema cutáneo en brazos y tronco. No angioedema. Auscultación pulmonar normal. No disnea.',
'Paciente femenino de 47 años con reacción alérgica leve posterior a ingesta de frutos secos. MÚLTIPLES ALERGIAS DOCUMENTADAS: penicilina, sulfonamidas, látex, frutos secos. Tratamiento antihistamínico.',
'2026-01-30 08:30:00-06'),

-- Expediente 10: María - Seguimiento
('20000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010',
'{"temperatura": "36.5°C", "presion": "118/78 mmHg", "frecuencia_cardiaca": "76 lpm"}',
'Faringe sin hiperemia. Amígdalas de tamaño normal. Adenopatías cervicales no palpables.',
'Paciente en seguimiento de faringitis. Evolución favorable con tratamiento. Asintomática. Alta médica.',
'2026-01-23 09:20:00-06'),

-- Expediente 15: Diana - Seguimiento esguince
('20000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000015',
'{"temperatura": "36.6°C", "presion": "116/74 mmHg"}',
'Tobillo derecho con edema leve residual. Rango de movilidad recuperado en 90%. Marcha sin cojera. Sin dolor significativo.',
'Seguimiento de esguince de tobillo derecho. Recuperación satisfactoria. Continuar con ejercicios de fortalecimiento. Alta de traumatología.',
'2026-02-05 16:30:00-06');

-- ============================================================================
-- DIAGNÓSTICOS (con códigos ICD-10 reales)
-- ============================================================================

INSERT INTO diagnoses (id, appointment_id, medical_record_id, icd10_code, description, severity, diagnosed_at) VALUES
-- Diagnóstico 1: María - Faringitis
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'J02.9', 'Faringitis aguda bacteriana', 'moderate', '2026-01-15 09:30:00-06'),

-- Diagnóstico 2: Roberto - Hipertensión
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'I10', 'Hipertensión arterial esencial (primaria)', 'moderate', '2026-01-20 11:15:00-06'),

-- Diagnóstico 3: Ana - Cefalea tensional
('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'G44.2', 'Cefalea tensional', 'mild', '2026-01-10 14:30:00-06'),

-- Diagnóstico 4: Carlos - Resfriado
('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'J00', 'Rinofaringitis aguda (resfriado común)', 'mild', '2026-01-22 11:30:00-06'),

-- Diagnóstico 5: Laura - Embarazo normal
('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'Z34.0', 'Supervisión de primer embarazo normal', NULL, '2026-01-25 15:45:00-06'),

-- Diagnóstico 6: José - Diabetes tipo 2
('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'E11.9', 'Diabetes mellitus tipo 2 sin complicaciones', 'moderate', '2026-01-28 10:00:00-06'),

-- Diagnóstico 6b: José - Obesidad
('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'E66.9', 'Obesidad no especificada', 'moderate', '2026-01-28 10:00:00-06'),

-- Diagnóstico 7: Diana - Esguince tobillo
('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'S93.4', 'Esguince de tobillo', 'moderate', '2026-01-29 16:45:00-06'),

-- Diagnóstico 9: Patricia - Dermatitis alérgica
('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'L27.9', 'Dermatitis debida a alimento ingerido', 'mild', '2026-01-30 08:30:00-06');

-- ============================================================================
-- PRESCRIPCIONES
-- ============================================================================

INSERT INTO prescriptions (id, appointment_id, medical_record_id, medication_id, dosage, frequency, duration_days, instructions) VALUES
-- Prescripción 1: María - Azitromicina (NO penicilina por alergia)
('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', '500mg', 'Una vez al día', 5, 'Tomar con alimentos. Completar el tratamiento completo.'),

-- Prescripción 2: María - Paracetamol
('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', '500mg', 'Cada 6 horas', 5, 'Tomar solo si hay fiebre o dolor. No exceder 4 gramos diarios.'),

-- Prescripción 3: Roberto - Losartán
('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000007', '50mg', 'Una vez al día', 90, 'Tomar en ayunas. Monitorear presión arterial regularmente.'),

-- Prescripción 4: Ana - Paracetamol
('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000004', '500mg', 'Cada 8 horas', 7, 'Tomar con alimentos si es necesario.'),

-- Prescripción 5: Carlos - Paracetamol (pediátrico)
('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000004', '250mg (media tableta)', 'Cada 6 horas si hay fiebre', 5, 'Dar con abundante agua. Solo si temperatura > 38°C'),

-- Prescripción 6: Laura - Ácido Fólico
('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000013', '5mg', 'Una vez al día', 120, 'Continuar durante todo el embarazo. Tomar en ayunas.'),

-- Prescripción 7: José - Metformina
('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000009', '850mg', 'Dos veces al día (desayuno y cena)', 90, 'Tomar con alimentos para reducir molestias gastrointestinales.'),

-- Prescripción 8: Diana - Ketorolaco
('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000006', '10mg', 'Cada 8 horas', 5, 'Tomar con alimentos. Suspender si hay dolor abdominal.'),

-- Prescripción 9: Diana - Diclofenaco gel
('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000015', 'Aplicación tópica', 'Tres veces al día', 10, 'Aplicar en tobillo afectado con masaje suave. Lavar manos después.'),

-- Prescripción 10: Patricia - Cetirizina
('40000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000017', '10mg', 'Una vez al día', 7, 'Tomar en la noche. Puede causar somnolencia.');

-- ============================================================================
-- PROCEDIMIENTOS
-- ============================================================================

INSERT INTO procedures (id, appointment_id, medical_record_id, procedure_code, description, notes, performed_at) VALUES
-- Procedimiento 1: Laura - Ultrasonido obstétrico
('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'IMG-002', 'Ultrasonido obstétrico estructural semana 20', 'Feto único viable. Anatomía fetal sin alteraciones. Placenta normoinserta. Líquido amniótico normal.', '2026-01-25 15:30:00-06'),

-- Procedimiento 2: Roberto - Electrocardiograma
('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'IMG-003', 'Electrocardiograma de 12 derivaciones', 'Ritmo sinusal. FC 72 lpm. Sin alteraciones isquémicas. Eje eléctrico normal.', '2026-01-20 11:00:00-06'),

-- Procedimiento 3: Diana - Radiografía tobillo
('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'IMG-001', 'Radiografía de tobillo derecho (AP y lateral)', 'Sin evidencia de fractura. Partes blandas aumentadas de volumen. Espacios articulares conservados.', '2026-01-29 16:30:00-06'),

-- Procedimiento 4: Diana - Aplicación de inyección (analgésico)
('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007', 'PROC-002', 'Aplicación de ketorolaco IM', 'Aplicación de 60mg de ketorolaco intramuscular en glúteo derecho. Paciente toleró bien el procedimiento.', '2026-01-29 16:50:00-06');

-- ============================================================================
-- FACTURAS (10 facturas con diferentes estados y escenarios)
-- ============================================================================

INSERT INTO invoices (id, invoice_number, patient_id, appointment_id, insurance_policy_id, subtotal, tax, total, insurance_coverage, patient_responsibility, status, issue_date, due_date) VALUES
-- Factura 1: María - PAGADA completamente (sin seguro)
('60000000-0000-0000-0000-000000000001', 'FAC-2026-00001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', NULL, 865.00, 138.40, 1003.40, 0.00, 1003.40, 'draft', '2026-01-15', '2026-01-30'),

-- Factura 2: Roberto - PAGADA con seguro (80% cobertura)
('60000000-0000-0000-0000-000000000002', 'FAC-2026-00002', 'a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 1550.00, 248.00, 1798.00, 1438.40, 359.60, 'draft', '2026-01-20', '2026-02-20'),

-- Factura 3: Ana - VENCIDA sin pagos (OVERDUE)
('60000000-0000-0000-0000-000000000003', 'FAC-2026-00003', 'a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', NULL, 635.00, 101.60, 736.60, 0.00, 736.60, 'overdue', '2026-01-10', '2026-01-25'),

-- Factura 4: Carlos - PAGADA con seguro (90% cobertura)
('60000000-0000-0000-0000-000000000004', 'FAC-2026-00004', 'a0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 835.00, 133.60, 968.60, 871.74, 96.86, 'draft', '2026-01-22', '2026-02-22'),

-- Factura 5: Laura - PAGADA con seguro (100% cobertura)
('60000000-0000-0000-0000-000000000005', 'FAC-2026-00005', 'a0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000003', 2040.00, 326.40, 2366.40, 2366.40, 0.00, 'draft', '2026-01-25', '2026-02-25'),

-- Factura 6: José - PARCIALMENTE PAGADA (sin seguro vigente)
('60000000-0000-0000-0000-000000000006', 'FAC-2026-00006', 'a0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', NULL, 1070.00, 171.20, 1241.20, 0.00, 1241.20, 'draft', '2026-01-28', '2026-02-28'),

-- Factura 7: Diana - PAGADA con seguro (60% cobertura)
('60000000-0000-0000-0000-000000000007', 'FAC-2026-00007', 'a0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000005', 1805.00, 288.80, 2093.80, 1256.28, 837.52, 'draft', '2026-01-29', '2026-02-28'),

-- Factura 8: Patricia - PENDIENTE de pago (sin seguro)
('60000000-0000-0000-0000-000000000008', 'FAC-2026-00008', 'a0000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009', NULL, 665.00, 106.40, 771.40, 0.00, 771.40, 'pending', '2026-01-30', '2026-02-15'),

-- Factura 9: María - Seguimiento PAGADA
('60000000-0000-0000-0000-000000000009', 'FAC-2026-00009', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010', NULL, 600.00, 96.00, 696.00, 0.00, 696.00, 'draft', '2026-01-23', '2026-02-08'),

-- Factura 10: Diana - Seguimiento PAGADA con seguro
('60000000-0000-0000-0000-000000000010', 'FAC-2026-00010', 'a0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000015', 'd0000000-0000-0000-0000-000000000005', 1200.00, 192.00, 1392.00, 835.20, 556.80, 'draft', '2026-02-05', '2026-03-07');


-- Registrar el ultimo numero de secuencia para que la aplicacion genere
-- numeros continuos a partir del siguiente (FAC-2026-00011).
INSERT INTO invoice_sequences (year, last_sequence) VALUES (2026, 10)
ON CONFLICT (year) DO UPDATE SET last_sequence = EXCLUDED.last_sequence;

-- ============================================================================
-- CONCEPTOS DE FACTURA (invoice_items)
-- ============================================================================

-- Items Factura 1: María (Consulta + Medicamentos)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', NULL, 'service', 'Consulta Medicina General', 1, 600.00, 600.00),
('60000000-0000-0000-0000-000000000001', NULL, 'f0000000-0000-0000-0000-000000000002', 'medication', 'Azitromicina 500mg (Caja con 5 tabletas)', 1, 180.00, 180.00),
('60000000-0000-0000-0000-000000000001', NULL, 'f0000000-0000-0000-0000-000000000004', 'medication', 'Paracetamol 500mg (Caja con 10 tabletas)', 1, 35.00, 35.00),
('60000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', NULL, 'service', 'Examen General de Orina', 1, 180.00, 180.00),
('60000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000012', NULL, 'service', 'Aplicación de Inyección (antibiótico)', 1, 150.00, 150.00);

-- Items Factura 2: Roberto (Consulta + ECG + Medicamento)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', NULL, 'service', 'Consulta Especialista (Cardiología)', 1, 1200.00, 1200.00),
('60000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000010', NULL, 'service', 'Electrocardiograma', 1, 350.00, 350.00);

-- Items Factura 3: Ana (Consulta + Medicamento)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', NULL, 'service', 'Consulta Medicina General', 1, 600.00, 600.00),
('60000000-0000-0000-0000-000000000003', NULL, 'f0000000-0000-0000-0000-000000000004', 'medication', 'Paracetamol 500mg (Caja con 10 tabletas)', 1, 35.00, 35.00);

-- Items Factura 4: Carlos (Consulta Pediátrica + Medicamento)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', NULL, 'service', 'Consulta Pediátrica', 1, 800.00, 800.00),
('60000000-0000-0000-0000-000000000004', NULL, 'f0000000-0000-0000-0000-000000000004', 'medication', 'Paracetamol 500mg (Caja con 10 tabletas)', 1, 35.00, 35.00);

-- Items Factura 5: Laura (Consulta Ginecológica + Ultrasonido + Ácido Fólico)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', NULL, 'service', 'Consulta Especialista (Ginecología)', 1, 1200.00, 1200.00),
('60000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000009', NULL, 'service', 'Ultrasonido Obstétrico', 1, 800.00, 800.00),
('60000000-0000-0000-0000-000000000005', NULL, 'f0000000-0000-0000-0000-000000000013', 'medication', 'Ácido Fólico 5mg (Caja con 30 tabletas)', 1, 40.00, 40.00);

-- Items Factura 6: José (Consulta + Laboratorios + Medicamento)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', NULL, 'service', 'Consulta Medicina General', 1, 600.00, 600.00),
('60000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004', NULL, 'service', 'Química Sanguínea 6 Elementos', 1, 350.00, 350.00),
('60000000-0000-0000-0000-000000000006', NULL, 'f0000000-0000-0000-0000-000000000009', 'medication', 'Metformina 850mg (Caja con 30 tabletas)', 1, 120.00, 120.00);

-- Items Factura 7: Diana (Consulta + Radiografía + Medicamentos + Inyección)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', NULL, 'service', 'Consulta Especialista (Traumatología)', 1, 1200.00, 1200.00),
('60000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000008', NULL, 'service', 'Radiografía Simple (Tobillo)', 1, 400.00, 400.00),
('60000000-0000-0000-0000-000000000007', NULL, 'f0000000-0000-0000-0000-000000000006', 'medication', 'Ketorolaco 10mg (Caja con 10 tabletas)', 1, 65.00, 65.00),
('60000000-0000-0000-0000-000000000007', NULL, 'f0000000-0000-0000-0000-000000000015', 'medication', 'Diclofenaco Gel 1% (Tubo 60g)', 1, 120.00, 120.00),
('60000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000012', NULL, 'service', 'Aplicación de Inyección (analgésico)', 1, 150.00, 150.00);

-- Items Factura 8: Patricia (Consulta + Medicamento)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000001', NULL, 'service', 'Consulta Medicina General', 1, 600.00, 600.00),
('60000000-0000-0000-0000-000000000008', NULL, 'f0000000-0000-0000-0000-000000000017', 'medication', 'Cetirizina 10mg (Caja con 10 tabletas)', 1, 65.00, 65.00);

-- Items Factura 9: María seguimiento (Solo consulta)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000001', NULL, 'service', 'Consulta Medicina General (Seguimiento)', 1, 600.00, 600.00);

-- Items Factura 10: Diana seguimiento (Consulta + Terapias)
INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000002', NULL, 'service', 'Consulta Especialista (Seguimiento Traumatología)', 1, 1200.00, 1200.00);

-- ============================================================================
-- PAGOS
-- ============================================================================

-- Pagos Factura 1: María - PAGADA (efectivo completo)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000001', 1003.40, 'cash', NULL, 'Pago en efectivo al momento de la consulta', '2026-01-15 10:00:00-06');

-- Pagos Factura 2: Roberto - PAGADA (80% seguro + 20% paciente tarjeta)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000002', 1438.40, 'insurance', 'SMP-CLAIM-2026-00123', 'Pago de aseguradora Seguros del Pacífico', '2026-01-25 00:00:00-06'),
('60000000-0000-0000-0000-000000000002', 359.60, 'credit_card', '****1234 AUTH:789456', 'Copago paciente con tarjeta Visa', '2026-01-20 11:30:00-06');

-- Factura 3: Ana - SIN PAGOS (vencida)

-- Pagos Factura 4: Carlos - PAGADA (90% seguro + 10% paciente efectivo)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000004', 871.74, 'insurance', 'ANS-CLAIM-2026-00456', 'Pago de Aseguradora Nacional de Salud', '2026-01-27 00:00:00-06'),
('60000000-0000-0000-0000-000000000004', 96.86, 'cash', NULL, 'Copago en efectivo', '2026-01-22 11:45:00-06');

-- Pagos Factura 5: Laura - PAGADA (100% seguro)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000005', 2366.40, 'insurance', 'PFS-CLAIM-2026-00789', 'Pago completo por Protección Familiar Seguros', '2026-01-30 00:00:00-06');

-- Pagos Factura 6: José - PARCIALMENTE PAGADA (abono de $500 de $1241.20)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000006', 500.00, 'cash', NULL, 'Abono inicial. Adeuda $741.20', '2026-01-28 10:30:00-06');

-- Pagos Factura 7: Diana - PAGADA (60% seguro + 40% paciente transferencia)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000007', 1256.28, 'insurance', 'ANS-CLAIM-2026-00567', 'Pago de aseguradora', '2026-02-03 00:00:00-06'),
('60000000-0000-0000-0000-000000000007', 837.52, 'bank_transfer', 'SPEI-123456789', 'Pago por transferencia bancaria', '2026-01-29 17:00:00-06');

-- Factura 8: Patricia - SIN PAGOS (pendiente)

-- Pagos Factura 9: María seguimiento - PAGADA (efectivo)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000009', 696.00, 'cash', NULL, 'Pago en efectivo', '2026-01-23 09:30:00-06');

-- Pagos Factura 10: Diana seguimiento - PAGADA (60% seguro + 40% tarjeta débito)
INSERT INTO payments (invoice_id, amount, payment_method, reference_number, notes, payment_date) VALUES
('60000000-0000-0000-0000-000000000010', 835.20, 'insurance', 'ANS-CLAIM-2026-00678', 'Pago de aseguradora', '2026-02-06 00:00:00-06'),
('60000000-0000-0000-0000-000000000010', 556.80, 'debit_card', '****5678 AUTH:456789', 'Copago con tarjeta débito', '2026-02-05 16:45:00-06');

-- ============================================================================
-- MENSAJES DE VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    v_patients_count INTEGER;
    v_doctors_count INTEGER;
    v_appointments_count INTEGER;
    v_invoices_count INTEGER;
    v_payments_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_patients_count FROM patients;
    SELECT COUNT(*) INTO v_doctors_count FROM doctors;
    SELECT COUNT(*) INTO v_appointments_count FROM appointments;
    SELECT COUNT(*) INTO v_invoices_count FROM invoices;
    SELECT COUNT(*) INTO v_payments_count FROM payments;

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '  ✅ SEEDS CARGADOS EXITOSAMENTE';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN DE DATOS:';
    RAISE NOTICE '  • Pacientes: %', v_patients_count;
    RAISE NOTICE '  • Médicos: %', v_doctors_count;
    RAISE NOTICE '  • Aseguradoras: 4 (3 activas, 1 inactiva)';
    RAISE NOTICE '  • Pólizas de Seguro: 6 (4 activas, 2 vencidas)';
    RAISE NOTICE '  • Citas: % (9 completadas, 1 cancelada, 1 no-show, 2 futuras, 1 en progreso)', v_appointments_count;
    RAISE NOTICE '  • Expedientes Clínicos: 10';
    RAISE NOTICE '  • Diagnósticos: 9 (con códigos ICD-10 reales)';
    RAISE NOTICE '  • Prescripciones: 10';
    RAISE NOTICE '  • Procedimientos: 4';
    RAISE NOTICE '  • Servicios Médicos: 15 (14 activos, 1 inactivo)';
    RAISE NOTICE '  • Medicamentos: 20 (19 activos, 1 inactivo)';
    RAISE NOTICE '  • Facturas: %', v_invoices_count;
    RAISE NOTICE '  • Pagos: %', v_payments_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎭 ESCENARIOS DE PRUEBA INCLUIDOS:';
    RAISE NOTICE '  ✓ Pacientes con alergias críticas (María, Patricia)';
    RAISE NOTICE '  ✓ Facturas con seguro médico (80%%, 90%%, 100%% cobertura)';
    RAISE NOTICE '  ✓ Facturas sin seguro (pago directo)';
    RAISE NOTICE '  ✓ Factura vencida sin pagos (Ana - OVERDUE)';
    RAISE NOTICE '  ✓ Factura parcialmente pagada (José - $500 de $1241.20)';
    RAISE NOTICE '  ✓ Citas canceladas y no-show';
    RAISE NOTICE '  ✓ Consultas de seguimiento';
    RAISE NOTICE '  ✓ Paciente pediátrico con seguro familiar';
    RAISE NOTICE '  ✓ Paciente embarazada con cobertura 100%%';
    RAISE NOTICE '  ✓ Paciente con diabetes y obesidad (múltiples diagnósticos)';
    RAISE NOTICE '  ✓ Lesión deportiva con procedimientos';
    RAISE NOTICE '  ✓ Diagnósticos con códigos ICD-10 estándar';
    RAISE NOTICE '  ✓ Medicamentos con y sin prescripción';
    RAISE NOTICE '';
    RAISE NOTICE '💡 DATOS LISTOS PARA:';
    RAISE NOTICE '  • Testing de lógica de facturación';
    RAISE NOTICE '  • Pruebas de validación de alergias vs prescripciones';
    RAISE NOTICE '  • Validación de cobertura de seguros';
    RAISE NOTICE '  • Reportes de cuentas por cobrar';
    RAISE NOTICE '  • Búsqueda de expedientes clínicos';
    RAISE NOTICE '  • Auditoría de precios';
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- Poblar scheduled_end_at para todas las citas insertadas.
-- Esta columna fue agregada en V4 y debe ser mantenida por la capa de aplicación.
UPDATE appointments
SET scheduled_end_at = scheduled_at + duration_minutes * INTERVAL '1 minute'
WHERE scheduled_end_at IS NULL;
