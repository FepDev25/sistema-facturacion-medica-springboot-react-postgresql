package com.fepdev.sfm.backend.domain.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fepdev.sfm.backend.domain.appointment.AppointmentRepository;
import com.fepdev.sfm.backend.domain.appointment.Status;
import com.fepdev.sfm.backend.domain.doctor.DoctorRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceRepository;
import com.fepdev.sfm.backend.domain.invoice.InvoiceStatus;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.domain.payment.PaymentRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    private static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-11-08T15:30:00Z"), ZONE);

    @Mock
    PatientRepository patientRepository;

    @Mock
    DoctorRepository doctorRepository;

    @Mock
    AppointmentRepository appointmentRepository;

    @Mock
    InvoiceRepository invoiceRepository;

    @Mock
    PaymentRepository paymentRepository;

    DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(
                patientRepository,
                doctorRepository,
                appointmentRepository,
                invoiceRepository,
                paymentRepository,
                FIXED_CLOCK);
    }

    @Test
    void getMetrics_usesServerDayAndRealCollectionDefinitions() {
        OffsetDateTime startOfDay = OffsetDateTime.parse("2026-11-08T00:00:00-05:00");
        OffsetDateTime startOfTomorrow = OffsetDateTime.parse("2026-11-09T00:00:00-05:00");
        OffsetDateTime now = OffsetDateTime.parse("2026-11-08T10:30:00-05:00");

        when(patientRepository.count()).thenReturn(42L);
        when(doctorRepository.countActiveDoctors()).thenReturn(5L);
        when(appointmentRepository.countByStatusInAndScheduledAtBetween(
                        eq(List.of(Status.SCHEDULED, Status.CONFIRMED, Status.IN_PROGRESS)),
                        eq(startOfDay),
                        eq(startOfTomorrow)))
                .thenReturn(3L);
        when(appointmentRepository.countUpcomingByStatusIn(eq(List.of(Status.SCHEDULED, Status.CONFIRMED)), eq(now)))
                .thenReturn(7L);
        when(invoiceRepository.countByStatusIn(eq(List.of(InvoiceStatus.PENDING, InvoiceStatus.PARTIAL_PAID))))
                .thenReturn(4L);
        when(invoiceRepository.countByStatusIn(eq(List.of(InvoiceStatus.OVERDUE))))
                .thenReturn(2L);
        when(paymentRepository.sumAllAmounts()).thenReturn(new BigDecimal("1500.50"));
        when(invoiceRepository.sumPendingCollection()).thenReturn(new BigDecimal("800.25"));

        var result = dashboardService.getMetrics();

        assertThat(result.totalPatients()).isEqualTo(42);
        assertThat(result.activeDoctors()).isEqualTo(5);
        assertThat(result.appointmentsToday()).isEqualTo(3);
        assertThat(result.upcomingAppointments()).isEqualTo(7);
        assertThat(result.pendingInvoices()).isEqualTo(4);
        assertThat(result.overdueInvoices()).isEqualTo(2);
        assertThat(result.totalCollected()).isEqualByComparingTo("1500.50");
        assertThat(result.pendingCollection()).isEqualByComparingTo("800.25");

        verify(paymentRepository).sumAllAmounts();
        verify(invoiceRepository).sumPendingCollection();
    }

    @Test
    void getMetrics_whenAggregatesAreNull_returnsZero() {
        when(paymentRepository.sumAllAmounts()).thenReturn(null);
        when(invoiceRepository.sumPendingCollection()).thenReturn(null);

        var result = dashboardService.getMetrics();

        assertThat(result.totalCollected()).isEqualByComparingTo("0.00");
        assertThat(result.pendingCollection()).isEqualByComparingTo("0.00");
    }
}
