package com.fepdev.sfm.backend.web.appointment;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fepdev.sfm.backend.domain.appointment.AppointmentController;
import com.fepdev.sfm.backend.domain.appointment.AppointmentService;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentResponse;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.MedicalRecordCreateRequest;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(AppointmentController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class AppointmentControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    AppointmentService appointmentService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void create_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID doctorId = UUID.randomUUID();
        OffsetDateTime scheduledAt = OffsetDateTime.now().plusDays(1);
        AppointmentResponse response = new AppointmentResponse(
                id, patientId, "Ana", "Lopez", doctorId, "Doc", "Torres", scheduledAt,
                scheduledAt.plusMinutes(30), 30, Status.SCHEDULED, null, null, "Dolor", null, null, null);

        when(appointmentService.createAppointment(any())).thenReturn(response);

        String body = """
                {
                  "patientId": "%s",
                  "doctorId": "%s",
                  "scheduledAt": "%s",
                  "durationMinutes": 30,
                  "chiefComplaint": "Dolor"
                }
                """.formatted(patientId, doctorId, scheduledAt);

        mockMvc.perform(post("/api/v1/appointments").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("scheduled"))
                .andExpect(jsonPath("$.durationMinutes").value(30));

        ArgumentCaptor<com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest> captor =
                ArgumentCaptor.forClass(com.fepdev.sfm.backend.domain.appointment.dto.AppointmentCreateRequest.class);
        verify(appointmentService).createAppointment(captor.capture());
        var sent = captor.getValue();
        assertThat(sent.durationMinutes()).isEqualTo(30);
        assertThat(sent.patientId()).isEqualTo(patientId);
        assertThat(sent.doctorId()).isEqualTo(doctorId);
    }

    @Test
    void create_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/appointments").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(appointmentService.getAppointmentById(id)).thenThrow(new EntityNotFoundException("No existe"));

        mockMvc.perform(get("/api/v1/appointments/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void confirm_whenTransitionInvalid_returns422() throws Exception {
        UUID id = UUID.randomUUID();
        when(appointmentService.confirmAppointment(id)).thenThrow(new BusinessRuleException("Estado inválido"));

        mockMvc.perform(patch("/api/v1/appointments/{id}/confirm", id))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }

    @Test
    void complete_whenValidRequest_serializesAppointmentResponse() throws Exception {
        UUID id = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID doctorId = UUID.randomUUID();
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        AppointmentResponse response = new AppointmentResponse(
                id, patientId, "Ana", "Lopez", doctorId, "Doc", "Torres", start,
                start.plusMinutes(30), 30, Status.COMPLETED, null, null, "Dolor", "ok", null, null);

        when(appointmentService.completeAppointment(any(), any())).thenReturn(response);

        String body = """
                {
                  "patientId": "%s",
                  "appointmentId": "%s",
                  "clinicalNotes": "Paciente estable",
                  "recordDate": "%s"
                }
                """.formatted(patientId, id, OffsetDateTime.now());

                mockMvc.perform(patch("/api/v1/appointments/{id}/complete", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("completed"))
                .andExpect(jsonPath("$.scheduledEndAt").exists())
                .andExpect(jsonPath("$.doctorId").value(doctorId.toString()));

        ArgumentCaptor<MedicalRecordCreateRequest> captor = ArgumentCaptor.forClass(MedicalRecordCreateRequest.class);
        verify(appointmentService).completeAppointment(any(), captor.capture());
        assertThat(captor.getValue().clinicalNotes()).isEqualTo("Paciente estable");
    }

    @Test
    void list_whenStatusParamProvided_parsesEnumAndReturnsPage() throws Exception {
        OffsetDateTime scheduledAt = OffsetDateTime.now().plusDays(1);
        AppointmentSummaryResponse summary = new AppointmentSummaryResponse(
                UUID.randomUUID(), "Ana", "Lopez", "Doc", "Torres", scheduledAt, Status.CONFIRMED);
        var page = new PageImpl<>(List.of(summary), PageRequest.of(0, 20), 1);

        when(appointmentService.getAppointments(any(), any(), any(), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/appointments").param("status", "CONFIRMED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("confirmed"));
    }

    @Test
    void availability_whenValidRequest_returnsSummaryList() throws Exception {
        OffsetDateTime from = OffsetDateTime.now().plusDays(1);
        OffsetDateTime to = from.plusHours(8);
        AppointmentSummaryResponse summary = new AppointmentSummaryResponse(
                UUID.randomUUID(), "Ana", "Lopez", "Doc", "Torres", from.plusHours(1), Status.SCHEDULED);

        when(appointmentService.getDoctorAvailability(any(), any(), any())).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/v1/appointments/availability")
                        .param("doctorId", UUID.randomUUID().toString())
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].patientFirstName").value("Ana"))
                .andExpect(jsonPath("$[0].status").value("scheduled"));
    }

    @Test
    void start_whenValidTransition_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID doctorId = UUID.randomUUID();
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        AppointmentResponse response = new AppointmentResponse(
                id, patientId, "Ana", "Lopez", doctorId, "Doc", "Torres", start,
                start.plusMinutes(30), 30, Status.IN_PROGRESS, null, null, "Dolor", null, null, null);
        when(appointmentService.startAppointment(id)).thenReturn(response);

        mockMvc.perform(patch("/api/v1/appointments/{id}/start", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("in_progress"));
    }

    @Test
    void cancel_whenValidTransition_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        AppointmentResponse response = new AppointmentResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", UUID.randomUUID(), "Doc", "Torres", start,
                start.plusMinutes(30), 30, Status.CANCELLED, null, null, "Dolor", null, null, null);
        when(appointmentService.cancelAppointment(id)).thenReturn(response);

        mockMvc.perform(patch("/api/v1/appointments/{id}/cancel", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"));
    }

    @Test
    void noShow_whenValidTransition_returns200() throws Exception {
        UUID id = UUID.randomUUID();
        OffsetDateTime start = OffsetDateTime.now().plusDays(1);
        AppointmentResponse response = new AppointmentResponse(
                id, UUID.randomUUID(), "Ana", "Lopez", UUID.randomUUID(), "Doc", "Torres", start,
                start.plusMinutes(30), 30, Status.NO_SHOW, null, null, "Dolor", null, null, null);
        when(appointmentService.markNoShow(id)).thenReturn(response);

        mockMvc.perform(patch("/api/v1/appointments/{id}/no-show", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("no_show"));
    }
}
