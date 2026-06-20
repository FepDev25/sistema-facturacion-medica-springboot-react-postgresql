package com.fepdev.sfm.backend.ai.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;

class AiConfigTest {

    private final AiConfig config = new AiConfig();

    @Test
    void chatClient_creates_bean() {
        AnthropicChatModel mockModel = mock(AnthropicChatModel.class);

        ChatClient client = config.chatClient(mockModel);

        assertThat(client).isNotNull();
    }
}
