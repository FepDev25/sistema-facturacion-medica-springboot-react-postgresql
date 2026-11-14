-- ============================================================================
-- V14 - Fixtures deterministas para Playwright
-- ============================================================================
-- Solo se carga con perfiles que incluyen classpath:db/seeds (dev-homelab y
-- ci). No se aplica en produccion. Los IDs y numeros son estables para que los
-- specs no dependan de "el primer registro de la tabla".
-- ============================================================================

INSERT INTO patients (id, dni, first_name, last_name, birth_date, gender, phone, email, address, blood_type, allergies) VALUES
('a0000000-0000-0000-0000-000000000099', '99999999', 'E2E', 'Cobertura', '1990-05-05', 'female', '+52-555-9999-0001', 'e2e.cobertura@sfm.local', 'Calle E2E 100', 'O+', 'Penicilina');

INSERT INTO insurance_policies (id, patient_id, provider_id, policy_number, coverage_percentage, deductible, start_date, end_date, is_active) VALUES
('d0000000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000099', 'c0000000-0000-0000-0000-000000000001', 'POL-E2E-0001', 80.00, 0.00, '2026-01-01', '2027-12-31', TRUE);

INSERT INTO appointments (id, patient_id, doctor_id, scheduled_at, duration_minutes, status, chief_complaint, notes) VALUES
-- Cita completada con expediente: detalle de cita con "Ver expediente".
('10000000-0000-0000-0000-000000000096', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-11-01 10:00:00-06', 30, 'completed', 'Consulta E2E con expediente', 'Notas de la consulta E2E'),
-- Cita en curso del doctor1: permite abrir el drawer de completar.
('10000000-0000-0000-0000-000000000097', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-11-13 10:00:00-06', 30, 'in_progress', 'Consulta E2E en curso', 'Atención en curso'),
-- Cita confirmada del doctor1: permite validar "Iniciar cita".
('10000000-0000-0000-0000-000000000098', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-12-02 10:00:00-06', 30, 'confirmed', 'Consulta E2E confirmada', 'Confirmada'),
-- Cita programada del doctor1: permite validar "Confirmar cita".
('10000000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-12-01 10:00:00-06', 30, 'scheduled', 'Consulta E2E programada', NULL),
-- Cita programada sin notas: valida los textos de respaldo del detalle.
('10000000-0000-0000-0000-000000000095', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-12-03 10:00:00-06', 30, 'scheduled', NULL, NULL),
-- Citas de apoyo para las facturas deterministas.
('10000000-0000-0000-0000-000000000094', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-11-02 10:00:00-06', 30, 'completed', 'Factura E2E pagable', NULL),
('10000000-0000-0000-0000-000000000093', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-11-03 10:00:00-06', 30, 'completed', 'Factura E2E borrador', NULL),
('10000000-0000-0000-0000-000000000092', 'a0000000-0000-0000-0000-000000000099', 'b0000000-0000-0000-0000-000000000001', '2026-11-04 10:00:00-06', 30, 'completed', 'Factura E2E cancelable', NULL);

INSERT INTO medical_records (id, patient_id, appointment_id, vital_signs, physical_exam, clinical_notes, record_date) VALUES
('20000000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000096',
'{"temperatura": "36.5°C", "presion": "120/80 mmHg"}',
'Examen físico sin hallazgos relevantes.',
'Paciente E2E con notas clínicas para validar extracción y consulta de historial.',
'2026-11-01 10:30:00-06');

-- Factura 1: poliza al 80 %, pendiente. Pagar la responsabilidad la deja PAID.
INSERT INTO invoices (id, invoice_number, patient_id, appointment_id, insurance_policy_id, subtotal, tax, total, insurance_coverage, patient_responsibility, status, issue_date, due_date) VALUES
('60000000-0000-0000-0000-000000000099', 'FAC-E2E-00001', 'a0000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000096', 'd0000000-0000-0000-0000-000000000099', 1000.00, 160.00, 1160.00, 928.00, 232.00, 'pending', '2026-11-01', '2026-12-01'),
-- Factura 2: pagable sin seguro (drawer de pago y flujo de cobro).
('60000000-0000-0000-0000-000000000098', 'FAC-E2E-00002', 'a0000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000094', NULL, 500.00, 80.00, 580.00, 0.00, 580.00, 'pending', '2026-11-01', '2026-12-01'),
-- Factura 3: borrador para confirmar desde la UI.
('60000000-0000-0000-0000-000000000097', 'FAC-E2E-00003', 'a0000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000095', NULL, 300.00, 48.00, 348.00, 0.00, 348.00, 'draft', '2026-11-01', '2026-12-01'),
-- Factura 4: pendiente sin pagos (estado vacío de pagos).
('60000000-0000-0000-0000-000000000096', 'FAC-E2E-00004', 'a0000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000093', NULL, 200.00, 32.00, 232.00, 0.00, 232.00, 'pending', '2026-11-01', '2026-12-01'),
-- Factura 5: borrador que no se muta (Agregar item).
('60000000-0000-0000-0000-000000000095', 'FAC-E2E-00005', 'a0000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000092', NULL, 400.00, 64.00, 464.00, 0.00, 464.00, 'draft', '2026-11-01', '2026-12-01'),
-- Factura 6: borrador que el spec de cancelacion consume al final.
('60000000-0000-0000-0000-000000000094', 'FAC-E2E-00006', 'a0000000-0000-0000-0000-000000000099', '10000000-0000-0000-0000-000000000096', NULL, 150.00, 24.00, 174.00, 0.00, 174.00, 'draft', '2026-11-01', '2026-12-01');

INSERT INTO invoice_items (invoice_id, service_id, medication_id, item_type, description, quantity, unit_price, subtotal) VALUES
('60000000-0000-0000-0000-000000000099', 'e0000000-0000-0000-0000-000000000002', NULL, 'service', 'Consulta especialista E2E', 1, 1000.00, 1000.00),
('60000000-0000-0000-0000-000000000098', 'e0000000-0000-0000-0000-000000000001', NULL, 'service', 'Consulta general E2E', 1, 500.00, 500.00),
('60000000-0000-0000-0000-000000000097', 'e0000000-0000-0000-0000-000000000005', NULL, 'service', 'Biometría hemática E2E', 1, 300.00, 300.00),
('60000000-0000-0000-0000-000000000096', 'e0000000-0000-0000-0000-000000000006', NULL, 'service', 'Examen de orina E2E', 1, 200.00, 200.00),
('60000000-0000-0000-0000-000000000095', 'e0000000-0000-0000-0000-000000000008', NULL, 'service', 'Radiografía E2E', 1, 400.00, 400.00),
('60000000-0000-0000-0000-000000000094', 'e0000000-0000-0000-0000-000000000012', NULL, 'service', 'Inyección E2E', 1, 150.00, 150.00);
