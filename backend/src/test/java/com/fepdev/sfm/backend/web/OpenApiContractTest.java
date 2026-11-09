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
                "/api/v1/ai/patients/{patientId}/query");

        operation("/api/v1/dashboard/metrics", "get");
        operation("/api/v1/invoices/{id}/items", "post");
        operation("/api/v1/ai/records/extract", "post");
        operation("/api/v1/ai/invoices/{id}/suggest-items", "post");
        operation("/api/v1/ai/icd10/suggest", "post");
        operation("/api/v1/ai/patients/{patientId}/query", "post");
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
