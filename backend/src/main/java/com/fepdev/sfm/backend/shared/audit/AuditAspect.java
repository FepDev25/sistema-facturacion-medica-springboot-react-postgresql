package com.fepdev.sfm.backend.shared.audit;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceItem;
import com.fepdev.sfm.backend.domain.invoice.InvoiceItemRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionResponse;

// aspecto que audita operaciones sensibles sobre Diagnosis, Prescription e Invoice
//
// @Order(1) hace que este aspecto sea la capa más externa:
//   Cliente → AuditAspect (order=1) → TransactionProxy (order=MAX) → Servicio
//
// cuando pjp.proceed() retorna, la transacción del servicio ya fue confirmada.
// si el servicio lanza excepción, el aspecto la re-lanza sin guardar nada.
@Aspect
@Component
@Order(1)
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final ObjectMapper objectMapper;

    public AuditAspect(AuditLogRepository auditLogRepository,
                       InvoiceRepository invoiceRepository,
                       InvoiceItemRepository invoiceItemRepository,
                       ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.objectMapper = objectMapper;
    }

    // auditar creación de diagnóstico
    @Around("execution(* com.fepdev.sfm.backend.domain.medicalrecord.DiagnosisService.addDiagnosis(..))")
    public Object auditAddDiagnosis(ProceedingJoinPoint pjp) throws Throwable {
        Object result = pjp.proceed();
        DiagnosisResponse response = (DiagnosisResponse) result;
        saveAudit("Diagnosis", response.id(), AuditAction.CREATE, null, toJson(response));
        return result;
    }

    // auditar creación de prescripción
    @Around("execution(* com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionService.createPrescription(..))")
    public Object auditCreatePrescription(ProceedingJoinPoint pjp) throws Throwable {
        Object result = pjp.proceed();
        PrescriptionResponse response = (PrescriptionResponse) result;
        saveAudit("Prescription", response.id(), AuditAction.CREATE, null, toJson(response));
        return result;
    }

    // auditar creación de factura draft
    @Around("execution(* com.fepdev.sfm.backend.domain.invoice.InvoiceService.createDraftInvoice(..))")
    public Object auditCreateDraftInvoice(ProceedingJoinPoint pjp) throws Throwable {
        Object result = pjp.proceed();
        Invoice invoice = (Invoice) result;
        Map<String, Object> newValues = Map.of(
                "invoiceNumber", invoice.getInvoiceNumber(),
                "status", invoice.getStatus().name(),
                "patientId", invoice.getPatient().getId().toString()
        );
        saveAudit("Invoice", invoice.getId(), AuditAction.CREATE, null, toJson(newValues));
        return result;
    }

    // auditar transiciones de estado de factura
    @Around("execution(* com.fepdev.sfm.backend.domain.invoice.InvoiceService.confirmInvoice(..))")
    public Object auditConfirmInvoice(ProceedingJoinPoint pjp) throws Throwable {
        return auditInvoiceStatusChange(pjp);
    }

    @Around("execution(* com.fepdev.sfm.backend.domain.invoice.InvoiceService.markOverdue(..))")
    public Object auditMarkOverdue(ProceedingJoinPoint pjp) throws Throwable {
        return auditInvoiceStatusChange(pjp);
    }

    @Around("execution(* com.fepdev.sfm.backend.domain.invoice.InvoiceService.cancelInvoice(..))")
    public Object auditCancelInvoice(ProceedingJoinPoint pjp) throws Throwable {
        return auditInvoiceStatusChange(pjp);
    }

    // auditar agregar y eliminar ítems de factura
    @Around("execution(* com.fepdev.sfm.backend.domain.invoice.InvoiceService.addItem(..))")
    public Object auditAddItem(ProceedingJoinPoint pjp) throws Throwable {
        Object result = pjp.proceed();
        InvoiceItemResponse response = (InvoiceItemResponse) result;
        UUID invoiceId = (UUID) pjp.getArgs()[0];
        saveAudit("Invoice", invoiceId, AuditAction.UPDATE, null, toJson(response));
        return result;
    }

    @Around("execution(* com.fepdev.sfm.backend.domain.invoice.InvoiceService.removeItem(..))")
    public Object auditRemoveItem(ProceedingJoinPoint pjp) throws Throwable {
        UUID invoiceId = (UUID) pjp.getArgs()[0];
        UUID itemId    = (UUID) pjp.getArgs()[1];

        // leemos el ítem antes de que el servicio lo elimine
        String oldValues = invoiceItemRepository.findById(itemId)
                .map(this::invoiceItemToMap)
                .map(this::toJson)
                .orElse(null);

        pjp.proceed();

        saveAudit("Invoice", invoiceId, AuditAction.UPDATE, oldValues, null);
        return null;
    }

    // captura el status de la factura antes y después del commit para los métodos void de transición
    private Object auditInvoiceStatusChange(ProceedingJoinPoint pjp) throws Throwable {
        UUID invoiceId = (UUID) pjp.getArgs()[0];

        String oldValues = invoiceRepository.findById(invoiceId)
                .map(inv -> Map.of("status", inv.getStatus().name()))
                .map(this::toJson)
                .orElse(null);

        pjp.proceed();

        String newValues = invoiceRepository.findById(invoiceId)
                .map(inv -> Map.of("status", inv.getStatus().name()))
                .map(this::toJson)
                .orElse(null);

        saveAudit("Invoice", invoiceId, AuditAction.UPDATE, oldValues, newValues);
        return null;
    }

    private void saveAudit(String entityName, UUID entityId, AuditAction action,
                           String oldValues, String newValues) {
        AuditLog entry = AuditLog.builder()
                .entityName(entityName)
                .entityId(entityId)
                .action(action)
                .performedBy(resolveCurrentUser())
                .performedAt(OffsetDateTime.now(ZoneOffset.UTC))
                .oldValues(oldValues)
                .newValues(newValues)
                .build();
        auditLogRepository.save(entry);
    }

    private String resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return "system";
        }
        return auth.getName();
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return "{\"error\":\"serialization_failed\"}";
        }
    }

    private String toJson(Map<String, ?> map) {
        return toJson((Object) map);
    }

    private Map<String, Object> invoiceItemToMap(InvoiceItem item) {
        return Map.of(
                "id", item.getId().toString(),
                "itemType", item.getItemType().name(),
                "description", item.getDescription(),
                "quantity", item.getQuantity(),
                "unitPrice", item.getUnitPrice().toPlainString(),
                "subtotal", item.getSubtotal().toPlainString()
        );
    }
}
