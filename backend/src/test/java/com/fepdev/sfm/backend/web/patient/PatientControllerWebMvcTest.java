package com.fepdev.sfm.backend.web.patient;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fepdev.sfm.backend.domain.patient.Gender;
import com.fepdev.sfm.backend.domain.patient.PatientController;
import com.fepdev.sfm.backend.domain.patient.PatientService;
import com.fepdev.sfm.backend.domain.patient.dto.PatientResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientSummaryResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(PatientController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class PatientControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    PatientService patientService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void create_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        PatientResponse response = new PatientResponse(
                id,
                "12345678",
                "Ana",
                "Lopez",
                LocalDate.of(1990, 1, 1),
                Gender.FEMALE,
                "5551234",
                "ana@example.com",
                "Calle 1",
                "O+",
                null,
                null,
                null);

        when(patientService.createPatient(any())).thenReturn(response);

        String body = """
                {
                  "dni": "12345678",
                  "firstName": "Ana",
                  "lastName": "Lopez",
                  "birthDate": "1990-01-01",
                  "gender": "female",
                  "phone": "5551234",
                  "email": "ana@example.com"
                }
                """;

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/v1/patients/" + id)))
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void create_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.path").value("/api/v1/patients"));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(patientService.getPatientById(id)).thenThrow(new EntityNotFoundException("Paciente no encontrado"));

        mockMvc.perform(get("/api/v1/patients/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void create_whenBusinessRuleFails_returns422() throws Exception {
        when(patientService.createPatient(any())).thenThrow(new BusinessRuleException("DNI duplicado"));

        String body = """
                {
                  "dni": "12345678",
                  "firstName": "Ana",
                  "lastName": "Lopez",
                  "birthDate": "1990-01-01",
                  "gender": "female",
                  "phone": "5551234",
                  "email": "ana@example.com"
                }
                """;

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message", containsString("DNI duplicado")));
    }

    @Test
    void update_getByDni_list_and_search_coverEndpoints() throws Exception {
        UUID id = UUID.randomUUID();
        PatientResponse response = new PatientResponse(
                id, "12345678", "Ana", "Lopez", LocalDate.of(1990, 1, 1), Gender.FEMALE,
                "5551234", "ana@example.com", "Calle 1", "O+", null, null, null);
        var summary = new PatientSummaryResponse(id, "12345678", "Ana", "Lopez", "5551234");

        when(patientService.updatePatient(any(), any())).thenReturn(response);
        when(patientService.getPatientByDni("12345678")).thenReturn(response);
        when(patientService.listPatients(any(), any())).thenReturn(new PageImpl<>(List.of(summary)));
        when(patientService.autocomplete("an")).thenReturn(List.of(summary));

        mockMvc.perform(put("/api/v1/patients/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"firstName":"Ana","phone":"5551234"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()));

        mockMvc.perform(get("/api/v1/patients/dni/{dni}", "12345678"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dni").value("12345678"));

        mockMvc.perform(get("/api/v1/patients").param("lastName", "Lopez"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].lastName").value("Lopez"));

        mockMvc.perform(get("/api/v1/patients/search").param("q", "an"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].firstName").value("Ana"));
    }

    @Test
    void appointments_and_policies_endpoints_returnPages() throws Exception {
        UUID id = UUID.randomUUID();

        var appt = new com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse(
                UUID.randomUUID(), "Ana", "Lopez", "Doc", "Torres",
                java.time.OffsetDateTime.now().plusDays(1), com.fepdev.sfm.backend.domain.appointment.Status.SCHEDULED);
        var pol = new com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicySummaryResponse(
                UUID.randomUUID(), "POL-9", "Seguro", new java.math.BigDecimal("80.00"), true);

        when(patientService.getPatientAppointments(any(), any())).thenReturn(new PageImpl<>(List.of(appt)));
        when(patientService.getPatientPolicies(any(), any(), any())).thenReturn(new PageImpl<>(List.of(pol)));

        mockMvc.perform(get("/api/v1/patients/{id}/appointments", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("scheduled"));

        mockMvc.perform(get("/api/v1/patients/{id}/policies", id).param("onlyActive", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].policyNumber").value("POL-9"));
    }
}
