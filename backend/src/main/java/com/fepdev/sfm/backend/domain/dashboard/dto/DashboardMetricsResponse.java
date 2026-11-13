package com.fepdev.sfm.backend.domain.dashboard.dto;

import java.math.BigDecimal;

public record DashboardMetricsResponse(
        long totalPatients,
        long activeDoctors,
        long appointmentsToday,
        long upcomingAppointments,
        long pendingInvoices,
        long overdueInvoices,
        BigDecimal totalCollected,
        BigDecimal pendingCollection) {}
