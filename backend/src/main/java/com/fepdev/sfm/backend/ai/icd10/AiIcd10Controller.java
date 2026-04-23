package com.fepdev.sfm.backend.ai.icd10;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.ai.icd10.dto.Icd10Query;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10SuggestionResult;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/ai/icd10")
public class AiIcd10Controller {

    private final Icd10SuggestionService suggestionService;

    public AiIcd10Controller(Icd10SuggestionService suggestionService) {
        this.suggestionService = suggestionService;
    }

    @PostMapping("/suggest")
    public ResponseEntity<Icd10SuggestionResult> suggest(@Valid @RequestBody Icd10Query request) {
        return ResponseEntity.ok(suggestionService.suggest(request.query()));
    }
}
