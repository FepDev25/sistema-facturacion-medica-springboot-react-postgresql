package com.fepdev.sfm.backend.domain.medicalrecord;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureCreateRequest;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/medical-records")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final DiagnosisService diagnosisService;
    private final PrescriptionService prescriptionService;
    private final ProcedureService procedureService;

    public MedicalRecordController(MedicalRecordService medicalRecordService,
            DiagnosisService diagnosisService,
            PrescriptionService prescriptionService,
            ProcedureService procedureService) {
        this.medicalRecordService = medicalRecordService;
        this.diagnosisService = diagnosisService;
        this.prescriptionService = prescriptionService;
        this.procedureService = procedureService;
    }

    // Expediente clínico (solo lectura: se crea al completar la cita)

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecordResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(medicalRecordService.getMedicalRecordById(id));
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<MedicalRecordResponse> getByAppointment(@PathVariable UUID appointmentId) {
        return ResponseEntity.ok(medicalRecordService.getMedicalRecordByAppointmentId(appointmentId));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<Page<MedicalRecordResponse>> getByPatient(
            @PathVariable UUID patientId,
            @PageableDefault(size = 20, sort = "recordDate", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(medicalRecordService.getMedicalRecordsByPatientId(patientId, pageable));
    }

    // Diagnósticos

    @PostMapping("/{id}/diagnoses")
    public ResponseEntity<DiagnosisResponse> addDiagnosis(
            @PathVariable UUID id,
            @Valid @RequestBody DiagnosisCreateRequest request) {

        return ResponseEntity.ok(diagnosisService.addDiagnosis(request));
    }

    @GetMapping("/{id}/diagnoses")
    public ResponseEntity<Page<DiagnosisResponse>> getDiagnoses(
            @PathVariable UUID id,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(diagnosisService.getDiagnosesByMedicalRecord(id, pageable));
    }

    // Buscar por código ICD-10 (reportería clínica)
    @GetMapping("/diagnoses/icd10")
    public ResponseEntity<Page<DiagnosisResponse>> getDiagnosesByIcd10(
            @RequestParam String code,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(diagnosisService.getDiagnosesByIcd10Code(code, pageable));
    }

    // Prescripciones

    @PostMapping("/{id}/prescriptions")
    public ResponseEntity<PrescriptionResponse> addPrescription(
            @PathVariable UUID id,
            @Valid @RequestBody PrescriptionCreateRequest request) {

        return ResponseEntity.ok(prescriptionService.createPrescription(request));
    }

    @GetMapping("/{id}/prescriptions")
    public ResponseEntity<Page<PrescriptionResponse>> getPrescriptions(
            @PathVariable UUID id,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(prescriptionService.getPrescriptionsByMedicalRecord(id, pageable));
    }

    // Procedimientos

    @PostMapping("/{id}/procedures")
    public ResponseEntity<ProcedureResponse> addProcedure(
            @PathVariable UUID id,
            @Valid @RequestBody ProcedureCreateRequest request) {

        return ResponseEntity.ok(procedureService.createProcedure(request));
    }

    @GetMapping("/{id}/procedures")
    public ResponseEntity<Page<ProcedureResponse>> getProcedures(
            @PathVariable UUID id,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(procedureService.getProceduresByMedicalRecordId(id, pageable));
    }
}
