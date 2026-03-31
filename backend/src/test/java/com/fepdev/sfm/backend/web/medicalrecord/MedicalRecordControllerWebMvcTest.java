package com.fepdev.sfm.backend.web.medicalrecord;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
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
}
