package com.fepdev.sfm.backend.ai.history;

import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryQuery;
import com.fepdev.sfm.backend.ai.history.dto.ReindexResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/ai/patients")
public class AiPatientHistoryController {

    private static final long SSE_TIMEOUT_MS = 120_000L;

    private final PatientHistoryQueryService queryService;

    public AiPatientHistoryController(PatientHistoryQueryService queryService) {
        this.queryService = queryService;
    }

    @PostMapping("/{patientId}/query")
    public ResponseEntity<PatientHistoryAnswer> query(
            @PathVariable UUID patientId,
            @Valid @RequestBody PatientHistoryQuery request,
            Authentication authentication) {
        return ResponseEntity.ok(queryService.query(patientId, request.question(), userId(authentication)));
    }

    // Alternativa SSE para respuestas largas: el endpoint original sigue igual para
    // clientes que no consumen streaming.
    @PostMapping(value = "/{patientId}/query/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter queryStream(
            @PathVariable UUID patientId,
            @Valid @RequestBody PatientHistoryQuery request,
            Authentication authentication) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        String userId = userId(authentication);

        try {
            var subscription = queryService.streamQuery(
                    patientId,
                    request.question(),
                    userId,
                    token -> send(emitter, "token", token),
                    answer -> {
                        send(emitter, "done", answer);
                        emitter.complete();
                    },
                    error -> {
                        send(
                                emitter,
                                "error",
                                Map.of(
                                        "message",
                                        error.getMessage() != null
                                                ? error.getMessage()
                                                : "Error al consultar el historial"));
                        emitter.complete();
                    });
            // Si el cliente cierra la conexión, se cancela la llamada al proveedor para
            // no seguir consumiendo tokens.
            if (subscription != null) {
                emitter.onCompletion(subscription::dispose);
                emitter.onTimeout(subscription::dispose);
            }
        } catch (RuntimeException ex) {
            // Errores de validacion (paciente inexistente) se propagan como 404/422 antes
            // de que la respuesta SSE haya empezado.
            throw ex;
        }

        return emitter;
    }

    @PostMapping("/{patientId}/reindex")
    public ResponseEntity<ReindexResponse> reindex(@PathVariable UUID patientId) {
        return ResponseEntity.ok(queryService.reindex(patientId));
    }

    // Limpia la memoria server-side del usuario para ese paciente (el boton "Limpiar"
    // del chat tambien debe olvidar los turnos anteriores).
    @DeleteMapping("/{patientId}/conversation")
    public ResponseEntity<Void> clearConversation(@PathVariable UUID patientId, Authentication authentication) {
        queryService.clearConversation(patientId, userId(authentication));
        return ResponseEntity.noContent().build();
    }

    private static String userId(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated() ? authentication.getName() : "anonymous";
    }

    private static void send(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(data));
        } catch (IOException | IllegalStateException ex) {
            emitter.completeWithError(ex);
        }
    }
}
