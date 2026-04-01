package com.fepdev.sfm.backend.web.medicalrecord;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.medicalrecord.DiagnosisService;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordController;
import com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordService;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionService;
import com.fepdev.sfm.backend.domain.medicalrecord.ProcedureService;
import com.fepdev.sfm.backend.domain.medicalrecord.Severity;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.ProcedureResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(MedicalRecordController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class MedicalRecordControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    MedicalRecordService medicalRecordService;

    @MockitoBean
    DiagnosisService diagnosisService;

    @MockitoBean
    PrescriptionService prescriptionService;

    @MockitoBean
    ProcedureService procedureService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void getById_whenFound_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        MedicalRecordResponse response = new MedicalRecordResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", UUID.randomUUID(), Map.of(), null, "Notas", OffsetDateTime.now(), null, null);
        when(medicalRecordService.getMedicalRecordById(id)).thenReturn(response);

        mockMvc.perform(get("/api/v1/medical-records/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void addDiagnosis_whenInvalidRequest_returns400() throws Exception {
        UUID id = UUID.randomUUID();
        mockMvc.perform(post("/api/v1/medical-records/{id}/diagnoses", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(medicalRecordService.getMedicalRecordById(id)).thenThrow(new EntityNotFoundException("No existe"));

        mockMvc.perform(get("/api/v1/medical-records/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void addDiagnosis_whenBusinessRuleFails_returns422() throws Exception {
        UUID id = UUID.randomUUID();
        DiagnosisResponse diagnosisResponse = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), id, "J02.9", "Faringitis", Severity.MILD, OffsetDateTime.now(), OffsetDateTime.now());
        when(diagnosisService.addDiagnosis(any())).thenThrow(new BusinessRuleException("No corresponde"));

        String body = """
                {
                  "appointmentId": "%s",
                  "medicalRecordId": "%s",
                  "icd10Code": "J02.9",
                  "description": "Faringitis",
                  "severity": "mild",
                  "diagnosedAt": "%s"
                }
                """.formatted(UUID.randomUUID(), id, OffsetDateTime.now());

        mockMvc.perform(post("/api/v1/medical-records/{id}/diagnoses", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void getByAppointment_whenFound_returns200() throws Exception {
        UUID appointmentId = UUID.randomUUID();
        MedicalRecordResponse response = new MedicalRecordResponse(
                UUID.randomUUID(), UUID.randomUUID(), "Ana", "Lopez", appointmentId,
                Map.of("hr", 70), "normal", "Notas", OffsetDateTime.now(), null, null);
        when(medicalRecordService.getMedicalRecordByAppointmentId(appointmentId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/medical-records/appointment/{appointmentId}", appointmentId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appointmentId").value(appointmentId.toString()));
    }

    @Test
    void getByPatient_whenFound_returnsPage() throws Exception {
        UUID patientId = UUID.randomUUID();
        MedicalRecordResponse response = new MedicalRecordResponse(
                UUID.randomUUID(), patientId, "Ana", "Lopez", UUID.randomUUID(),
                Map.of(), null, "Notas", OffsetDateTime.now(), null, null);
        var page = new org.springframework.data.domain.PageImpl<>(List.of(response),
                org.springframework.data.domain.PageRequest.of(0, 20), 1);
        when(medicalRecordService.getMedicalRecordsByPatientId(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/medical-records/patient/{patientId}", patientId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].patientId").value(patientId.toString()));
    }

    @Test
    void getDiagnosesByIcd10_whenFound_returnsPage() throws Exception {
        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "J02.9", "Faringitis",
                Severity.MILD, OffsetDateTime.now(), OffsetDateTime.now());
        var page = new org.springframework.data.domain.PageImpl<>(List.of(response),
                org.springframework.data.domain.PageRequest.of(0, 20), 1);
        when(diagnosisService.getDiagnosesByIcd10Code(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/medical-records/diagnoses/icd10").param("code", "J02.9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].icd10Code").value("J02.9"))
                .andExpect(jsonPath("$.content[0].severity").value("mild"));
    }

    @Test
    void addPrescription_whenValid_returns200() throws Exception {
        UUID mrId = UUID.randomUUID();
        PrescriptionResponse response = new PrescriptionResponse(
                UUID.randomUUID(), UUID.randomUUID(), mrId, UUID.randomUUID(), "Amoxicilina",
                "500mg", "q8h", 5, "ok", OffsetDateTime.now());
        when(prescriptionService.createPrescription(any())).thenReturn(response);

        String body = """
                {
                  "appointmentId": "%s",
                  "medicalRecordId": "%s",
                  "medicationId": "%s",
                  "dosage": "500mg",
                  "frequency": "q8h",
                  "durationDays": 5,
                  "instructions": "ok"
                }
                """.formatted(UUID.randomUUID(), mrId, UUID.randomUUID());

        mockMvc.perform(post("/api/v1/medical-records/{id}/prescriptions", mrId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.medicationName").value("Amoxicilina"));
    }

    @Test
    void addProcedure_whenValid_returns200() throws Exception {
        UUID mrId = UUID.randomUUID();
        ProcedureResponse response = new ProcedureResponse(
                UUID.randomUUID(), UUID.randomUUID(), mrId, "PROC-1", "Lavado", "ok",
                OffsetDateTime.now(), OffsetDateTime.now());
        when(procedureService.createProcedure(any())).thenReturn(response);

        String body = """
                {
                  "appointmentId": "%s",
                  "medicalRecordId": "%s",
                  "procedureCode": "PROC-1",
                  "description": "Lavado",
                  "notes": "ok",
                  "performedAt": "%s"
                }
                """.formatted(UUID.randomUUID(), mrId, OffsetDateTime.now());

        mockMvc.perform(post("/api/v1/medical-records/{id}/procedures", mrId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.procedureCode").value("PROC-1"));
    }
}
