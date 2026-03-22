import type { MedicalRecordResponse } from '@/types/medical-record'
import { PATIENT_SUMMARIES } from './patients.mock'
import { APPOINTMENT_SUMMARIES } from './appointments.mock'
import { MEDICATION_SUMMARIES } from './medications-catalog.mock'

export const MEDICAL_RECORDS_MOCK: MedicalRecordResponse[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000001'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000001'],
    vitalSigns: {
      temperatura: '38.2°C',
      presion: '120/80 mmHg',
      frecuencia_cardiaca: '82 lpm',
      frecuencia_respiratoria: '18 rpm',
      saturacion_oxigeno: '98%',
    },
    physicalExam:
      'Faringe hiperémica con exudado blanquecino. Amígdalas aumentadas de tamaño. Adenopatías cervicales palpables. Resto de exploración normal.',
    clinicalNotes:
      'Paciente femenino de 40 años con cuadro de 3 días de evolución de odinofagia, fiebre y malestar general. ALERGIA A PENICILINA (anafilaxia documentada). Se prescribe antibiótico alternativo. Reposo relativo.',
    recordDate: '2026-01-15T09:30:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000001',
        icd10Code: 'J02.9',
        description: 'Faringitis aguda bacteriana',
        severity: 'moderate',
        diagnosedAt: '2026-01-15T09:30:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000001',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000002'],
        dosage: '500mg',
        frequency: 'Una vez al día',
        durationDays: 5,
        instructions: 'Tomar con alimentos. Completar el tratamiento completo.',
        createdAt: '2026-01-15T09:30:00-06:00',
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000004'],
        dosage: '500mg',
        frequency: 'Cada 6 horas',
        durationDays: 5,
        instructions: 'Tomar solo si hay fiebre o dolor. No exceder 4 gramos diarios.',
        createdAt: '2026-01-15T09:30:00-06:00',
      },
    ],
    procedures: [],
    createdAt: '2026-01-15T09:30:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000002'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000002'],
    vitalSigns: {
      temperatura: '36.5°C',
      presion: '135/85 mmHg',
      frecuencia_cardiaca: '72 lpm',
      peso: '78 kg',
      talla: '1.72 m',
      imc: '26.3',
    },
    physicalExam:
      'Ruidos cardíacos rítmicos, sin soplos. Campos pulmonares bien ventilados. Abdomen blando, no doloroso. Pulsos periféricos presentes y simétricos.',
    clinicalNotes:
      'Paciente masculino de 70 años con hipertensión arterial controlada. Apegado a tratamiento. Continuar con Losartán 50mg/día. Control en 3 meses. ECG solicitado.',
    recordDate: '2026-01-20T11:15:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000002',
        icd10Code: 'I10',
        description: 'Hipertensión arterial esencial (primaria)',
        severity: 'moderate',
        diagnosedAt: '2026-01-20T11:15:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000003',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000007'],
        dosage: '50mg',
        frequency: 'Una vez al día',
        durationDays: 90,
        instructions: 'Tomar en ayunas. Monitorear presión arterial regularmente.',
        createdAt: '2026-01-20T11:15:00-06:00',
      },
    ],
    procedures: [
      {
        id: '50000000-0000-0000-0000-000000000002',
        procedureCode: 'IMG-003',
        description: 'Electrocardiograma de 12 derivaciones',
        notes: 'Ritmo sinusal. FC 72 lpm. Sin alteraciones isquémicas. Eje eléctrico normal.',
        performedAt: '2026-01-20T11:00:00-06:00',
      },
    ],
    createdAt: '2026-01-20T11:15:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000003'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000003'],
    vitalSigns: {
      temperatura: '36.8°C',
      presion: '110/70 mmHg',
      frecuencia_cardiaca: '76 lpm',
    },
    physicalExam:
      'Exploración neurológica normal. Pupilas isocóricas normorreactivas. Pares craneales íntegros. Fondo de ojo normal.',
    clinicalNotes:
      'Paciente femenino de 25 años con cefalea tensional recurrente. Relacionada con estrés laboral. Se prescribe analgésico y se recomienda manejo de estrés.',
    recordDate: '2026-01-10T14:30:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000003',
        icd10Code: 'G44.2',
        description: 'Cefalea tensional',
        severity: 'mild',
        diagnosedAt: '2026-01-10T14:30:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000004',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000004'],
        dosage: '500mg',
        frequency: 'Cada 8 horas',
        durationDays: 7,
        instructions: 'Tomar con alimentos si es necesario.',
        createdAt: '2026-01-10T14:30:00-06:00',
      },
    ],
    procedures: [],
    createdAt: '2026-01-10T14:30:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000004'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000004'],
    vitalSigns: {
      temperatura: '37.5°C',
      presion: '95/60 mmHg',
      frecuencia_cardiaca: '98 lpm',
      peso: '28 kg',
      talla: '1.35 m',
    },
    physicalExam:
      'Nariz con rinorrea hialina abundante. Faringe levemente hiperémica. Auscultación pulmonar normal. Otoscopia normal bilateral.',
    clinicalNotes:
      'Paciente pediátrico de 10 años con cuadro viral de vías respiratorias altas de 2 días de evolución. ALERGIA A LACTOSA documentada. Tratamiento sintomático. Evolución esperada favorable.',
    recordDate: '2026-01-22T11:30:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000004',
        icd10Code: 'J00',
        description: 'Rinofaringitis aguda (resfriado común)',
        severity: 'mild',
        diagnosedAt: '2026-01-22T11:30:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000005',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000004'],
        dosage: '250mg (media tableta)',
        frequency: 'Cada 6 horas si hay fiebre',
        durationDays: 5,
        instructions: 'Dar con abundante agua. Solo si temperatura > 38°C',
        createdAt: '2026-01-22T11:30:00-06:00',
      },
    ],
    procedures: [],
    createdAt: '2026-01-22T11:30:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000005'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000005'],
    vitalSigns: {
      temperatura: '36.7°C',
      presion: '115/75 mmHg',
      frecuencia_cardiaca: '80 lpm',
      peso: '68 kg',
      altura_uterina: '20 cm',
      fcf: '140 lpm',
    },
    physicalExam:
      'Útero grávido de 20 semanas por altura uterina. Frecuencia cardíaca fetal 140 lpm. Movimientos fetales presentes. Edema leve en miembros inferiores.',
    clinicalNotes:
      'Paciente femenino de 33 años, G2P1, cursando embarazo de 20 semanas sin complicaciones. Ultrasonido obstétrico solicitado. Continuar con ácido fólico y hierro.',
    recordDate: '2026-01-25T15:45:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000005',
        icd10Code: 'Z34.0',
        description: 'Supervisión de primer embarazo normal',
        severity: null,
        diagnosedAt: '2026-01-25T15:45:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000006',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000013'],
        dosage: '5mg',
        frequency: 'Una vez al día',
        durationDays: 120,
        instructions: 'Continuar durante todo el embarazo. Tomar en ayunas.',
        createdAt: '2026-01-25T15:45:00-06:00',
      },
    ],
    procedures: [
      {
        id: '50000000-0000-0000-0000-000000000001',
        procedureCode: 'IMG-002',
        description: 'Ultrasonido obstétrico estructural semana 20',
        notes: 'Feto único viable. Anatomía fetal sin alteraciones. Placenta normoinserta. Líquido amniótico normal.',
        performedAt: '2026-01-25T15:30:00-06:00',
      },
    ],
    createdAt: '2026-01-25T15:45:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000006',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000006'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000006'],
    vitalSigns: {
      temperatura: '36.6°C',
      presion: '140/90 mmHg',
      frecuencia_cardiaca: '78 lpm',
      peso: '85 kg',
      talla: '1.68 m',
      imc: '30.1',
      glucosa_capilar: '165 mg/dL',
    },
    physicalExam:
      'Abdomen globoso, adiposo. Acantosis nigricans en cuello y axilas. Pulsos pedios disminuidos. Sensibilidad conservada en pies.',
    clinicalNotes:
      'Paciente masculino de 55 años con diabetes mellitus tipo 2 de 10 años de evolución. Control glucémico subóptimo. Se solicitan estudios de laboratorio. Ajuste de medicación.',
    recordDate: '2026-01-28T10:00:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000006',
        icd10Code: 'E11.9',
        description: 'Diabetes mellitus tipo 2 sin complicaciones',
        severity: 'moderate',
        diagnosedAt: '2026-01-28T10:00:00-06:00',
      },
      {
        id: '30000000-0000-0000-0000-000000000007',
        icd10Code: 'E66.9',
        description: 'Obesidad no especificada',
        severity: 'moderate',
        diagnosedAt: '2026-01-28T10:00:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000007',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000009'],
        dosage: '850mg',
        frequency: 'Dos veces al día (desayuno y cena)',
        durationDays: 90,
        instructions: 'Tomar con alimentos para reducir molestias gastrointestinales.',
        createdAt: '2026-01-28T10:00:00-06:00',
      },
    ],
    procedures: [],
    createdAt: '2026-01-28T10:00:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000007',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000007'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000007'],
    vitalSigns: {
      temperatura: '36.5°C',
      presion: '118/76 mmHg',
      frecuencia_cardiaca: '70 lpm',
    },
    physicalExam:
      'Tobillo derecho con edema moderado y equimosis en región lateral. Dolor a la palpación del ligamento peroneoastragalino anterior. Movilidad limitada por dolor. Rayos X sin fractura.',
    clinicalNotes:
      'Paciente femenino de 27 años con esguince de tobillo derecho grado II. Mecanismo de inversión durante actividad deportiva. Se indica inmovilización, reposo y fisioterapia.',
    recordDate: '2026-01-29T16:45:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000008',
        icd10Code: 'S93.4',
        description: 'Esguince de tobillo',
        severity: 'moderate',
        diagnosedAt: '2026-01-29T16:45:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000008',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000006'],
        dosage: '10mg',
        frequency: 'Cada 8 horas',
        durationDays: 5,
        instructions: 'Tomar con alimentos. Suspender si hay dolor abdominal.',
        createdAt: '2026-01-29T16:45:00-06:00',
      },
      {
        id: '40000000-0000-0000-0000-000000000009',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000015'],
        dosage: 'Aplicación tópica',
        frequency: 'Tres veces al día',
        durationDays: 10,
        instructions: 'Aplicar en tobillo afectado con masaje suave. Lavar manos después.',
        createdAt: '2026-01-29T16:45:00-06:00',
      },
    ],
    procedures: [
      {
        id: '50000000-0000-0000-0000-000000000003',
        procedureCode: 'IMG-001',
        description: 'Radiografía de tobillo derecho (AP y lateral)',
        notes: 'Sin evidencia de fractura. Partes blandas aumentadas de volumen. Espacios articulares conservados.',
        performedAt: '2026-01-29T16:30:00-06:00',
      },
      {
        id: '50000000-0000-0000-0000-000000000004',
        procedureCode: 'PROC-002',
        description: 'Aplicación de ketorolaco IM',
        notes: 'Aplicación de 60mg de ketorolaco intramuscular en glúteo derecho. Paciente toleró bien el procedimiento.',
        performedAt: '2026-01-29T16:50:00-06:00',
      },
    ],
    createdAt: '2026-01-29T16:45:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000009',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000009'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000009'],
    vitalSigns: {
      temperatura: '36.9°C',
      presion: '125/80 mmHg',
      frecuencia_cardiaca: '88 lpm',
    },
    physicalExam:
      'Eritema cutáneo en brazos y tronco. No angioedema. Auscultación pulmonar normal. No disnea.',
    clinicalNotes:
      'Paciente femenino de 47 años con reacción alérgica leve posterior a ingesta de frutos secos. MÚLTIPLES ALERGIAS DOCUMENTADAS: penicilina, sulfonamidas, látex, frutos secos. Tratamiento antihistamínico.',
    recordDate: '2026-01-30T08:30:00-06:00',
    diagnoses: [
      {
        id: '30000000-0000-0000-0000-000000000009',
        icd10Code: 'L27.9',
        description: 'Dermatitis debida a alimento ingerido',
        severity: 'mild',
        diagnosedAt: '2026-01-30T08:30:00-06:00',
      },
    ],
    prescriptions: [
      {
        id: '40000000-0000-0000-0000-000000000010',
        medication: MEDICATION_SUMMARIES['f0000000-0000-0000-0000-000000000017'],
        dosage: '10mg',
        frequency: 'Una vez al día',
        durationDays: 7,
        instructions: 'Tomar en la noche. Puede causar somnolencia.',
        createdAt: '2026-01-30T08:30:00-06:00',
      },
    ],
    procedures: [],
    createdAt: '2026-01-30T08:30:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000010',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000001'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000010'],
    vitalSigns: {
      temperatura: '36.5°C',
      presion: '118/78 mmHg',
      frecuencia_cardiaca: '76 lpm',
    },
    physicalExam:
      'Faringe sin hiperemia. Amígdalas de tamaño normal. Adenopatías cervicales no palpables.',
    clinicalNotes:
      'Paciente en seguimiento de faringitis. Evolución favorable con tratamiento. Asintomática. Alta médica.',
    recordDate: '2026-01-23T09:20:00-06:00',
    diagnoses: [],
    prescriptions: [],
    procedures: [],
    createdAt: '2026-01-23T09:20:00-06:00',
  },
  {
    id: '20000000-0000-0000-0000-000000000015',
    patient: PATIENT_SUMMARIES['a0000000-0000-0000-0000-000000000007'],
    appointment: APPOINTMENT_SUMMARIES['10000000-0000-0000-0000-000000000015'],
    vitalSigns: {
      temperatura: '36.6°C',
      presion: '116/74 mmHg',
    },
    physicalExam:
      'Tobillo derecho con edema leve residual. Rango de movilidad recuperado en 90%. Marcha sin cojera. Sin dolor significativo.',
    clinicalNotes:
      'Seguimiento de esguince de tobillo derecho. Recuperación satisfactoria. Continuar con ejercicios de fortalecimiento. Alta de traumatología.',
    recordDate: '2026-02-05T16:30:00-06:00',
    diagnoses: [],
    prescriptions: [],
    procedures: [],
    createdAt: '2026-02-05T16:30:00-06:00',
  },
]
