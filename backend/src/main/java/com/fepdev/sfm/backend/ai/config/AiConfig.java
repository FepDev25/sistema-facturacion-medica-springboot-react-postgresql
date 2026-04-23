package com.fepdev.sfm.backend.ai.config;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiConfig {

    @Bean
    public ChatClient chatClient(AnthropicChatModel chatModel) {
        return ChatClient.builder(chatModel).build();
    }
}
