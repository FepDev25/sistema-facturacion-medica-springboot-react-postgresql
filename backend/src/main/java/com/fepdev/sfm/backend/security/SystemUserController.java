package com.fepdev.sfm.backend.security;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.security.dto.SystemUserSummaryResponse;

@RestController
@RequestMapping("/api/v1/system-users")
public class SystemUserController {

    private final SystemUserRepository systemUserRepository;

    public SystemUserController(SystemUserRepository systemUserRepository) {
        this.systemUserRepository = systemUserRepository;
    }

    @GetMapping
    public ResponseEntity<Page<SystemUserSummaryResponse>> list(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 50, sort = "username", direction = Sort.Direction.ASC) Pageable pageable) {

        Page<SystemUser> users = systemUserRepository.findWithFilters(role, active, pageable);

        Page<SystemUserSummaryResponse> response = users.map(u ->
                new SystemUserSummaryResponse(u.getId(), u.getUsername(), u.getEmail(), u.getRole().name(), u.isActive()));
        return ResponseEntity.ok(response);
    }
}
