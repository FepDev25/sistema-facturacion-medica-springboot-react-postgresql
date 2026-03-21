plan de implementación:                            
                                                                                                                                                                        
---                                                                                                                                                                      
Estado actual del frontend                                                                                                                                               
                                                                                                                                                                        
Lo que existe:                                                                                                                                                           
- Scaffold puro de Vite + React 19 + TypeScript + Tailwind — solo App.tsx, main.tsx, App.css, index.css                                                                  
- Tailwind instalado pero sin Shadcn/ui ni ningún componente                                                                                                             
- src/ sin ninguna carpeta de la arquitectura definida en CLAUDE.md                                                                                                      
                                                                                                                                                                        
Lo que falta — todo:                                                                                                                                                     
- Dependencias del stack: TanStack Query v5, TanStack Router, React Hook Form, Zod, Axios, Shadcn/ui                                                                     
- Estructura de carpetas completa (api/, components/, features/, hooks/, lib/, mocks/, routes/, types/)                                                                  
- Tipos TypeScript (0 archivos)                                                                                                                                          
- Mocks (0 archivos)                                                                                                                                                     
- Features (0 implementadas)                                                                                                                                             
                                                                                                                                                                        
---                                                                                                                                                                      
Fase 0 — Setup de infraestructura (prerrequisito de todo)                                                                                                                
                                                                                                                                                                        
Instalaciones necesarias antes de escribir cualquier código de dominio:                                                                                                  
                                                                                                                                                                        
npm install @tanstack/react-query @tanstack/react-router
npm install react-hook-form zod @hookform/resolvers                                                                                                                      
npm install axios
npm install @tanstack/react-query-devtools                                                                                                                               
npx shadcn@latest init  (+ componentes: button, input, table, badge, dialog, select, form, skeleton, toast)                                                              
                                                                                                                                                                        
---                                                                                                                                                                      
Fase 1 — Tipos TypeScript a crear                                                                                                                                        
                                                                                                                                                                        
Un solo archivo por dominio en src/types/:
                                                                                                                                                                        
src/types/common.ts
                                                                                                                                                                        
PageResponse<T>  — envuelve Page<T> del backend
ApiError         — estructura del GlobalExceptionHandler                                                                                                                 
                                                                                                                                                                        
src/types/enums.ts                                                                                                                                                       
                                                                                                                                                                        
Gender:            'male' | 'female' | 'other' | 'prefer_not_to_say'                                                                                                     
AppointmentStatus: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'                                                                     
InvoiceStatus:     'draft' | 'pending' | 'partial_paid' | 'paid' | 'cancelled' | 'overdue'                                                                               
Severity:          'mild' | 'moderate' | 'severe' | 'critical'                                                                                                           
ItemType:          'service' | 'medication' | 'procedure' | 'other'                                                                                                      
PaymentMethod:     'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check' | 'insurance' | 'other'                                                             
ServiceCategory:   'consultation' | 'laboratory' | 'imaging' | 'surgery' | 'therapy' | 'emergency' | 'other'                                                             
MedicationUnit:    'tablet' | 'capsule' | 'ml' | 'mg' | 'g' | 'unit' | 'box' | 'vial' | 'inhaler'                                                                        
CatalogType:       'service' | 'medication'                                                                                                                              
▎ Los enums van en minúsculas porque el backend los persiste como 'male', 'completed', etc. (visto en los seeds).                                                        
                                                                                                                                                                        
src/types/patient.ts
                                                                                                                                                                        
PatientCreateRequest, PatientUpdateRequest                                                                                                                               
PatientResponse, PatientSummaryResponse
                                                                                                                                                                        
src/types/doctor.ts                                                                                                                                                      

DoctorCreateRequest, DoctorUpdateRequest                                                                                                                                 
DoctorResponse, DoctorSummaryResponse                                                                                                                                    

src/types/insurance.ts                                                                                                                                                   
                
InsuranceProviderCreateRequest, InsuranceProviderUpdateRequest
InsuranceProviderResponse, InsuranceProviderSummaryResponse                                                                                                              
InsurancePolicyCreateRequest                                                                                                                                             
InsurancePolicyResponse, InsurancePolicySummaryResponse                                                                                                                  
                                                                                                                                                                        
src/types/appointment.ts                                                                                                                                                 

AppointmentCreateRequest, AppointmentUpdateRequest, AppointmentStatusUpdateRequest                                                                                       
AppointmentResponse, AppointmentSummaryResponse
                                                                                                                                                                        
src/types/medical-record.ts
                                                                                                                                                                        
MedicalRecordCreateRequest, MedicalRecordUpdateRequest
MedicalRecordResponse                                                                                                                                                    
DiagnosisCreateRequest, DiagnosisResponse                                                                                                                                
PrescriptionCreateRequest, PrescriptionResponse                                                                                                                          
ProcedureCreateRequest, ProcedureResponse                                                                                                                                
VitalSigns (tipo para el JSONB — propuesta: { bloodPressure?, heartRate?, temperature?, weight?, height?, oxygenSaturation? })                                           
                                                                                                                                                                        
