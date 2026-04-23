package com.fepdev.sfm.backend.ai.history;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryQuery;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/ai/patients")
public class AiPatientHistoryController {

    private final PatientHistoryQueryService queryService;

    public AiPatientHistoryController(PatientHistoryQueryService queryService) {
        this.queryService = queryService;
    }

    @PostMapping("/{patientId}/query")
    public ResponseEntity<PatientHistoryAnswer> query(
            @PathVariable UUID patientId,
            @Valid @RequestBody PatientHistoryQuery request) {
        return ResponseEntity.ok(queryService.query(patientId, request.question()));
    }
}
