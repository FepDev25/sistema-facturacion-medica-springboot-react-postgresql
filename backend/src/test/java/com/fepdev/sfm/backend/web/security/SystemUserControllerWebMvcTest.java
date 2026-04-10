package com.fepdev.sfm.backend.web.security;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import com.fepdev.sfm.backend.security.JwtAuthenticationFilter;
import com.fepdev.sfm.backend.security.Role;
import com.fepdev.sfm.backend.security.SystemUser;
import com.fepdev.sfm.backend.security.SystemUserController;
import com.fepdev.sfm.backend.security.SystemUserRepository;
import com.fepdev.sfm.backend.shared.exception.HandlerException;

@WebMvcTest(SystemUserController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HandlerException.class)
class SystemUserControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    SystemUserRepository systemUserRepository;

    @MockitoBean
    JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void list_whenNoFilters_returnsPagedUsers() throws Exception {
        SystemUser user = new SystemUser();
        ReflectionTestUtils.setField(user, "id", UUID.fromString("11111111-1111-1111-1111-111111111111"));
        ReflectionTestUtils.setField(user, "username", "doctor1");
        ReflectionTestUtils.setField(user, "email", "doctor1@sfm.local");
        ReflectionTestUtils.setField(user, "role", Role.DOCTOR);
        ReflectionTestUtils.setField(user, "active", true);

        var pageable = PageRequest.of(0, 50);
        when(systemUserRepository.findWithFilters(eq(null), eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(user), pageable, 1));

        mockMvc.perform(get("/api/v1/system-users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("11111111-1111-1111-1111-111111111111"))
                .andExpect(jsonPath("$.content[0].username").value("doctor1"))
                .andExpect(jsonPath("$.content[0].email").value("doctor1@sfm.local"))
                .andExpect(jsonPath("$.content[0].role").value("DOCTOR"))
                .andExpect(jsonPath("$.content[0].active").value(true));
    }

    @Test
    void list_whenRoleAndActiveFilters_returnsFilteredUsers() throws Exception {
        SystemUser user = new SystemUser();
        ReflectionTestUtils.setField(user, "id", UUID.fromString("22222222-2222-2222-2222-222222222222"));
        ReflectionTestUtils.setField(user, "username", "doctor2");
        ReflectionTestUtils.setField(user, "email", "doctor2@sfm.local");
        ReflectionTestUtils.setField(user, "role", Role.DOCTOR);
        ReflectionTestUtils.setField(user, "active", true);

        var pageable = PageRequest.of(0, 50);
        when(systemUserRepository.findWithFilters(eq(Role.DOCTOR), eq(Boolean.TRUE), any()))
                .thenReturn(new PageImpl<>(List.of(user), pageable, 1));

        mockMvc.perform(get("/api/v1/system-users")
                        .param("role", "DOCTOR")
                        .param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].username").value("doctor2"));
    }
}