src/types/catalog.ts                                                                                                                                                     
                                                                                                                                                                        
ServiceCreateRequest, ServiceUpdateRequest                                                                                                                               
ServiceResponse, ServiceSummaryResponse                                                                                                                                  
MedicationCreateRequest, MedicationUpdateRequest
MedicationResponse, MedicationSummaryResponse                                                                                                                            
CatalogPriceHistoryResponse
                                                                                                                                                                        
src/types/invoice.ts                                                                                                                                                     
                                                                                                                                                                        
InvoiceCreateRequest, InvoiceItemRequest, InvoiceStatusUpdateRequest                                                                                                     
InvoiceResponse, InvoiceItemResponse, InvoiceSummaryResponse                                                                                                             
PaymentCreateRequest, PaymentResponse                                                                                                                                    
                                                                                                                                                                        
Decisión de tipos para fechas y decimales:                                                                                                                               
- Fechas OffsetDateTime/LocalDate → string en TypeScript (ISO 8601)
- BigDecimal → number en TypeScript (suficiente para display; sin aritmética en el frontend)                                                                             
- UUIDs → string
                                                                                                                                                                        
---             
Fase 2 — Mocks a crear                                                                                                                                                   
                                                                                                                                                                        
src/mocks/ con archivos que usan los UUIDs exactos del V5__seeds.sql:
                                                                                                                                                                        
src/mocks/      
├── patients.mock.ts        — 10 pacientes (UUIDs a0000000-...-0001 a 000000000010)                                                                                      
├── doctors.mock.ts         — 6 médicos (b0000000-...)                                                                                                                   
├── insurance-providers.mock.ts  — 4 aseguradoras (c0000000-...)                                                                                                         
├── insurance-policies.mock.ts   — 6 pólizas (d0000000-...)                                                                                                              
├── services-catalog.mock.ts     — 15 servicios (e0000000-...)                                                                                                           
├── medications-catalog.mock.ts  — 20 medicamentos (f0000000-...)                                                                                                        
├── appointments.mock.ts    — 15 citas (10000000-...)                                                                                                                    
├── medical-records.mock.ts — expedientes + diagnósticos + prescripciones + procedimientos                                                                               
├── invoices.mock.ts        — facturas + items                                                                                                                           
└── payments.mock.ts        — pagos                                                                                                                                      
                                                                                                                                                                        
Cada archivo exporta un array tipado con el Response correspondiente. Los mocks de appointments incluyen las referencias PatientSummaryResponse y DoctorSummaryResponse  
embebidas (como hace el backend).                                                                                                                                        
                                                                                                                                                                        
---             
Fase 3 — Features en orden de implementación
                                                                                                                                                                        
Las dependencias están en los datos embebidos de los responses:
                                                                                                                                                                        
[1] catalog        → sin dependencias                                                                                                                                    
[2] patients       → sin dependencias                                                                                                                                    
[3] doctors        → sin dependencias                                                                                                                                    
[4] insurance      → depende de patients (PolicyResponse embebe PatientSummary)                                                                                          
[5] appointments   → depende de patients + doctors                                                                                                                       
[6] medical-records → depende de appointments + patients + catalog (medications)                                                                                         
[7] invoices       → depende de appointments + patients + insurance + catalog                                                                                            
[8] payments       → depende de invoices                                                                                                                                 
                
Cada feature tiene esta estructura interna:                                                                                                                              
src/features/<domain>/
├── api/        — funciones getX, createX, updateX (contra mocks con delay simulado)                                                                                     
├── components/ — tabla, form, detail panel, status badge específico                
├── hooks/      — useX (TanStack Query), useCreateX, useUpdateX (mutations)                                                                                              
└── types/      — re-exporta desde src/types/ o agrega tipos UI locales                                                                                                  
                                                                                                                                                                        
---                                                                                                                                                                      
Layout compartido                                                                                                                                                        
                                                                                                                                                                        
src/components/ 
├── layout/                                                                                                                                                              
│   ├── Sidebar/       — nav fija con links por feature
│   ├── Header/        — título de sección + info de sesión (mock)                                                                                                       
│   └── PageLayout/    — wrapper con sidebar + header + main                                                                                                             
├── ui/                                                                                                                                                                  
│   ├── DataTable/     — tabla genérica con paginación (columnas tipadas con generics)                                                                                   
│   ├── StatusBadge/   — badge polimórfico para AppointmentStatus, InvoiceStatus, Severity                                                                               
│   ├── AllergyAlert/  — highlight amber/red para alergias del paciente                                                                                                  
│   └── PageHeader/    — título + botón de acción primaria       