package com.fepdev.sfm.backend.ai.icd10;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.ai.vectorstore.VectorStore;

@ExtendWith(MockitoExtension.class)
class Icd10SuggestionServiceTest {

    @Mock VectorStore vectorStore;
    @Mock org.springframework.ai.chat.client.ChatClient chatClient;

    @InjectMocks
    Icd10SuggestionService service;

    @Test
    void service_isCreated() {
        assertThat(service).isNotNull();
    }
}
