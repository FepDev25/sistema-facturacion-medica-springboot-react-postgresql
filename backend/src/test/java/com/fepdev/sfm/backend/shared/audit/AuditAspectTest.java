package com.fepdev.sfm.backend.shared.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceItem;
import com.fepdev.sfm.backend.domain.invoice.InvoiceItemRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.invoice.ItemType;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.Severity;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.DiagnosisResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionResponse;
import com.fepdev.sfm.backend.domain.patient.Patient;

import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AuditAspectTest {

    @Mock AuditLogRepository auditLogRepository;
    @Mock InvoiceRepository invoiceRepository;
    @Mock InvoiceItemRepository invoiceItemRepository;
    @Mock ProceedingJoinPoint pjp;

    ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks AuditAspect auditAspect;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        ReflectionTestUtils.setField(auditAspect, "objectMapper", objectMapper);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setAuthenticatedUser(String username) {
        Authentication auth = new UsernamePasswordAuthenticationToken(username, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void setAnonymousUser() {
        Authentication auth = new UsernamePasswordAuthenticationToken("anonymousUser", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @SuppressWarnings("unchecked")
    private <T> void mockPjpArgs(Object... args) {
        when(pjp.getArgs()).thenReturn(args);
    }

    // =========================================================
    // auditAddDiagnosis
    // =========================================================

    @Test
    void auditAddDiagnosis_savesAuditLogWithCreateAction() throws Throwable {
        UUID id = UUID.randomUUID();
        DiagnosisResponse response = new DiagnosisResponse(
                id, UUID.randomUUID(), UUID.randomUUID(),
                "J01.9", "Sinusitis aguda", Severity.MILD,
                OffsetDateTime.now(), OffsetDateTime.now());

        when(pjp.proceed()).thenReturn(response);

        Object result = auditAspect.auditAddDiagnosis(pjp);

        assertThat(result).isEqualTo(response);
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getEntityName()).isEqualTo("Diagnosis");
        assertThat(log.getEntityId()).isEqualTo(id);
        assertThat(log.getAction()).isEqualTo(AuditAction.CREATE);
        assertThat(log.getPerformedBy()).isEqualTo("system");
        assertThat(log.getNewValues()).isNotNull();
        assertThat(log.getOldValues()).isNull();
    }

    // =========================================================
    // auditCreatePrescription
    // =========================================================

    @Test
    void auditCreatePrescription_savesAuditLogWithCreateAction() throws Throwable {
        UUID id = UUID.randomUUID();
        PrescriptionResponse response = new PrescriptionResponse(
                id, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "Ibuprofeno", "400mg", "Cada 8h", 7, null, OffsetDateTime.now());

        when(pjp.proceed()).thenReturn(response);

        Object result = auditAspect.auditCreatePrescription(pjp);

        assertThat(result).isEqualTo(response);
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getEntityName()).isEqualTo("Prescription");
        assertThat(log.getEntityId()).isEqualTo(id);
        assertThat(log.getAction()).isEqualTo(AuditAction.CREATE);
    }

    // =========================================================
    // auditCreateDraftInvoice
    // =========================================================

    @Test
    void auditCreateDraftInvoice_savesAuditLogWithInvoiceDetails() throws Throwable {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();

        Patient patient = new Patient();
        ReflectionTestUtils.setField(patient, "id", patientId);

        Invoice invoice = new Invoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        invoice.setInvoiceNumber("FAC-2026-00001");
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setPatient(patient);

        when(pjp.proceed()).thenReturn(invoice);

        Object result = auditAspect.auditCreateDraftInvoice(pjp);

        assertThat(result).isEqualTo(invoice);
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getEntityName()).isEqualTo("Invoice");
        assertThat(log.getEntityId()).isEqualTo(invoiceId);
        assertThat(log.getAction()).isEqualTo(AuditAction.CREATE);
        assertThat(log.getNewValues()).contains("FAC-2026-00001");
        assertThat(log.getOldValues()).isNull();
    }

    // =========================================================
    // auditConfirmInvoice / auditMarkOverdue / auditCancelInvoice
    // =========================================================

    @Test
    void auditConfirmInvoice_savesAuditLogWithStatusChange() throws Throwable {
        UUID invoiceId = UUID.randomUUID();

        Invoice before = new Invoice();
        before.setStatus(InvoiceStatus.DRAFT);

        Invoice after = new Invoice();
        after.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(before))
                .thenReturn(Optional.of(after));
        mockPjpArgs(invoiceId);
        when(pjp.proceed()).thenReturn(null);

        auditAspect.auditConfirmInvoice(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getEntityName()).isEqualTo("Invoice");
        assertThat(log.getEntityId()).isEqualTo(invoiceId);
        assertThat(log.getAction()).isEqualTo(AuditAction.UPDATE);
        assertThat(log.getOldValues()).contains("DRAFT");
        assertThat(log.getNewValues()).contains("PENDING");
    }

    @Test
    void auditMarkOverdue_savesAuditLogWithStatusChange() throws Throwable {
        UUID invoiceId = UUID.randomUUID();

        Invoice before = new Invoice();
        before.setStatus(InvoiceStatus.PENDING);

        Invoice after = new Invoice();
        after.setStatus(InvoiceStatus.OVERDUE);

        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(before))
                .thenReturn(Optional.of(after));
        mockPjpArgs(invoiceId);
        when(pjp.proceed()).thenReturn(null);

        auditAspect.auditMarkOverdue(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getOldValues()).contains("PENDING");
        assertThat(log.getNewValues()).contains("OVERDUE");
    }

    @Test
    void auditCancelInvoice_savesAuditLogWithStatusChange() throws Throwable {
        UUID invoiceId = UUID.randomUUID();

        Invoice before = new Invoice();
        before.setStatus(InvoiceStatus.DRAFT);

        Invoice after = new Invoice();
        after.setStatus(InvoiceStatus.CANCELLED);

        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(before))
                .thenReturn(Optional.of(after));
        mockPjpArgs(invoiceId);
        when(pjp.proceed()).thenReturn(null);

        auditAspect.auditCancelInvoice(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getOldValues()).contains("DRAFT");
        assertThat(log.getNewValues()).contains("CANCELLED");
    }

    @Test
    void auditInvoiceStatusChange_whenInvoiceNotFound_savesAuditWithNullValues() throws Throwable {
        UUID invoiceId = UUID.randomUUID();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());
        mockPjpArgs(invoiceId);
        when(pjp.proceed()).thenReturn(null);

        auditAspect.auditConfirmInvoice(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getOldValues()).isNull();
        assertThat(log.getNewValues()).isNull();
    }

    // =========================================================
    // auditAddItem
    // =========================================================

    @Test
    void auditAddItem_savesAuditLogWithItemDetails() throws Throwable {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        InvoiceItemResponse response = new InvoiceItemResponse(
                itemId, invoiceId, null, "Consulta", null, null,
                ItemType.SERVICE, "Consulta general", 1,
                new BigDecimal("100.00"), new BigDecimal("100.00"), OffsetDateTime.now());

        when(pjp.proceed()).thenReturn(response);
        mockPjpArgs(invoiceId);

        Object result = auditAspect.auditAddItem(pjp);

        assertThat(result).isEqualTo(response);
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getEntityName()).isEqualTo("Invoice");
        assertThat(log.getEntityId()).isEqualTo(invoiceId);
        assertThat(log.getAction()).isEqualTo(AuditAction.UPDATE);
        assertThat(log.getNewValues()).contains("Consulta general");
        assertThat(log.getOldValues()).isNull();
    }

    // =========================================================
    // auditRemoveItem
    // =========================================================

    @Test
    void auditRemoveItem_savesAuditLogWithOldItemValues() throws Throwable {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        InvoiceItem item = new InvoiceItem();
        ReflectionTestUtils.setField(item, "id", itemId);
        item.setItemType(ItemType.MEDICATION);
        item.setDescription("Ibuprofeno 400mg");
        item.setQuantity(2);
        item.setUnitPrice(new BigDecimal("15.00"));
        item.setSubtotal(new BigDecimal("30.00"));

        when(invoiceItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        mockPjpArgs(invoiceId, itemId);
        when(pjp.proceed()).thenReturn(null);

        auditAspect.auditRemoveItem(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getEntityName()).isEqualTo("Invoice");
        assertThat(log.getEntityId()).isEqualTo(invoiceId);
        assertThat(log.getAction()).isEqualTo(AuditAction.UPDATE);
        assertThat(log.getOldValues()).contains("Ibuprofeno 400mg");
        assertThat(log.getNewValues()).isNull();
    }

    @Test
    void auditRemoveItem_whenItemNotFound_savesAuditWithNullOldValues() throws Throwable {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        when(invoiceItemRepository.findById(itemId)).thenReturn(Optional.empty());
        mockPjpArgs(invoiceId, itemId);
        when(pjp.proceed()).thenReturn(null);

        auditAspect.auditRemoveItem(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLog log = captor.getValue();
        assertThat(log.getOldValues()).isNull();
    }

    // =========================================================
    // resolveCurrentUser — branches
    // =========================================================

    @Test
    void resolveCurrentUser_whenNoAuth_returnsSystem() throws Throwable {
        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "J01.9", "Sinusitis", Severity.MODERATE,
                OffsetDateTime.now(), OffsetDateTime.now());

        when(pjp.proceed()).thenReturn(response);

        auditAspect.auditAddDiagnosis(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getPerformedBy()).isEqualTo("system");
    }

    @Test
    void resolveCurrentUser_whenAnonymousUser_returnsSystem() throws Throwable {
        setAnonymousUser();

        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "J01.9", "Sinusitis", Severity.MODERATE,
                OffsetDateTime.now(), OffsetDateTime.now());

        when(pjp.proceed()).thenReturn(response);

        auditAspect.auditAddDiagnosis(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getPerformedBy()).isEqualTo("system");
    }

    @Test
    void resolveCurrentUser_whenAuthenticated_returnsUsername() throws Throwable {
        setAuthenticatedUser("admin");

        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "J01.9", "Sinusitis", Severity.MODERATE,
                OffsetDateTime.now(), OffsetDateTime.now());

        when(pjp.proceed()).thenReturn(response);

        auditAspect.auditAddDiagnosis(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getPerformedBy()).isEqualTo("admin");
    }

    // =========================================================
    // toJson — branches
    // =========================================================

    @Test
    void toJson_whenObjectNull_returnsNull() throws Throwable {
        UUID invoiceId = UUID.randomUUID();
        Invoice before = new Invoice();
        before.setStatus(InvoiceStatus.DRAFT);

        Invoice after = new Invoice();
        after.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId))
                .thenReturn(Optional.of(before))
                .thenReturn(Optional.of(after));
        mockPjpArgs(invoiceId);

        ObjectMapper workingMapper = new ObjectMapper();
        ReflectionTestUtils.setField(auditAspect, "objectMapper", workingMapper);

        auditAspect.auditConfirmInvoice(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getNewValues()).isNotNull();
    }

    @Test
    void toJson_whenSerializationFails_returnsErrorJson() throws Throwable {
        ObjectMapper failingMapper = new ObjectMapper() {
            @Override
            public String writeValueAsString(Object value) throws tools.jackson.core.JacksonException {
                throw new tools.jackson.core.JacksonException(null, "forced failure") {};
            }
        };
        ReflectionTestUtils.setField(auditAspect, "objectMapper", failingMapper);

        DiagnosisResponse response = new DiagnosisResponse(
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "J01.9", "Sinusitis", Severity.MODERATE,
                OffsetDateTime.now(), OffsetDateTime.now());

        when(pjp.proceed()).thenReturn(response);

        auditAspect.auditAddDiagnosis(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getNewValues()).contains("serialization_failed");
    }

    @Test
    void toJson_whenMapNull_returnsNull() throws Throwable {
        UUID invoiceId = UUID.randomUUID();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());
        mockPjpArgs(invoiceId);
        when(pjp.proceed()).thenReturn(null);

        auditAspect.auditConfirmInvoice(pjp);

        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getOldValues()).isNull();
        assertThat(captor.getValue().getNewValues()).isNull();
    }

    // =========================================================
    // exception propagation — service throws, no audit saved
    // =========================================================

    @Test
    void auditAddDiagnosis_whenServiceThrows_propagatesExceptionWithoutSaving() throws Throwable {
        when(pjp.proceed()).thenThrow(new RuntimeException("service error"));

        assertThatThrownBy(() -> auditAspect.auditAddDiagnosis(pjp))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("service error");

        verify(auditLogRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void auditCreateDraftInvoice_whenServiceThrows_propagatesExceptionWithoutSaving() throws Throwable {
        when(pjp.proceed()).thenThrow(new RuntimeException("db error"));

        assertThatThrownBy(() -> auditAspect.auditCreateDraftInvoice(pjp))
                .isInstanceOf(RuntimeException.class);

        verify(auditLogRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void auditInvoiceStatusChange_whenServiceThrows_propagatesExceptionWithoutSaving() throws Throwable {
        UUID invoiceId = UUID.randomUUID();
        Invoice before = new Invoice();
        before.setStatus(InvoiceStatus.DRAFT);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(before));
        mockPjpArgs(invoiceId);
        when(pjp.proceed()).thenThrow(new RuntimeException("tx error"));

        assertThatThrownBy(() -> auditAspect.auditCancelInvoice(pjp))
                .isInstanceOf(RuntimeException.class);

        verify(auditLogRepository, org.mockito.Mockito.never()).save(any());
    }

    @Test
    void auditRemoveItem_whenServiceThrows_propagatesExceptionWithoutSaving() throws Throwable {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();

        when(invoiceItemRepository.findById(itemId)).thenReturn(Optional.empty());
        mockPjpArgs(invoiceId, itemId);
        when(pjp.proceed()).thenThrow(new RuntimeException("delete error"));

        assertThatThrownBy(() -> auditAspect.auditRemoveItem(pjp))
                .isInstanceOf(RuntimeException.class);

        verify(auditLogRepository, org.mockito.Mockito.never()).save(any());
    }
}
