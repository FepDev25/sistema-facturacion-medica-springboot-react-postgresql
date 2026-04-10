package com.fepdev.sfm.backend.web.doctor;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.domain.doctor.DoctorController;
import com.fepdev.sfm.backend.domain.doctor.DoctorService;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorResponse;
import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

import jakarta.persistence.EntityNotFoundException;

@WebMvcTest(DoctorController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class DoctorControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    DoctorService doctorService;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void create_whenValidRequest_returns201() throws Exception {
        UUID id = UUID.randomUUID();
        DoctorResponse response = new DoctorResponse(id, "LIC-1", "Ana", "Lopez", "Cardio", "555", "ana@x.com", true, null, null, null, null);
        when(doctorService.createDoctor(any())).thenReturn(response);

        String body = """
                {
                  "licenseNumber": "LIC-1",
                  "firstName": "Ana",
                  "lastName": "Lopez",
                  "specialty": "Cardio",
                  "phone": "555",
                  "email": "ana@x.com"
                }
                """;

        mockMvc.perform(post("/api/v1/doctors").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/v1/doctors/" + id)))
                .andExpect(jsonPath("$.id").value(id.toString()));
    }

    @Test
    void create_whenInvalidRequest_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/doctors").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void getById_whenNotFound_returns404() throws Exception {
        UUID id = UUID.randomUUID();
        when(doctorService.getDoctorById(id)).thenThrow(new EntityNotFoundException("No encontrado"));

        mockMvc.perform(get("/api/v1/doctors/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void create_whenBusinessRuleFails_returns422() throws Exception {
        when(doctorService.createDoctor(any())).thenThrow(new BusinessRuleException("Licencia duplicada"));

        String body = """
                {
                  "licenseNumber": "LIC-1",
                  "firstName": "Ana",
                  "lastName": "Lopez",
                  "specialty": "Cardio",
                  "phone": "555",
                  "email": "ana@x.com"
                }
                """;

        mockMvc.perform(post("/api/v1/doctors").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.status").value(422));
    }
}
