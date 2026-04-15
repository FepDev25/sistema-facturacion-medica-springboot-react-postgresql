package com.fepdev.sfm.backend.domain.invoice;

import java.net.URI;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceItemResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceInsurancePolicyRequest;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceListViewResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceViewResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    // Consultas

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @GetMapping("/number/{invoiceNumber}")
    public ResponseEntity<InvoiceResponse> getByNumber(@PathVariable String invoiceNumber) {
        return ResponseEntity.ok(invoiceService.getInvoiceByNumber(invoiceNumber));
    }

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<InvoiceResponse> getByAppointmentId(@PathVariable UUID appointmentId) {
        return ResponseEntity.ok(invoiceService.getInvoiceByAppointmentId(appointmentId));
    }

    @GetMapping
    public ResponseEntity<Page<InvoiceResponse>> list(
            @RequestParam(required = false) UUID patientId,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @PageableDefault(size = 20, sort = "issueDate", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(
                invoiceService.getInvoicesWithFilters(patientId, status, startDate, endDate, pageable));
    }

    @GetMapping("/view")
    public ResponseEntity<Page<InvoiceListViewResponse>> listView(
            @RequestParam(required = false) UUID patientId,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @PageableDefault(size = 20, sort = "issueDate", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(
                invoiceService.getInvoiceListViewWithFilters(patientId, status, startDate, endDate, pageable));
    }

    @GetMapping("/{id}/view")
    public ResponseEntity<InvoiceViewResponse> getViewById(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getInvoiceViewById(id));
    }

    // Items (solo en estado DRAFT) 

    @PostMapping("/{id}/items")
    public ResponseEntity<InvoiceItemResponse> addItem(
            @PathVariable UUID id,
            @Valid @RequestBody InvoiceItemRequest request,
            UriComponentsBuilder uriBuilder) {

        InvoiceItemResponse response = invoiceService.addItem(id, request);
        URI location = uriBuilder.path("/api/v1/invoices/{invoiceId}/items/{itemId}")
                .buildAndExpand(id, response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @DeleteMapping("/{invoiceId}/items/{itemId}")
    public ResponseEntity<Void> removeItem(
            @PathVariable UUID invoiceId,
            @PathVariable UUID itemId) {

        invoiceService.removeItem(invoiceId, itemId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/insurance-policy")
    public ResponseEntity<InvoiceResponse> assignInsurancePolicy(
            @PathVariable UUID id,
            @RequestBody InvoiceInsurancePolicyRequest request) {

        invoiceService.assignInsurancePolicy(id, request.insurancePolicyId());
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    // Máquina de estados 

    @PatchMapping("/{id}/confirm")
    public ResponseEntity<InvoiceResponse> confirm(@PathVariable UUID id) {
        invoiceService.confirmInvoice(id);
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @PatchMapping("/{id}/overdue")
    public ResponseEntity<InvoiceResponse> markOverdue(@PathVariable UUID id) {
        invoiceService.markOverdue(id);
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<InvoiceResponse> cancel(@PathVariable UUID id) {
        invoiceService.cancelInvoice(id);
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }
}
