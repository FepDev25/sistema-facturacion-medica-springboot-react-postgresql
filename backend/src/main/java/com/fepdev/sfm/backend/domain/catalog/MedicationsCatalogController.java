package com.fepdev.sfm.backend.domain.catalog;

import java.net.URI;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.fepdev.sfm.backend.domain.catalog.dto.MedicationCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/catalog/medications")
public class MedicationsCatalogController {

    private final MedicationsCatalogService medicationsCatalogService;

    public MedicationsCatalogController(MedicationsCatalogService medicationsCatalogService) {
        this.medicationsCatalogService = medicationsCatalogService;
    }

    @PostMapping
    public ResponseEntity<MedicationResponse> create(
            @Valid @RequestBody MedicationCreateRequest request,
            UriComponentsBuilder uriBuilder) {

        MedicationResponse response = medicationsCatalogService.createMedication(request);
        URI location = uriBuilder.path("/api/v1/catalog/medications/{id}")
                .buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicationResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody MedicationUpdateRequest request) {

        return ResponseEntity.ok(medicationsCatalogService.updateMedication(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        medicationsCatalogService.deactivateMedication(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicationResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(medicationsCatalogService.getMedicationById(id));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<MedicationResponse> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(medicationsCatalogService.getMedicationByCode(code));
    }

    @GetMapping
    public ResponseEntity<Page<MedicationSummaryResponse>> list(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Unit unit,
            @RequestParam(required = false) Boolean requiresPrescription,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(
                medicationsCatalogService.searchMedications(active, unit, requiresPrescription, q, pageable));
    }
}
