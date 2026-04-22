package com.fepdev.sfm.backend.ai.suggestion;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.ai.suggestion.dto.ItemSuggestionResult;

@RestController
@RequestMapping("/api/v1/ai/invoices")
public class AiItemSuggestionController {

    private final ItemSuggestionService suggestionService;

    public AiItemSuggestionController(ItemSuggestionService suggestionService) {
        this.suggestionService = suggestionService;
    }

    @PostMapping("/{id}/suggest-items")
    public ResponseEntity<ItemSuggestionResult> suggestItems(@PathVariable UUID id) {
        return ResponseEntity.ok(suggestionService.suggestItems(id));
    }
}
