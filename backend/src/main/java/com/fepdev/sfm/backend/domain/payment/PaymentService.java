package com.fepdev.sfm.backend.domain.payment;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentCreateRequest;
import com.fepdev.sfm.backend.domain.payment.dto.PaymentResponse;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class PaymentService {

    private static final List<InvoiceStatus> PAYABLE_STATUSES =
            List.of(InvoiceStatus.PENDING, InvoiceStatus.PARTIAL_PAID, InvoiceStatus.OVERDUE);

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final InvoiceRepository invoiceRepository;

    public PaymentService(PaymentRepository paymentRepository, PaymentMapper paymentMapper,
            InvoiceRepository invoiceRepository) {
        this.paymentRepository = paymentRepository;
        this.paymentMapper = paymentMapper;
        this.invoiceRepository = invoiceRepository;
    }

    // registrar pago sobre una factura
    @Transactional
    public PaymentResponse registerPayment(PaymentCreateRequest request) {
        Invoice invoice = invoiceRepository.findById(request.invoiceId())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Factura con ID: " + request.invoiceId() + " no encontrada"));

        // solo se aceptan pagos en estados PENDING, PARTIAL_PAID u OVERDUE
        if (!PAYABLE_STATUSES.contains(invoice.getStatus())) {
            throw new BusinessRuleException(
                    "No se pueden registrar pagos en facturas con estado: " + invoice.getStatus()
                    + ". Estados válidos: PENDING, PARTIAL_PAID, OVERDUE");
        }

        // el pago no puede exceder el saldo pendiente
        BigDecimal totalPaid = paymentRepository.sumAmountByInvoiceId(request.invoiceId());
        BigDecimal pendingBalance = invoice.getTotal().subtract(totalPaid);

        if (request.amount().compareTo(pendingBalance) > 0) {
            throw new BusinessRuleException(
                    "El monto del pago (" + request.amount() + ") excede el saldo pendiente ("
                    + pendingBalance + ") de la factura");
        }

        // crear y guardar el pago
        Payment payment = paymentMapper.toEntity(request);
        payment.setInvoice(invoice);
        paymentRepository.save(payment);

        // actualizar estado de la factura según el total acumulado
        BigDecimal newTotalPaid = totalPaid.add(request.amount());
        if (newTotalPaid.compareTo(invoice.getTotal()) == 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        } else {
            // cubre tanto PENDING → PARTIAL_PAID como OVERDUE → PARTIAL_PAID
            invoice.setStatus(InvoiceStatus.PARTIAL_PAID);
        }
        invoiceRepository.save(invoice);

        return paymentMapper.toResponse(payment);
    }

    // listar pagos de una factura con paginación
    @Transactional(readOnly = true)
    public Page<PaymentResponse> getPaymentsByInvoice(UUID invoiceId, Pageable pageable) {
        if (!invoiceRepository.existsById(invoiceId)) {
            throw new EntityNotFoundException("Factura con ID: " + invoiceId + " no encontrada");
        }
        return paymentRepository.findByInvoiceIdOrderByPaymentDateDesc(invoiceId, pageable)
                .map(paymentMapper::toResponse);
    }
}
