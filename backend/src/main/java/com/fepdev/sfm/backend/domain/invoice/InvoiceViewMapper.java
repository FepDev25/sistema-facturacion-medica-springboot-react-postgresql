package com.fepdev.sfm.backend.domain.invoice;

import java.util.List;

import org.springframework.stereotype.Component;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.catalog.ServicesCatalog;
import com.fepdev.sfm.backend.domain.insurance.InsurancePolicy;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceListViewResponse;
import com.fepdev.sfm.backend.domain.invoice.dto.InvoiceViewResponse;
import com.fepdev.sfm.backend.domain.patient.Patient;

@Component
public class InvoiceViewMapper {

    public InvoiceListViewResponse toListView(Invoice invoice) {
        Patient patient = invoice.getPatient();

        return new InvoiceListViewResponse(
                invoice.getId(),
                patient.getId(),
                patient.getFirstName(),
                patient.getLastName(),
                invoice.getInvoiceNumber(),
                invoice.getTotal(),
                invoice.getPatientResponsibility(),
                invoice.getStatus(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getCreatedAt());
    }

    public InvoiceViewResponse toView(Invoice invoice, List<InvoiceItem> items) {
        return new InvoiceViewResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                mapPatient(invoice.getPatient()),
                mapAppointment(invoice.getAppointment()),
                mapPolicy(invoice.getInsurancePolicy()),
                invoice.getSubtotal(),
                invoice.getTax(),
                invoice.getTotal(),
                invoice.getInsuranceCoverage(),
                invoice.getPatientResponsibility(),
                invoice.getStatus(),
                invoice.getIssueDate(),
                invoice.getDueDate(),
                invoice.getNotes(),
                items.stream().map(this::mapItem).toList(),
                invoice.getCreatedAt(),
                invoice.getUpdatedAt());
    }

    private InvoiceViewResponse.PatientView mapPatient(Patient patient) {
        return new InvoiceViewResponse.PatientView(
                patient.getId(),
                patient.getDni(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getAllergies());
    }

    private InvoiceViewResponse.AppointmentView mapAppointment(Appointment appointment) {
        if (appointment == null) {
            return null;
        }

        return new InvoiceViewResponse.AppointmentView(
                appointment.getId(),
                appointment.getScheduledAt(),
                appointment.getStatus(),
                appointment.getChiefComplaint());
    }

    private InvoiceViewResponse.InsurancePolicyView mapPolicy(InsurancePolicy policy) {
        if (policy == null) {
            return null;
        }

        return new InvoiceViewResponse.InsurancePolicyView(
                policy.getId(),
                policy.getPolicyNumber(),
                policy.getProvider().getName(),
                policy.getCoveragePercentage());
    }

    private InvoiceViewResponse.InvoiceItemView mapItem(InvoiceItem item) {
        return new InvoiceViewResponse.InvoiceItemView(
                item.getId(),
                mapService(item.getService()),
                mapMedication(item.getMedication()),
                item.getItemType(),
                item.getDescription(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getSubtotal(),
                item.getCreatedAt());
    }

    private InvoiceViewResponse.ServiceView mapService(ServicesCatalog service) {
        if (service == null) {
            return null;
        }

        return new InvoiceViewResponse.ServiceView(
                service.getId(),
                service.getCode(),
                service.getName(),
                service.getPrice());
    }

    private InvoiceViewResponse.MedicationView mapMedication(MedicationsCatalog medication) {
        if (medication == null) {
            return null;
        }

        return new InvoiceViewResponse.MedicationView(
                medication.getId(),
                medication.getCode(),
                medication.getName(),
                medication.isRequiresPrescription());
    }
}
