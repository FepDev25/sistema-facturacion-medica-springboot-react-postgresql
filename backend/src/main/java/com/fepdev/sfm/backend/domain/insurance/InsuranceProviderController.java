package com.fepdev.sfm.backend.domain.insurance;

import java.net.URI;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsuranceProviderUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/insurance/providers")
public class InsuranceProviderController {

    private final InsuranceService insuranceService;

    public InsuranceProviderController(InsuranceService insuranceService) {
        this.insuranceService = insuranceService;
    }

    @PostMapping
    public ResponseEntity<InsuranceProviderResponse> create(
            @Valid @RequestBody InsuranceProviderCreateRequest request,
            UriComponentsBuilder uriBuilder) {

        InsuranceProviderResponse response = insuranceService.createProvider(request);
        URI location = uriBuilder.path("/api/v1/insurance/providers/{id}")
                .buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InsuranceProviderResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody InsuranceProviderUpdateRequest request) {

        return ResponseEntity.ok(insuranceService.updateProvider(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        insuranceService.deactivateProvider(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<InsuranceProviderResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(insuranceService.getProviderById(id));
    }

    @GetMapping
    public ResponseEntity<Page<InsuranceProviderResponse>> list(
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "name") Pageable pageable) {

        return ResponseEntity.ok(insuranceService.listProviders(active, pageable));
    }
}
