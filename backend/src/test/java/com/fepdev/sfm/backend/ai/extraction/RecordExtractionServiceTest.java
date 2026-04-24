package com.fepdev.sfm.backend.ai.extraction;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RecordExtractionServiceTest {

    @Mock org.springframework.ai.chat.client.ChatClient chatClient;
    @Mock com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository medicationsRepo;

    @InjectMocks
    RecordExtractionService service;

    @Test
    void service_isCreated() {
        assertThat(service).isNotNull();
    }
}
