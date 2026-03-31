package com.fepdev.sfm.backend.domain.patient;

import java.net.URI;
import java.util.List;
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

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse;
import com.fepdev.sfm.backend.domain.insurance.dto.InsurancePolicySummaryResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientCreateRequest;
import com.fepdev.sfm.backend.domain.patient.dto.PatientResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientSummaryResponse;
import com.fepdev.sfm.backend.domain.patient.dto.PatientUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public ResponseEntity<PatientResponse> create(
            @Valid @RequestBody PatientCreateRequest request,
            UriComponentsBuilder uriBuilder) {

        PatientResponse response = patientService.createPatient(request);
        URI location = uriBuilder.path("/api/v1/patients/{id}")
                .buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatientResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody PatientUpdateRequest request) {

        return ResponseEntity.ok(patientService.updatePatient(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }

    @GetMapping("/dni/{dni}")
    public ResponseEntity<PatientResponse> getByDni(@PathVariable String dni) {
        return ResponseEntity.ok(patientService.getPatientByDni(dni));
    }

    @GetMapping
    public ResponseEntity<Page<PatientSummaryResponse>> list(
            @RequestParam(required = false) String lastName,
            @PageableDefault(size = 20, sort = "lastName", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(patientService.listPatients(lastName, pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<List<PatientSummaryResponse>> autocomplete(@RequestParam String q) {
        return ResponseEntity.ok(patientService.autocomplete(q));
    }

    @GetMapping("/{id}/appointments")
    public ResponseEntity<Page<AppointmentSummaryResponse>> getAppointments(
            @PathVariable UUID id,
            @PageableDefault(size = 20, sort = "scheduledAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(patientService.getPatientAppointments(id, pageable));
    }

    @GetMapping("/{id}/policies")
    public ResponseEntity<Page<InsurancePolicySummaryResponse>> getPolicies(
            @PathVariable UUID id,
            @RequestParam(required = false) Boolean onlyActive,
            @PageableDefault(size = 20, sort = "startDate", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(patientService.getPatientPolicies(id, onlyActive, pageable));
    }
}
