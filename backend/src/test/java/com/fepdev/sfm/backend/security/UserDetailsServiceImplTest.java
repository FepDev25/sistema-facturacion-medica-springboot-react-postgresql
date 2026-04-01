package com.fepdev.sfm.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock private SystemUserRepository systemUserRepository;

    @InjectMocks private UserDetailsServiceImpl service;

    @Test
    void loadUserByUsername_whenExists_returnsUserDetails() {
        SystemUser user = SystemUser.builder()
                .username("admin")
                .passwordHash("hash")
                .email("admin@x.com")
                .role(Role.ADMIN)
                .active(true)
                .build();

        when(systemUserRepository.findByUsername("admin")).thenReturn(Optional.of(user));

        var loaded = service.loadUserByUsername("admin");
        assertThat(loaded.getUsername()).isEqualTo("admin");
        assertThat(loaded.getPassword()).isEqualTo("hash");
    }

    @Test
    void loadUserByUsername_whenMissing_throwsUsernameNotFoundException() {
        when(systemUserRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUserByUsername("ghost"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("ghost");
    }
}
