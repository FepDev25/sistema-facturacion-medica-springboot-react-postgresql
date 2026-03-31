package com.fepdev.sfm.backend.domain.doctor;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
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

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentSummaryResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorCreateRequest;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorSummaryResponse;
import com.fepdev.sfm.backend.domain.doctor.dto.DoctorUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    @PostMapping
    public ResponseEntity<DoctorResponse> create(
            @Valid @RequestBody DoctorCreateRequest request,
            UriComponentsBuilder uriBuilder) {

        DoctorResponse response = doctorService.createDoctor(request);
        URI location = uriBuilder.path("/api/v1/doctors/{id}")
                .buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DoctorResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody DoctorUpdateRequest request) {

        return ResponseEntity.ok(doctorService.updateDoctor(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        doctorService.deactivateDoctor(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<DoctorResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(doctorService.getDoctorById(id));
    }

    @GetMapping("/license/{licenseNumber}")
    public ResponseEntity<DoctorResponse> getByLicenseNumber(@PathVariable String licenseNumber) {
        return ResponseEntity.ok(doctorService.getDoctorByLicenseNumber(licenseNumber));
    }

    @GetMapping
    public ResponseEntity<Page<DoctorSummaryResponse>> list(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String specialty,
            @PageableDefault(size = 20, sort = "lastName", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(doctorService.getDoctors(active, specialty, pageable));
    }

    // Devuelve las citas ocupadas del médico en el rango. El cliente calcula los huecos libres.
    @GetMapping("/{id}/schedule")
    public ResponseEntity<List<AppointmentSummaryResponse>> getSchedule(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @PageableDefault(size = 50, sort = "scheduledAt", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(doctorService.getAppointmentsByDoctorId(id, from, to, pageable).getContent());
    }
}
