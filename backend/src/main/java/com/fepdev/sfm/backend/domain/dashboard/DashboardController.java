package com.fepdev.sfm.backend.domain.dashboard;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fepdev.sfm.backend.domain.dashboard.dto.DashboardMetricsResponse;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/metrics")
    public ResponseEntity<DashboardMetricsResponse> getMetrics() {
        return ResponseEntity.ok(dashboardService.getMetrics());
    }
}
