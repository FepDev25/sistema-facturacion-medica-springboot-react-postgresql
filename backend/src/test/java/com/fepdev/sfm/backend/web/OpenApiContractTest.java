package com.fepdev.sfm.backend.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

// Guardia de contrato: evita que el openapi.yaml se desincronice de los endpoints
// que el frontend consume y de las reglas de validacion del backend.
class OpenApiContractTest {

    private static Map<String, Object> document;

    @BeforeAll
    @SuppressWarnings("unchecked")
    static void loadSpec() throws Exception {
        try (InputStream in = Files.newInputStream(Path.of("openapi/openapi.yaml"))) {
            document = new Yaml().load(in);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> paths() {
        return (Map<String, Object>) document.get("paths");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> operation(String path, String method) {
        Map<String, Object> pathItem = (Map<String, Object>) paths().get(path);
        assertThat(pathItem).as("path %s", path).isNotNull();
        Map<String, Object> operation = (Map<String, Object>) pathItem.get(method);
        assertThat(operation).as("%s %s", method, path).isNotNull();
        return operation;
    }

    @Test
    void documentsEndpointsConsumedByTheFrontend() {
        assertThat(paths()).containsKeys(
                "/api/v1/dashboard/metrics",
                "/api/v1/invoices/{id}/items",
                "/api/v1/ai/records/extract",
                "/api/v1/ai/invoices/{id}/suggest-items",
                "/api/v1/ai/icd10/suggest",
                "/api/v1/ai/patients/{patientId}/query",
                "/api/v1/ai/patients/{patientId}/query/stream",
                "/api/v1/ai/patients/{patientId}/conversation",
                "/api/v1/ai/patients/{patientId}/reindex",
                "/api/v1/ai/lab");

        operation("/api/v1/dashboard/metrics", "get");
        operation("/api/v1/invoices/{id}/items", "post");
        operation("/api/v1/ai/records/extract", "post");
        operation("/api/v1/ai/invoices/{id}/suggest-items", "post");
        operation("/api/v1/ai/icd10/suggest", "post");
        operation("/api/v1/ai/patients/{patientId}/query", "post");
        operation("/api/v1/ai/patients/{patientId}/query/stream", "post");
        operation("/api/v1/ai/patients/{patientId}/conversation", "delete");
        operation("/api/v1/ai/patients/{patientId}/reindex", "post");
        operation("/api/v1/ai/lab", "get");
    }

    @Test
    @SuppressWarnings("unchecked")
    void invoiceItemRequestRequiresOnlyFieldsTheClientStillControls() {
        Map<String, Object> schemas =
                (Map<String, Object>) ((Map<String, Object>) document.get("components")).get("schemas");
        Map<String, Object> request = (Map<String, Object>) schemas.get("InvoiceItemRequest");

        assertThat((List<String>) request.get("required"))
                .contains("itemType", "quantity")
                .doesNotContain("description", "unitPrice");
    }

    @Test
    @SuppressWarnings("unchecked")
    void authEndpointsUseCookieSessionContract() {
        Map<String, Object> login = operation("/api/v1/auth/login", "post");
        Map<String, Object> loginResponses = (Map<String, Object>) login.get("responses");
        Map<String, Object> loginOk = (Map<String, Object>) loginResponses.get("200");
        Map<String, Object> loginContent = (Map<String, Object>) loginOk.get("content");
        Map<String, Object> loginJson = (Map<String, Object>) loginContent.get("application/json");
        Map<String, Object> loginSchema = (Map<String, Object>) loginJson.get("schema");
        assertThat(loginSchema.get("$ref")).isEqualTo("#/components/schemas/SessionResponse");

        assertThat(operation("/api/v1/auth/refresh", "post")).doesNotContainKey("requestBody");
        assertThat(operation("/api/v1/auth/logout", "post")).doesNotContainKey("requestBody");

        Map<String, Object> schemas =
                (Map<String, Object>) ((Map<String, Object>) document.get("components")).get("schemas");
        Map<String, Object> session = (Map<String, Object>) schemas.get("SessionResponse");
        Map<String, Object> properties = (Map<String, Object>) session.get("properties");

        assertThat(properties).containsKeys("role", "userId", "username")
                .doesNotContainKeys("accessToken", "refreshToken", "tokenType");
        assertThat(schemas).doesNotContainKeys(
                "TokenResponse", "RefreshTokenRequest", "LogoutRequest");
    }

    @Test
    @SuppressWarnings("unchecked")
    void aiLabSchemaMatchesTheReadOnlySnapshot() {
        Map<String, Object> schemas =
                (Map<String, Object>) ((Map<String, Object>) document.get("components")).get("schemas");
        Map<String, Object> lab = (Map<String, Object>) schemas.get("AiLabResponse");
        Map<String, Object> properties = (Map<String, Object>) lab.get("properties");

        assertThat(properties).containsKeys(
                "model", "promptVersion", "distributedRateLimit", "rateLimitPerMinute",
                "memoryTtlSeconds", "memoryMaxTurns", "features", "pricing", "usage", "evals");
        assertThat(schemas).containsKeys("AiLabFeature", "AiLabPricing", "AiLabUsage", "AiLabEvals");

        Map<String, Object> stream = operation("/api/v1/ai/patients/{patientId}/query/stream", "post");
        Map<String, Object> responses = (Map<String, Object>) stream.get("responses");
        Map<String, Object> ok = (Map<String, Object>) responses.get("200");
        Map<String, Object> content = (Map<String, Object>) ok.get("content");
        assertThat(content).containsKey("text/event-stream");
    }

    @Test
    @SuppressWarnings("unchecked")
    void dashboardMetricsSchemaMatchesTheAggregatedResponse() {
        Map<String, Object> schemas =
                (Map<String, Object>) ((Map<String, Object>) document.get("components")).get("schemas");
        Map<String, Object> metrics = (Map<String, Object>) schemas.get("DashboardMetricsResponse");
        Map<String, Object> properties = (Map<String, Object>) metrics.get("properties");

        assertThat(properties).containsKeys(
                "totalPatients", "activeDoctors", "appointmentsToday", "upcomingAppointments",
                "pendingInvoices", "overdueInvoices", "totalCollected", "pendingCollection");
    }
}
