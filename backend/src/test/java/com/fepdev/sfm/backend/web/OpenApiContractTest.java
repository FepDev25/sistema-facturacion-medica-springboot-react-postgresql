package com.fepdev.sfm.backend.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedDiagnosis;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedPrescription;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedProcedure;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractionResult;
import com.fepdev.sfm.backend.ai.history.dto.HistorySource;
import com.fepdev.sfm.backend.ai.history.dto.PatientHistoryAnswer;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10Suggestion;
import com.fepdev.sfm.backend.ai.icd10.dto.Icd10SuggestionResult;
import com.fepdev.sfm.backend.ai.lab.AiLabResponse;
import com.fepdev.sfm.backend.ai.suggestion.dto.ItemSuggestionResult;
import com.fepdev.sfm.backend.ai.suggestion.dto.SuggestedItem;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentResponse;
import com.fepdev.sfm.backend.domain.dashboard.dto.DashboardMetricsResponse;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse;
import com.fepdev.sfm.backend.domain.payment.PaymentMethod;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentResponse;

import tools.jackson.databind.ObjectMapper;

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

    @Test
    @SuppressWarnings("unchecked")
    void responseSchemaPropertiesMatchSerializedDtos() throws Exception {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.parse("2026-11-13T10:00:00Z");

        InvoiceItemResponse item = new InvoiceItemResponse(
                UUID.randomUUID(), invoiceId, UUID.randomUUID(), "Consulta", null, null,
                ItemType.SERVICE, "Consulta general", 1, new BigDecimal("100.00"),
                new BigDecimal("100.00"), now);
        PaymentResponse payment = new PaymentResponse(
                UUID.randomUUID(), invoiceId, "FAC-2026-00001", new BigDecimal("116.00"),
                PaymentMethod.CASH, null, null, now, now);

        InvoiceResponse invoice = new InvoiceResponse(
                invoiceId, patientId, "Ana", "Lopez", appointmentId, null, "FAC-2026-00001",
                new BigDecimal("100.00"), new BigDecimal("16.00"), new BigDecimal("116.00"),
                new BigDecimal("0.00"), new BigDecimal("116.00"), InvoiceStatus.PENDING,
                LocalDate.parse("2026-11-13"), LocalDate.parse("2026-12-13"), null,
                List.of(item), now, now);

        AppointmentResponse appointment = new AppointmentResponse(
                appointmentId, patientId, "Ana", "Lopez", UUID.randomUUID(), "Carlos", "Ruiz",
                now, now.plusMinutes(30), 30, Status.SCHEDULED, invoiceId, "FAC-2026-00001",
                "Dolor", null, now, now);

        DashboardMetricsResponse metrics = new DashboardMetricsResponse(
                10, 4, 2, 5, 3, 1, new BigDecimal("1500.00"), new BigDecimal("800.00"));

        AiLabResponse lab = new AiLabResponse(
                "claude-haiku-4-5-20251001", "v3", true, 20, 900, 4,
                List.of(new AiLabResponse.FeatureInfo(
                        "icd10", "ICD-10", "/api/v1/ai/icd10/suggest", "v3", "Sugerencias")),
                List.of(new AiLabResponse.ModelPricing("claude-haiku-4-5-20251001", 1.0, 5.0)),
                List.of(new AiLabResponse.FeatureUsage("icd10", 1, 0, 100, 50, 0.01, 900)),
                new AiLabResponse.EvalsInfo("manual", 1, Map.of("icd10", Map.of("precision", 0.9))));

        PatientHistoryAnswer history = new PatientHistoryAnswer(
                "El paciente tiene hipertension.", List.of(new HistorySource(UUID.randomUUID(), "2026-01-20")));

        ExtractionResult extraction = new ExtractionResult(
                List.of(new ExtractedDiagnosis("I10", "Hipertension", "moderate")),
                List.of(new ExtractedPrescription(
                        "Losartan", UUID.randomUUID(), "50mg", "Diario", 90, null)),
                List.of(new ExtractedProcedure("IMG-003", "ECG", null)));

        ItemSuggestionResult suggestion = new ItemSuggestionResult(
                List.of(new SuggestedItem(
                        "service", "Consulta", UUID.randomUUID(), new BigDecimal("100.00"), "Diagnostico")));

        Icd10SuggestionResult icd10 = new Icd10SuggestionResult(
                List.of(new Icd10Suggestion("I10", "Hipertension esencial", 0.95)));

        assertSchemaMatchesDto("InvoiceResponse", invoice);
        assertSchemaMatchesDto("InvoiceItemResponse", item);
        assertSchemaMatchesDto("PaymentResponse", payment);
        assertSchemaMatchesDto("AppointmentResponse", appointment);
        assertSchemaMatchesDto("DashboardMetricsResponse", metrics);
        assertSchemaMatchesDto("AiLabResponse", lab);
        assertSchemaMatchesDto("PatientHistoryAnswer", history);
        assertSchemaMatchesDto("ExtractionResult", extraction);
        assertSchemaMatchesDto("ItemSuggestionResult", suggestion);
        assertSchemaMatchesDto("Icd10SuggestionResult", icd10);
    }

    @Test
    void openApiDocumentsTheActualResponseSchemasConsumedByTheFrontend() {
        assertResponseSchema("/api/v1/invoices/{id}", "get", "200", "InvoiceResponse");
        assertResponseSchema("/api/v1/invoices/{id}/view", "get", "200", "InvoiceViewResponse");
        assertResponseSchema("/api/v1/invoices/view", "get", "200", "PageInvoiceListViewResponse");
        assertResponseSchema("/api/v1/appointments/{id}", "get", "200", "AppointmentResponse");
        assertResponseSchema("/api/v1/dashboard/metrics", "get", "200", "DashboardMetricsResponse");
        assertResponseSchema("/api/v1/ai/records/extract", "post", "200", "ExtractionResult");
        assertResponseSchema("/api/v1/ai/icd10/suggest", "post", "200", "Icd10SuggestionResult");
        assertResponseSchema(
                "/api/v1/ai/invoices/{id}/suggest-items", "post", "200", "ItemSuggestionResult");
        assertResponseSchema(
                "/api/v1/ai/patients/{patientId}/query", "post", "200", "PatientHistoryAnswer");
        assertResponseSchema("/api/v1/ai/lab", "get", "200", "AiLabResponse");

        Map<String, Object> streamOperation =
                operation("/api/v1/ai/patients/{patientId}/query/stream", "post");
        Map<String, Object> stream = (Map<String, Object>) streamOperation.get("responses");
        assertThat(stream).containsKeys("200", "503");
        assertThat((String) streamOperation.get("description")).contains("token", "done", "error");
    }

    @SuppressWarnings("unchecked")
    private void assertSchemaMatchesDto(String schemaName, Object dto) throws Exception {
        Map<String, Object> properties = (Map<String, Object>) schema(schemaName).get("properties");
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> serialized = mapper.readValue(mapper.writeValueAsString(dto), Map.class);

        assertThat(serialized.keySet())
                .as("El DTO %s debe serializar exactamente las propiedades del contrato", schemaName)
                .containsExactlyInAnyOrderElementsOf(properties.keySet());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> schema(String name) {
        Map<String, Object> schemas =
                (Map<String, Object>) ((Map<String, Object>) document.get("components")).get("schemas");
        Map<String, Object> schema = (Map<String, Object>) schemas.get(name);
        assertThat(schema).as("schema %s", name).isNotNull();
        return schema;
    }

    @SuppressWarnings("unchecked")
    private void assertResponseSchema(String path, String method, String status, String schemaName) {
        Map<String, Object> operation = operation(path, method);
        Map<String, Object> responses = (Map<String, Object>) operation.get("responses");
        Map<String, Object> response = (Map<String, Object>) responses.get(status);
        assertThat(response).as("%s %s -> %s", method, path, status).isNotNull();
        Map<String, Object> content = (Map<String, Object>) response.get("content");
        Map<String, Object> json = (Map<String, Object>) content.get("application/json");
        Map<String, Object> schema = (Map<String, Object>) json.get("schema");
        assertThat(schema.get("$ref"))
                .as("%s %s -> %s", method, path, status)
                .isEqualTo("#/components/schemas/" + schemaName);
    }
}
