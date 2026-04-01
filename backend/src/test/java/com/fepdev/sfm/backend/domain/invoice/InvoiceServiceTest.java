package com.fepdev.sfm.backend.domain.invoice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.ArgumentMatchers.eq;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalog;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalogRepository;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.insurance.InsuranceProvider;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.domain.payment.PaymentRepository;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceTest {

    @Mock InvoiceRepository invoiceRepository;
    @Mock InvoiceItemRepository invoiceItemRepository;
    @Mock InvoiceSequenceRepository invoiceSequenceRepository;
    @Mock InvoiceMapper invoiceMapper;
    @Mock InvoiceItemMapper invoiceItemMapper;
    @Mock PatientRepository patientRepository;
    @Mock ServicesCatalogRepository servicesCatalogRepository;
    @Mock MedicationsCatalogRepository medicationsCatalogRepository;
    @Mock PrescriptionRepository prescriptionRepository;
    @Mock PaymentRepository paymentRepository;

    @InjectMocks InvoiceService invoiceService;

    @BeforeEach
    void setUp() {
        // @Value no se inyecta en tests unitarios; forzamos el valor por defecto del sistema
        ReflectionTestUtils.setField(invoiceService, "taxRate", new BigDecimal("0.15"));
    }

    private Invoice draftInvoice() {
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setIssueDate(LocalDate.now());
        return invoice;
    }

    // serviceId, medicationId, itemType, description, quantity, unitPrice
    private InvoiceItemRequest serviceItemRequest(UUID serviceId) {
        return new InvoiceItemRequest(serviceId, null, ItemType.SERVICE, "Consulta médica", 1, new BigDecimal("100.00"));
    }

    private InvoiceItemRequest medicationItemRequest(UUID medId) {
        return new InvoiceItemRequest(null, medId, ItemType.MEDICATION, "Amoxicilina", 2, new BigDecimal("15.00"));
    }

    // =========================================================
    // addItem — validaciones de estado y tipo de ítem
    // =========================================================

    @Test
    void addItem_whenInvoiceNotDraft_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, serviceItemRequest(UUID.randomUUID())))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("DRAFT");
    }

    @Test
    void addItem_serviceType_whenServiceIdIsNull_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(draftInvoice()));

        InvoiceItemRequest req = new InvoiceItemRequest(null, null, ItemType.SERVICE, "Sin id", 1, BigDecimal.ONE);
        InvoiceItem item = new InvoiceItem();
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, req))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("serviceId");
    }

    @Test
    void addItem_serviceType_whenServiceNotFound_throwsEntityNotFoundException() {
        UUID invoiceId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(draftInvoice()));
        when(servicesCatalogRepository.findById(serviceId)).thenReturn(Optional.empty());

        InvoiceItemRequest req = serviceItemRequest(serviceId);
        InvoiceItem item = new InvoiceItem();
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, req))
            .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void addItem_whenInvoiceNotFound_throwsEntityNotFoundException() {
        UUID invoiceId = UUID.randomUUID();
        InvoiceItemRequest req = serviceItemRequest(UUID.randomUUID());

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, req))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void addItem_serviceType_whenServiceInactive_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();
        ServicesCatalog inactiveService = new ServicesCatalog();
        inactiveService.setIsActive(false);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(draftInvoice()));
        when(servicesCatalogRepository.findById(serviceId)).thenReturn(Optional.of(inactiveService));

        InvoiceItemRequest req = serviceItemRequest(serviceId);
        InvoiceItem item = new InvoiceItem();
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, req))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("activo");
    }

    @Test
    void addItem_medicationType_whenMedicationIdIsNull_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(draftInvoice()));

        InvoiceItemRequest req = new InvoiceItemRequest(null, null, ItemType.MEDICATION, "Sin id", 1, BigDecimal.ONE);
        InvoiceItem item = new InvoiceItem();
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, req))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("medicationId");
    }

    @Test
    void addItem_medicationType_whenMedicationInactive_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        UUID medId = UUID.randomUUID();
        MedicationsCatalog inactiveMed = new MedicationsCatalog();
        inactiveMed.setActive(false);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(draftInvoice()));
        when(medicationsCatalogRepository.findById(medId)).thenReturn(Optional.of(inactiveMed));

        InvoiceItemRequest req = medicationItemRequest(medId);
        InvoiceItem item = new InvoiceItem();
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, req))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("activo");
    }

    @Test
    void addItem_medicationType_whenRequiresPrescriptionAndNoneExists_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        UUID medId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();

        MedicationsCatalog med = new MedicationsCatalog();
        med.setActive(true);
        med.setRequiresPrescription(true);

        com.fepdev.sfm.backend.domain.appointment.Appointment appointment =
            new com.fepdev.sfm.backend.domain.appointment.Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);

        Invoice invoice = draftInvoice();
        invoice.setAppointment(appointment);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(medicationsCatalogRepository.findById(medId)).thenReturn(Optional.of(med));
        when(prescriptionRepository.existsByAppointmentIdAndMedicationId(appointmentId, medId)).thenReturn(false);

        InvoiceItemRequest req = medicationItemRequest(medId);
        InvoiceItem item = new InvoiceItem();
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, req))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("prescripción");
    }

    @Test
    void addItem_medicationType_whenMedicationRequiresPrescriptionButInvoiceHasNoAppointment_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        UUID medId = UUID.randomUUID();

        MedicationsCatalog med = new MedicationsCatalog();
        med.setActive(true);
        med.setRequiresPrescription(true);

        Invoice invoice = draftInvoice();
        invoice.setAppointment(null);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(medicationsCatalogRepository.findById(medId)).thenReturn(Optional.of(med));
        when(invoiceItemMapper.toEntity(any())).thenReturn(new InvoiceItem());

        assertThatThrownBy(() -> invoiceService.addItem(invoiceId, medicationItemRequest(medId)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no tiene cita asociada");
    }

    @Test
    void addItem_medicationType_whenPrescriptionExists_savesItem() {
        UUID invoiceId = UUID.randomUUID();
        UUID medId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();

        MedicationsCatalog med = new MedicationsCatalog();
        med.setActive(true);
        med.setRequiresPrescription(true);

        com.fepdev.sfm.backend.domain.appointment.Appointment appointment =
                new com.fepdev.sfm.backend.domain.appointment.Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);

        Invoice invoice = draftInvoice();
        invoice.setAppointment(appointment);

        InvoiceItem item = new InvoiceItem();
        InvoiceItemResponse mapped = new InvoiceItemResponse(
                UUID.randomUUID(), invoiceId, null, null, medId, null,
                ItemType.MEDICATION, "Amoxicilina", 2, new BigDecimal("15.00"), new BigDecimal("30.00"), null);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(medicationsCatalogRepository.findById(medId)).thenReturn(Optional.of(med));
        when(prescriptionRepository.existsByAppointmentIdAndMedicationId(appointmentId, medId)).thenReturn(true);
        when(invoiceItemMapper.toEntity(any())).thenReturn(item);
        when(invoiceItemRepository.save(item)).thenReturn(item);
        when(invoiceItemMapper.toResponse(item)).thenReturn(mapped);
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        var response = invoiceService.addItem(invoiceId, medicationItemRequest(medId));

        assertThat(response.itemType()).isEqualTo(ItemType.MEDICATION);
        verify(prescriptionRepository).existsByAppointmentIdAndMedicationId(appointmentId, medId);
    }

    @Test
    void addItem_serviceType_success_calculatesSubtotalAndRecalculatesTotals() {
        UUID invoiceId = UUID.randomUUID();
        UUID serviceId = UUID.randomUUID();

        ServicesCatalog service = new ServicesCatalog();
        service.setIsActive(true);

        InvoiceItemRequest req = new InvoiceItemRequest(
            serviceId, null, ItemType.SERVICE, "Consulta", 2, new BigDecimal("50.00"));
        // subtotal esperado: 2 * 50.00 = 100.00

        InvoiceItem item = new InvoiceItem();
        InvoiceItemResponse itemResponse = new InvoiceItemResponse(
            UUID.randomUUID(), invoiceId, serviceId, null, null, null,
            ItemType.SERVICE, "Consulta", 2, new BigDecimal("50.00"), new BigDecimal("100.00"), null);

        Invoice invoice = draftInvoice();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(servicesCatalogRepository.findById(serviceId)).thenReturn(Optional.of(service));
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);
        when(invoiceItemRepository.save(item)).thenReturn(item);
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);
        when(invoiceItemMapper.toResponse(item)).thenReturn(itemResponse);

        InvoiceItemResponse result = invoiceService.addItem(invoiceId, req);

        assertThat(item.getSubtotal()).isEqualByComparingTo("100.00");
        assertThat(result).isEqualTo(itemResponse);
        verify(invoiceItemRepository).save(item);
        verify(invoiceRepository).save(invoice);
    }

    // =========================================================
    // confirmInvoice
    // =========================================================

    @Test
    void confirmInvoice_whenNotDraft_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.confirmInvoice(invoiceId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("DRAFT");
    }

    @Test
    void confirmInvoice_whenNoItems_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(draftInvoice()));
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of());

        assertThatThrownBy(() -> invoiceService.confirmInvoice(invoiceId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("sin ítems");
    }

    @Test
    void confirmInvoice_success_setsStatusPending() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = draftInvoice();

        InvoiceItem item = new InvoiceItem();
        item.setSubtotal(new BigDecimal("100.00"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        invoiceService.confirmInvoice(invoiceId);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.PENDING);
    }

    @Test
    void confirmInvoice_whenInvoiceNotFound_throwsEntityNotFoundException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.confirmInvoice(invoiceId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // =========================================================
    // cancelInvoice
    // =========================================================

    @Test
    void cancelInvoice_whenPaid_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.cancelInvoice(invoiceId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("DRAFT o PENDING");
    }

    @Test
    void cancelInvoice_whenHasPaymentsApplied_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.existsByInvoiceId(invoiceId)).thenReturn(true);

        assertThatThrownBy(() -> invoiceService.cancelInvoice(invoiceId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("pagos aplicados");
    }

    @Test
    void cancelInvoice_draft_withNoPayments_setsStatusCancelled() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = draftInvoice();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.existsByInvoiceId(invoiceId)).thenReturn(false);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        invoiceService.cancelInvoice(invoiceId);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    void cancelInvoice_pending_withNoPayments_setsStatusCancelled() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(paymentRepository.existsByInvoiceId(invoiceId)).thenReturn(false);
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        invoiceService.cancelInvoice(invoiceId);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
    }

    @Test
    void cancelInvoice_whenInvoiceNotFound_throwsEntityNotFoundException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.cancelInvoice(invoiceId))
                .isInstanceOf(EntityNotFoundException.class);
        verify(paymentRepository, never()).existsByInvoiceId(invoiceId);
    }

    // =========================================================
    // markOverdue
    // =========================================================

    @Test
    void markOverdue_whenDraft_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(draftInvoice()));

        assertThatThrownBy(() -> invoiceService.markOverdue(invoiceId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("PENDING o PARTIAL_PAID");
    }

    @Test
    void markOverdue_whenPending_setsStatusOverdue() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        invoiceService.markOverdue(invoiceId);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.OVERDUE);
    }

    @Test
    void markOverdue_whenPartialPaid_setsStatusOverdue() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PARTIAL_PAID);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        invoiceService.markOverdue(invoiceId);

        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.OVERDUE);
    }

    // =========================================================
    // removeItem
    // =========================================================

    @Test
    void removeItem_whenItemDoesNotBelongToInvoice_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId    = UUID.randomUUID();
        UUID otherId   = UUID.randomUUID();

        Invoice invoiceForItem = new Invoice();
        ReflectionTestUtils.setField(invoiceForItem, "id", otherId);

        InvoiceItem item = new InvoiceItem();
        item.setInvoice(invoiceForItem);

        Invoice targetInvoice = draftInvoice();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(targetInvoice));
        when(invoiceItemRepository.findById(itemId)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> invoiceService.removeItem(invoiceId, itemId))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no pertenece");
    }

    @Test
    void removeItem_whenInvoiceNotDraft_throwsBusinessRuleException() {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setStatus(InvoiceStatus.PENDING);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

        assertThatThrownBy(() -> invoiceService.removeItem(invoiceId, itemId))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void removeItem_success_deletesAndRecalculates() {
        UUID invoiceId = UUID.randomUUID();
        UUID itemId = UUID.randomUUID();
        Invoice invoice = draftInvoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);
        InvoiceItem item = new InvoiceItem();
        item.setInvoice(invoice);
        item.setSubtotal(new BigDecimal("100.00"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findById(itemId)).thenReturn(Optional.of(item));
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of());
        when(invoiceRepository.save(invoice)).thenReturn(invoice);

        invoiceService.removeItem(invoiceId, itemId);

        verify(invoiceItemRepository).delete(item);
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void getInvoicesWithFilters_whenPatientNotFound_throwsEntityNotFoundException() {
        UUID patientId = UUID.randomUUID();
        when(patientRepository.existsById(patientId)).thenReturn(false);

        assertThatThrownBy(() -> invoiceService.getInvoicesWithFilters(patientId, null, null, null,
                org.springframework.data.domain.Pageable.unpaged()))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getInvoicesWithFilters_whenPatientExists_returnsMappedPage() {
        UUID patientId = UUID.randomUUID();
        Invoice invoice = draftInvoice();
        ReflectionTestUtils.setField(invoice, "id", UUID.randomUUID());
        var pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        var mapped = new com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse(
                UUID.randomUUID(), patientId, "Ana", "Lopez", null, null, "FAC-2026-09999",
                new BigDecimal("100.00"), new BigDecimal("15.00"), new BigDecimal("115.00"),
                BigDecimal.ZERO, new BigDecimal("115.00"), InvoiceStatus.PENDING,
                LocalDate.now(), LocalDate.now().plusDays(30), null, List.of(), null, null);

        when(patientRepository.existsById(patientId)).thenReturn(true);
        when(invoiceRepository.findWithFilters(eq(patientId), eq(null), eq(null), eq(null), eq(pageable)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(invoice), pageable, 1));
        when(invoiceMapper.toResponse(invoice)).thenReturn(mapped);

        var result = invoiceService.getInvoicesWithFilters(patientId, null, null, null, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().getFirst().invoiceNumber()).isEqualTo("FAC-2026-09999");
    }

    @Test
    void getInvoiceById_whenFound_returnsFullResponseWithItems() {
        UUID invoiceId = UUID.randomUUID();
        UUID patientId = UUID.randomUUID();

        Invoice invoice = draftInvoice();
        ReflectionTestUtils.setField(invoice, "id", invoiceId);

        var base = new com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse(
                invoiceId, patientId, "Ana", "Lopez", null, null, "FAC-2026-01001",
                new BigDecimal("100.00"), new BigDecimal("15.00"), new BigDecimal("115.00"),
                BigDecimal.ZERO, new BigDecimal("115.00"), InvoiceStatus.PENDING,
                LocalDate.now(), LocalDate.now().plusDays(30), null, List.of(), null, null);
        var item = new com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse(
                UUID.randomUUID(), invoiceId, null, null, null, null,
                ItemType.OTHER, "Insumo", 1, new BigDecimal("10.00"), new BigDecimal("10.00"), null);

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceMapper.toResponse(invoice)).thenReturn(base);
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(new InvoiceItem()));
        when(invoiceItemMapper.toResponseList(any())).thenReturn(List.of(item));

        var result = invoiceService.getInvoiceById(invoiceId);

        assertThat(result.invoiceNumber()).isEqualTo("FAC-2026-01001");
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().getFirst().itemType()).isEqualTo(ItemType.OTHER);
    }

    @Test
    void getInvoiceByNumber_whenNotFound_throwsEntityNotFoundException() {
        when(invoiceRepository.findByInvoiceNumber("FAC-404")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> invoiceService.getInvoiceByNumber("FAC-404"))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void addItem_withOtherType_skipsCatalogLookupsAndPersists() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = draftInvoice();
        InvoiceItemRequest req = new InvoiceItemRequest(
                null, null, ItemType.OTHER, "Material", 2, new BigDecimal("5.00"));
        InvoiceItem item = new InvoiceItem();

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceItemMapper.toEntity(req)).thenReturn(item);
        when(invoiceItemRepository.save(item)).thenReturn(item);
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        when(invoiceItemMapper.toResponse(item)).thenReturn(new InvoiceItemResponse(
                UUID.randomUUID(), invoiceId, null, null, null, null,
                ItemType.OTHER, "Material", 2, new BigDecimal("5.00"), new BigDecimal("10.00"), null));

        var result = invoiceService.addItem(invoiceId, req);

        assertThat(result.itemType()).isEqualTo(ItemType.OTHER);
        verify(servicesCatalogRepository, never()).findById(any());
        verify(medicationsCatalogRepository, never()).findById(any());
    }

    @Test
    void privateHelpers_validateAmountsAndToMoney_coverBranches() {
        Invoice invalid = new Invoice();
        invalid.setInsuranceCoverage(new BigDecimal("50.00"));
        invalid.setPatientResponsibility(new BigDecimal("20.00"));
        invalid.setTotal(new BigDecimal("100.00"));

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(invoiceService, "validateAmounts", invalid))
                .isInstanceOf(BusinessRuleException.class);

        BigDecimal zeroFromNull = ReflectionTestUtils.invokeMethod(invoiceService, "toMoney", (Object) null);
        assertThat(zeroFromNull).isEqualByComparingTo("0.00");
    }

    @Test
    void recalculateTotals_whenIssueDateNullAndPolicyValuesNull_handlesDefaults() {
        UUID invoiceId = UUID.randomUUID();

        InsuranceProvider provider = new InsuranceProvider();
        provider.setActive(true);

        InsurancePolicy policy = new InsurancePolicy();
        policy.setActive(true);
        policy.setProvider(provider);
        policy.setStartDate(LocalDate.now().minusDays(1));
        policy.setEndDate(LocalDate.now().plusDays(1));
        policy.setCoveragePercentage(null);
        policy.setDeductible(null);

        Invoice invoice = new Invoice();
        invoice.setInsurancePolicy(policy);
        invoice.setIssueDate(null);

        InvoiceItem item = new InvoiceItem();
        item.setSubtotal(new BigDecimal("100.00"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        invoiceService.recalculateTotals(invoiceId);

        assertThat(invoice.getInsuranceCoverage()).isEqualByComparingTo("0.00");
        assertThat(invoice.getPatientResponsibility()).isEqualByComparingTo(invoice.getTotal());
        verify(invoiceRepository, times(1)).save(invoice);
    }

    // =========================================================
    // recalculateTotals — lógica de montos (método package-private)
    // =========================================================

    @Test
    void recalculateTotals_withoutPolicy_patientPaysAllAndTaxIsApplied() {
        UUID invoiceId = UUID.randomUUID();
        Invoice invoice = new Invoice();
        invoice.setIssueDate(LocalDate.now());
        // sin póliza: insurancePolicy == null

        InvoiceItem item1 = new InvoiceItem();
        item1.setSubtotal(new BigDecimal("100.00"));
        InvoiceItem item2 = new InvoiceItem();
        item2.setSubtotal(new BigDecimal("50.00"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item1, item2));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        // subtotal=150, tax=150*0.15=22.50, total=172.50
        invoiceService.recalculateTotals(invoiceId);

        assertThat(invoice.getSubtotal()).isEqualByComparingTo("150.00");
        assertThat(invoice.getTax()).isEqualByComparingTo("22.50");
        assertThat(invoice.getTotal()).isEqualByComparingTo("172.50");
        assertThat(invoice.getInsuranceCoverage()).isEqualByComparingTo("0.00");
        assertThat(invoice.getPatientResponsibility()).isEqualByComparingTo("172.50");
    }

    @Test
    void recalculateTotals_withActivePolicy_distributesCoverageAndPatientResponsibility() {
        UUID invoiceId = UUID.randomUUID();

        InsuranceProvider provider = new InsuranceProvider();
        provider.setActive(true);

        InsurancePolicy policy = new InsurancePolicy();
        policy.setActive(true);
        policy.setProvider(provider);
        policy.setStartDate(LocalDate.now().minusDays(30));
        policy.setEndDate(LocalDate.now().plusDays(335));
        policy.setCoveragePercentage(new BigDecimal("50.00"));
        policy.setDeductible(BigDecimal.ZERO);

        Invoice invoice = new Invoice();
        invoice.setIssueDate(LocalDate.now());
        invoice.setInsurancePolicy(policy);

        InvoiceItem item = new InvoiceItem();
        item.setSubtotal(new BigDecimal("200.00"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        // subtotal=200, tax=30, total=230
        // coverage=230*0.50-0=115, responsibility=115
        invoiceService.recalculateTotals(invoiceId);

        assertThat(invoice.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(invoice.getTax()).isEqualByComparingTo("30.00");
        assertThat(invoice.getTotal()).isEqualByComparingTo("230.00");
        assertThat(invoice.getInsuranceCoverage()).isEqualByComparingTo("115.00");
        assertThat(invoice.getPatientResponsibility()).isEqualByComparingTo("115.00");
    }

    @Test
    void recalculateTotals_withExpiredPolicy_treatsAsNoPolicyAndPatientPaysAll() {
        UUID invoiceId = UUID.randomUUID();

        InsuranceProvider provider = new InsuranceProvider();
        provider.setActive(true);

        InsurancePolicy expiredPolicy = new InsurancePolicy();
        expiredPolicy.setActive(true);
        expiredPolicy.setProvider(provider);
        expiredPolicy.setStartDate(LocalDate.now().minusYears(2));
        expiredPolicy.setEndDate(LocalDate.now().minusDays(1)); // ya expiró
        expiredPolicy.setCoveragePercentage(new BigDecimal("80.00"));
        expiredPolicy.setDeductible(BigDecimal.ZERO);

        Invoice invoice = new Invoice();
        invoice.setIssueDate(LocalDate.now());
        invoice.setInsurancePolicy(expiredPolicy);

        InvoiceItem item = new InvoiceItem();
        item.setSubtotal(new BigDecimal("100.00"));

        when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
        when(invoiceItemRepository.findByInvoiceId(invoiceId)).thenReturn(List.of(item));
        when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

        invoiceService.recalculateTotals(invoiceId);

        // póliza expirada: sin cobertura, paciente paga todo
        assertThat(invoice.getInsuranceCoverage()).isEqualByComparingTo("0.00");
        assertThat(invoice.getPatientResponsibility()).isEqualByComparingTo(invoice.getTotal());
    }
}
