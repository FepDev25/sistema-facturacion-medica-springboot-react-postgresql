package com.fepdev.sfm.backend.domain.dashboard;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.dashboard.dto.DashboardMetricsResponse;
import com.fepdev.sfm.backend.domain.doctor.DoctorRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.domain.payment.PaymentRepository;

@Service
public class DashboardService {

    // Estados que ocupan agenda: las canceladas y no-show no cuentan como citas del día.
    private static final List<Status> AGENDA_STATUSES =
            List.of(Status.SCHEDULED, Status.CONFIRMED, Status.IN_PROGRESS);
    private static final List<Status> UPCOMING_STATUSES =
            List.of(Status.SCHEDULED, Status.CONFIRMED);
    private static final List<InvoiceStatus> PENDING_STATUSES =
            List.of(InvoiceStatus.PENDING, InvoiceStatus.PARTIAL_PAID);
    private static final List<InvoiceStatus> OVERDUE_STATUSES =
            List.of(InvoiceStatus.OVERDUE);

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final Clock clock;

    public DashboardService(PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository,
            InvoiceRepository invoiceRepository,
            PaymentRepository paymentRepository,
            Clock clock) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardMetricsResponse getMetrics() {
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        OffsetDateTime startOfDay = today.atStartOfDay(zone).toOffsetDateTime();
        OffsetDateTime startOfTomorrow = today.plusDays(1).atStartOfDay(zone).toOffsetDateTime();

        return new DashboardMetricsResponse(
                patientRepository.count(),
                doctorRepository.countByIsActiveTrue(),
                appointmentRepository.countByStatusInAndScheduledAtBetween(
                        AGENDA_STATUSES, startOfDay, startOfTomorrow),
                appointmentRepository.countUpcomingByStatusIn(
                        UPCOMING_STATUSES, OffsetDateTime.now(clock)),
                invoiceRepository.countByStatusIn(PENDING_STATUSES),
                invoiceRepository.countByStatusIn(OVERDUE_STATUSES),
                money(paymentRepository.sumAllAmounts()),
                money(invoiceRepository.sumPendingCollection()));
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
