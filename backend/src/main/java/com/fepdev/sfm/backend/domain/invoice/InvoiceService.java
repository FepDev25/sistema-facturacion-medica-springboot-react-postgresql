package com.fepdev.sfm.backend.domain.invoice;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
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
    private final InvoiceItemRepository invoiceItemRepository;
    private final InvoiceSequenceRepository invoiceSequenceRepository;
    private final InvoiceMapper invoiceMapper;

    public InvoiceService(InvoiceRepository invoiceRepository, InvoiceItemRepository invoiceItemRepository,
            InvoiceSequenceRepository invoiceSequenceRepository, InvoiceMapper invoiceMapper) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceItemRepository = invoiceItemRepository;
        this.invoiceSequenceRepository = invoiceSequenceRepository;
        this.invoiceMapper = invoiceMapper;
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
