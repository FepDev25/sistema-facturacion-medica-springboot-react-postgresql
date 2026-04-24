package com.fepdev.sfm.backend.ai.suggestion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fepdev.sfm.backend.domain.invoice.Invoice;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;

import jakarta.persistence.EntityNotFoundException;

@ExtendWith(MockitoExtension.class)
class ItemSuggestionServiceTest {

    @Mock org.springframework.ai.chat.client.ChatClient chatClient;
    @Mock InvoiceRepository invoiceRepo;
    @Mock com.fepdev.sfm.backend.domain.medicalrecord.MedicalRecordRepository medicalRecordRepo;
    @Mock com.fepdev.sfm.backend.domain.medicalrecord.DiagnosisRepository diagnosisRepo;
    @Mock com.fepdev.sfm.backend.domain.medicalrecord.PrescriptionRepository prescriptionRepo;
    @Mock com.fepdev.sfm.backend.domain.medicalrecord.ProcedureRepository procedureRepo;
    @Mock com.fepdev.sfm.backend.domain.catalog.ServicesCatalogRepository servicesRepo;
    @Mock com.fepdev.sfm.backend.domain.catalog.MedicationsCatalogRepository medicationsRepo;

    @InjectMocks
    ItemSuggestionService service;

    @Test
    void suggestItems_whenInvoiceNotFound_throwsEntityNotFoundException() {
        UUID invoiceId = UUID.randomUUID();
        when(invoiceRepo.findById(invoiceId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.suggestItems(invoiceId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Factura no encontrada");
    }
}
