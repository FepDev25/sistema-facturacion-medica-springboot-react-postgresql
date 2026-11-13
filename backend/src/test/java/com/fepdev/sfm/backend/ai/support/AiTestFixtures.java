package com.fepdev.sfm.backend.ai.support;

import java.util.List;

import org.springframework.ai.chat.metadata.ChatResponseMetadata;
import org.springframework.ai.chat.metadata.DefaultUsage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.messages.AssistantMessage;

// Utilidades compartidas por los tests de IA: construyen ChatResponse reales para
// verificar tokens/costo y contenido sin llamar a ningun proveedor.
public final class AiTestFixtures {

    public static final String MODEL = "claude-haiku-4-5-20251001";

    private AiTestFixtures() {
    }

    public static ChatResponse response(String text) {
        return response(text, 10, 5);
    }

    public static ChatResponse response(String text, Integer promptTokens, Integer completionTokens) {
        return response(text, promptTokens, completionTokens, MODEL);
    }

    public static ChatResponse response(String text, Integer promptTokens,
            Integer completionTokens, String model) {
        ChatResponseMetadata.Builder metadata = ChatResponseMetadata.builder().model(model);
        if (promptTokens != null || completionTokens != null) {
            metadata.usage(new DefaultUsage(promptTokens, completionTokens));
        }
        return new ChatResponse(
                List.of(new Generation(new AssistantMessage(text))),
                metadata.build());
    }

    public static ChatResponse responseWithoutMetadata(String text) {
        return new ChatResponse(List.of(new Generation(new AssistantMessage(text))));
    }
}
