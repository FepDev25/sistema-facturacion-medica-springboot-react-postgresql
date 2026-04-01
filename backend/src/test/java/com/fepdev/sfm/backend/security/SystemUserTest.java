package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SystemUserTest {

    @Test
    void userDetailsContract_isImplementedWithRoleAndActiveFlag() {
        SystemUser user = new SystemUser();
        ReflectionTestUtils.setField(user, "username", "doctor1");
        ReflectionTestUtils.setField(user, "passwordHash", "hashed");
        ReflectionTestUtils.setField(user, "role", Role.DOCTOR);
        ReflectionTestUtils.setField(user, "active", true);

        assertThat(user.getUsername()).isEqualTo("doctor1");
        assertThat(user.getPassword()).isEqualTo("hashed");
        assertThat(user.getAuthorities()).extracting("authority").containsExactly("DOCTOR");
        assertThat(user.isAccountNonExpired()).isTrue();
        assertThat(user.isAccountNonLocked()).isTrue();
        assertThat(user.isCredentialsNonExpired()).isTrue();
        assertThat(user.isEnabled()).isTrue();

        ReflectionTestUtils.setField(user, "active", false);
        assertThat(user.isEnabled()).isFalse();
    }
}
