package com.fepdev.sfm.backend.config;

import java.util.Optional;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

// implementacion de AuditorAware para poblar @CreatedBy y @LastModifiedBy en BaseEntity
// el nombre del bean debe coincidir con auditorAwareRef en JpaConfig
@Component("springSecurityAuditorAware")
public class SpringSecurityAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                // "anonymousUser" es el nombre por defecto de Spring Security para requests sin sesion
                .filter(auth -> !"anonymousUser".equals(auth.getName()))
                .map(Authentication::getName);
    }
}
