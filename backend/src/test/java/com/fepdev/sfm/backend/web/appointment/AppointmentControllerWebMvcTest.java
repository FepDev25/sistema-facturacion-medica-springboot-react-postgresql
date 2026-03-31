package com.fepdev.sfm.backend.web.appointment;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fepdev.sfm.backend.domain.appointment.AppointmentController;
import com.fepdev.sfm.backend.domain.appointment.AppointmentService;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentResponse;
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
                scheduledAt.plusMinutes(30), 30, Status.SCHEDULED, "Dolor", null, null, null);

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
                .andExpect(jsonPath("$.id").value(id.toString()));
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
}
