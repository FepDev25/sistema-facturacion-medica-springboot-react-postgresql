package com.fepdev.sfm.backend.domain.invoice;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalog;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalogRepository;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse;
import com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.domain.payment.PaymentRepository;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class InvoiceService {

    @Value("${billing.tax.rate:0.15}")
    private BigDecimal taxRate;

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    private static final BigDecimal VALIDATION_TOLERANCE = new BigDecimal("0.01");
    private static final int DUE_DATE_DAYS = 30;

    private final InvoiceRepository invoiceRepository;
    private final InvoiceMapper invoiceMapper;

    private final InvoiceItemMapper invoiceItemMapper;
    private final InvoiceItemRepository invoiceItemRepository;

    private final InvoiceSequenceRepository invoiceSequenceRepository;
    
    private final PatientRepository patientRepository;

    private final ServicesCatalogRepository servicesCatalogRepository;
    private final MedicationsCatalogRepository medicationsCatalogRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PaymentRepository paymentRepository;

    public InvoiceService(InvoiceRepository invoiceRepository, InvoiceItemRepository invoiceItemRepository,
            InvoiceSequenceRepository invoiceSequenceRepository, InvoiceMapper invoiceMapper, InvoiceItemMapper invoiceItemMapper,
            PatientRepository patientRepository, ServicesCatalogRepository servicesCatalogRepository,
            MedicationsCatalogRepository medicationsCatalogRepository, PrescriptionRepository prescriptionRepository,
            PaymentRepository paymentRepository) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.invoiceSequenceRepository = invoiceSequenceRepository;
        this.invoiceMapper = invoiceMapper;
        this.invoiceItemMapper = invoiceItemMapper;
        this.patientRepository = patientRepository;
        this.servicesCatalogRepository = servicesCatalogRepository;
        this.medicationsCatalogRepository = medicationsCatalogRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.paymentRepository = paymentRepository;
    }

    // crear factura draft al completar una cita
    @Transactional
    public Invoice createDraftInvoice(Appointment appointment) {
        String invoiceNumber = generateInvoiceNumber(LocalDate.now().getYear());

        Invoice invoice = new Invoice();
        invoice.setAppointment(appointment);
        invoice.setPatient(appointment.getPatient());
        invoice.setInvoiceNumber(invoiceNumber);
        invoice.setStatus(InvoiceStatus.DRAFT);
        invoice.setIssueDate(LocalDate.now());
        invoice.setDueDate(LocalDate.now().plusDays(DUE_DATE_DAYS));

        // Montos en cero: la factura se crea vacía, los ítems se agregan en 10.4
        invoice.setSubtotal(ZERO);
        invoice.setTax(ZERO);
        invoice.setTotal(ZERO);
        invoice.setInsuranceCoverage(ZERO);
        invoice.setPatientResponsibility(ZERO);

        return invoiceRepository.save(invoice);
    }

    // consulta de factura por ID
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada"));
        return buildFullResponse(invoice);
    }

    // consulta de factura por número
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByNumber(String invoiceNumber) {
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new EntityNotFoundException("Factura con número: " + invoiceNumber + " no encontrada"));
        return buildFullResponse(invoice);
    }

    // consulta de facturas con filtros
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> getInvoicesWithFilters(UUID patientId, InvoiceStatus status,
            LocalDate startDate, LocalDate endDate, Pageable pageable) {
        if (patientId != null && !patientRepository.existsById(patientId)) {
            throw new EntityNotFoundException("Paciente con ID: " + patientId + " no encontrado");
        }
        Page<Invoice> invoices = invoiceRepository.findWithFilters(patientId, status, startDate, endDate, pageable);
        return invoices.map(invoiceMapper::toResponse);
    }

    // *** metodos de items ***

    // metodo para agregar ítem a factura DRAFT, con validaciones específicas según el tipo de ítem (servicio o medicamento)
    @Transactional
    public InvoiceItemResponse addItem(UUID invoiceId, InvoiceItemRequest request) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada"));

        // solo se pueden agregar ítems a facturas en estado DRAFT
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BusinessRuleException(
                "Solo se pueden agregar ítems a facturas en estado DRAFT. Estado actual: " + invoice.getStatus());
        }

        InvoiceItem item = invoiceItemMapper.toEntity(request);
        item.setInvoice(invoice);

        switch (request.itemType()) {
            case SERVICE -> {
                if (request.serviceId() == null) {
                    throw new BusinessRuleException("Se requiere serviceId para ítems de tipo SERVICE");
                }
                ServicesCatalog service = servicesCatalogRepository.findById(request.serviceId())
                        .orElseThrow(() -> new EntityNotFoundException(
                                "Servicio con ID: " + request.serviceId() + " no encontrado"));
                // el servicio debe estar activo
                if (!Boolean.TRUE.equals(service.getIsActive())) {
                    throw new BusinessRuleException("El servicio con ID: " + request.serviceId() + " no está activo");
                }
                item.setService(service);
            }
            case MEDICATION -> {
                if (request.medicationId() == null) {
                    throw new BusinessRuleException("Se requiere medicationId para ítems de tipo MEDICATION");
                }
                MedicationsCatalog medication = medicationsCatalogRepository.findById(request.medicationId())
                        .orElseThrow(() -> new EntityNotFoundException(
                                "Medicamento con ID: " + request.medicationId() + " no encontrado"));
                // el medicamento debe estar activo
                if (!medication.isActive()) {
                    throw new BusinessRuleException(
                            "El medicamento con ID: " + request.medicationId() + " no está activo");
                }
                // si requiere prescripción, debe existir una en la cita asociada
                if (medication.isRequiresPrescription()) {
                    if (invoice.getAppointment() == null) {
                        throw new BusinessRuleException(
                                "El medicamento requiere prescripción pero la factura no tiene cita asociada");
                    }
                    boolean hasPrescription = prescriptionRepository.existsByAppointmentIdAndMedicationId(
                            invoice.getAppointment().getId(), request.medicationId());
                    if (!hasPrescription) {
                        throw new BusinessRuleException(
                                "El medicamento requiere prescripción pero no existe una prescripción válida en la cita");
                    }
                }
                item.setMedication(medication);
            }
            default -> {
                // PROCEDURE y OTHER no requieren referencia a catálogo
            }
        }
        // subtotal calculado en el servidor: quantity * unitPrice (RN del roadmap)
        item.setSubtotal(toMoney(request.unitPrice().multiply(BigDecimal.valueOf(request.quantity()))));

        InvoiceItem savedItem = invoiceItemRepository.save(item);

        // recalcular totales de la factura con el nuevo ítem incluido
        recalculateTotals(invoiceId);

        return invoiceItemMapper.toResponse(savedItem);
    }

    // metodo para eliminar ítem de factura DRAFT, con validaciones para asegurar que el ítem pertenece a la factura y que la factura está en estado DRAFT
    @Transactional
    public void removeItem(UUID invoiceId, UUID itemId) {

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada"));

        // solo se pueden eliminar ítems de facturas en estado DRAFT
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BusinessRuleException(
                "Solo se pueden eliminar ítems de facturas en estado DRAFT. Estado actual: " + invoice.getStatus());
        }

        // validar que el ítem existe y pertenece a la factura
        InvoiceItem item = invoiceItemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Ítem con ID: " + itemId + " no encontrado"));

        if (!item.getInvoice().getId().equals(invoiceId)) {
            throw new BusinessRuleException("El ítem no pertenece a la factura especificada");
        }

        invoiceItemRepository.delete(item);

        // recalcular totales de la factura con el ítem eliminado
        recalculateTotals(invoiceId);
    }

    // *** metodos de estado de factura ***

    // metodo para confirmar factura, que cambia su estado a PENDING, con validaciones para asegurar que la factura está 
    // en estado DRAFT y que tiene al menos un ítem antes de confirmar.
    // También recalcula los totales antes de confirmar para asegurar que estén correctos.
    @Transactional
    public void confirmInvoice(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada"));

        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new BusinessRuleException(
                "Solo se pueden confirmar facturas en estado DRAFT. Estado actual: " + invoice.getStatus());
        }

        // Validar que la factura tenga al menos un ítem antes de confirmar
        List<InvoiceItem> items = invoiceItemRepository.findByInvoiceId(invoiceId);
        if (items.isEmpty()) {
            throw new BusinessRuleException("No se puede confirmar una factura sin ítems");
        }

        // Recalcular totales para asegurar que estén correctos antes de confirmar
        recalculateTotals(invoiceId);

        invoice.setStatus(InvoiceStatus.PENDING);
        invoiceRepository.save(invoice);
    }

    // OVERDUE solo desde PENDING o PARTIAL_PAID
    @Transactional
    public void markOverdue(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada"));

        if (invoice.getStatus() != InvoiceStatus.PENDING && invoice.getStatus() != InvoiceStatus.PARTIAL_PAID) {
            throw new BusinessRuleException(
                    "Solo se puede marcar como vencida una factura en estado PENDING o PARTIAL_PAID. Estado actual: "
                            + invoice.getStatus());
        }
        invoice.setStatus(InvoiceStatus.OVERDUE);
        invoiceRepository.save(invoice);
    }

    // CANCELLED solo desde DRAFT o PENDING, y solo si no tiene pagos aplicados
    @Transactional
    public void cancelInvoice(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada"));

        if (invoice.getStatus() != InvoiceStatus.DRAFT && invoice.getStatus() != InvoiceStatus.PENDING) {
            throw new BusinessRuleException(
                    "Solo se puede cancelar una factura en estado DRAFT o PENDING. Estado actual: "
                            + invoice.getStatus());
        }

        // RN-14: no se puede cancelar si ya tiene pagos registrados
        if (paymentRepository.existsByInvoiceId(invoiceId)) {
            throw new BusinessRuleException(
                    "No se puede cancelar la factura porque tiene pagos aplicados (RN-14)");
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoiceRepository.save(invoice);
    }


    // *** metodos internos  ***

    // Invoice no tiene bidireccional con items, por lo que el mapper los ignora.
    // Este helper carga los items desde el repositorio e inyecta la lista en el response.
    private InvoiceResponse buildFullResponse(Invoice invoice) {
        InvoiceResponse base = invoiceMapper.toResponse(invoice);
        List<InvoiceItemResponse> items = invoiceItemMapper.toResponseList(
                invoiceItemRepository.findByInvoiceId(invoice.getId()));
        return new InvoiceResponse(
                base.id(), base.patientId(), base.patientFirstName(), base.patientLastName(),
                base.appointmentId(), base.insurancePolicyId(), base.invoiceNumber(),
                base.subtotal(), base.tax(), base.total(),
                base.insuranceCoverage(), base.patientResponsibility(),
                base.status(), base.issueDate(), base.dueDate(), base.notes(),
                items, base.createdAt(), base.updatedAt());
    }

    // Recalcular montos de la factura
    // Método interno llamado por addItem y removeItem (10.4) cada vez que cambian los ítems.
    @Transactional
    void recalculateTotals(UUID invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada"));

        List<InvoiceItem> items = invoiceItemRepository.findByInvoiceId(invoiceId);

        // subtotal = suma de los subtotales de los ítems (ya calculados al agregar)
        BigDecimal subtotal = items.stream()
                .map(InvoiceItem::getSubtotal)
                .map(this::toMoney)
                .reduce(ZERO, BigDecimal::add);

        BigDecimal tax = toMoney(subtotal.multiply(taxRate));
        BigDecimal total = toMoney(subtotal.add(tax));

        // La póliza debe estar explícitamente vinculada a la factura.
        // Si es null, sin cobertura. El cliente la vincula antes de confirmar.
        InsurancePolicy policy = invoice.getInsurancePolicy();
        LocalDate referenceDate = invoice.getIssueDate() != null ? invoice.getIssueDate() : LocalDate.now();

        BigDecimal insuranceCoverage;
        BigDecimal patientResponsibility;

        if (isPolicyActiveAndValid(policy, referenceDate)) {
            BigDecimal coveragePercentage = policy.getCoveragePercentage() != null
                    ? policy.getCoveragePercentage()
                    : BigDecimal.ZERO;
            BigDecimal deductible = policy.getDeductible() != null
                    ? policy.getDeductible()
                    : BigDecimal.ZERO;

            // cobertura bruta = total * (coveragePercentage / 100) - deductible, mínimo 0
            BigDecimal grossCoverage = total.multiply(
                    coveragePercentage.divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP));
            insuranceCoverage = toMoney(grossCoverage.subtract(deductible));

            if (insuranceCoverage.compareTo(ZERO) < 0) insuranceCoverage = ZERO;
            if (insuranceCoverage.compareTo(total) > 0) insuranceCoverage = total;

            patientResponsibility = toMoney(total.subtract(insuranceCoverage));
        } else {
            // sin póliza válida: el paciente paga todo
            insuranceCoverage = ZERO;
            patientResponsibility = total;
        }

        invoice.setSubtotal(subtotal);
        invoice.setTax(tax);
        invoice.setTotal(total);
        invoice.setInsuranceCoverage(insuranceCoverage);
        invoice.setPatientResponsibility(patientResponsibility);

        validateAmounts(invoice);
        invoiceRepository.save(invoice);
    }

    // Generacion del numero de factura con bloqueo pesimista
    //   1. La transaccion lee la fila de invoice_sequences para el año actual.
    //   2. El lock PESSIMISTIC_WRITE hace que la BD bloquee esa fila.
    //   3. Cualquier otra transaccion que intente el mismo SELECT FOR UPDATE queda BLOQUEADA hasta que esta transaccion haga commit.
    //   4. Solo entonces la segunda transaccion puede leer el valor actualizado e incrementarlo, garantizando secuencialidad sin gaps.

    // Caso primer uso del año (fila no existe):
    //   No hay fila que bloquear, por lo que se inserta con saveAndFlush.
    //   saveAndFlush fuerza el INSERT inmediatamente (no espera al flush del contexto),
    //   por lo que si dos transacciones corren en paralelo en el cambio de año,
    //   la segunda recibirá una excepción de PK duplicada.
    private String generateInvoiceNumber(int year) {
        InvoiceSequence seq = invoiceSequenceRepository.findByYearForUpdate(year)
                .orElseGet(() -> {
                    InvoiceSequence newSeq = new InvoiceSequence();
                    newSeq.setYear(year);
                    newSeq.setLastSequence(0);
                    // saveAndFlush: INSERT inmediato dentro de la transaccion actual
                    return invoiceSequenceRepository.saveAndFlush(newSeq);
                });

        seq.setLastSequence(seq.getLastSequence() + 1);
        // Hibernate detecta el cambio en el objeto gestionado y emite un UPDATE

        return String.format("FAC-%d-%05d", year, seq.getLastSequence());
    }

    // Verifica que la póliza y su proveedor estén activos, y que la fecha de referencia esté dentro del período de cobertura.
    private boolean isPolicyActiveAndValid(InsurancePolicy policy, LocalDate referenceDate) {
        if (policy == null || !policy.isActive()) return false;
        if (policy.getProvider() == null || !policy.getProvider().isActive()) return false;

        LocalDate startDate = policy.getStartDate();
        LocalDate endDate = policy.getEndDate();
        if (startDate == null || endDate == null) return false;

        return !referenceDate.isBefore(startDate) && !referenceDate.isAfter(endDate);
    }

    // Validación para asegurar que insuranceCoverage + patientResponsibility == total (dentro de una tolerancia)
    private void validateAmounts(Invoice invoice) {
        BigDecimal sum = invoice.getInsuranceCoverage().add(invoice.getPatientResponsibility());
        BigDecimal difference = invoice.getTotal().subtract(sum).abs();

        if (difference.compareTo(VALIDATION_TOLERANCE) > 0) {
            throw new BusinessRuleException(
                    "Montos inválidos: coverage + responsibility != total. Diferencia: " + difference);
        }
    }

    // Convierte un BigDecimal a formato monetario con 2 decimales. Si es null, devuelve 0.00
    private BigDecimal toMoney(BigDecimal amount) {
        if (amount == null) return ZERO;
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
