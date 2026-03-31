package com.fepdev.sfm.backend.domain.insurance;

import java.net.URI;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyCreateRequest;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicyUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/insurance/policies")
public class InsurancePolicyController {

    private final InsuranceService insuranceService;

    public InsurancePolicyController(InsuranceService insuranceService) {
        this.insuranceService = insuranceService;
    }

    @PostMapping
    public ResponseEntity<InsurancePolicyResponse> create(
            @Valid @RequestBody InsurancePolicyCreateRequest request,
            UriComponentsBuilder uriBuilder) {

        InsurancePolicyResponse response = insuranceService.createPolicy(request);
        URI location = uriBuilder.path("/api/v1/insurance/policies/{id}")
                .buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InsurancePolicyResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody InsurancePolicyUpdateRequest request) {

        return ResponseEntity.ok(insuranceService.updatePolicy(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InsurancePolicyResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(insuranceService.getPolicyById(id));
    }

    @GetMapping("/number/{policyNumber}")
    public ResponseEntity<InsurancePolicyResponse> getByNumber(@PathVariable String policyNumber) {
        return ResponseEntity.ok(insuranceService.getPolicyByNumber(policyNumber));
    }

    // Listado de pólizas por paciente — alternativa a GET /api/v1/patients/{id}/policies
    @GetMapping
    public ResponseEntity<Page<InsurancePolicyResponse>> listByPatient(
            @RequestParam UUID patientId,
            @RequestParam(required = false) Boolean onlyActive,
            @PageableDefault(size = 20, sort = "startDate", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(insuranceService.listPoliciesByPatient(patientId, onlyActive, pageable));
    }
}
