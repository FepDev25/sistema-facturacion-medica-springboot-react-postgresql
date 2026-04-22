package com.fepdev.sfm.backend.ai.extraction;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.ai.extraction.dto.ExtractionResult;
import com.fepdev.sfm.backend.ai.extraction.dto.RecordExtractionRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/ai/records")
public class AiExtractionController {

    private final RecordExtractionService extractionService;

    public AiExtractionController(RecordExtractionService extractionService) {
        this.extractionService = extractionService;
    }

    @PostMapping("/extract")
    public ResponseEntity<ExtractionResult> extract(@Valid @RequestBody RecordExtractionRequest request) {
        return ResponseEntity.ok(extractionService.extract(request));
    }
}
