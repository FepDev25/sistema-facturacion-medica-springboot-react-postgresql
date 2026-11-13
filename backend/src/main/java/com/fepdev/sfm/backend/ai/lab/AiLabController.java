package com.fepdev.sfm.backend.ai.lab;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/lab")
public class AiLabController {

    private final AiLabService labService;

    public AiLabController(AiLabService labService) {
        this.labService = labService;
    }

    // Solo ADMIN: muestra configuracion y consumo agregado, nunca contenido clinico.
    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<AiLabResponse> snapshot() {
        return ResponseEntity.ok(labService.snapshot());
    }
}
