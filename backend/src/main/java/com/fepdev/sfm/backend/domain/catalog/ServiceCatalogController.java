package com.fepdev.sfm.backend.domain.catalog;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import com.fepdev.sfm.backend.domain.catalog.dto.ServiceCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/catalog/services")
public class ServiceCatalogController {

    private final ServiceCatalogService serviceCatalogService;

    public ServiceCatalogController(ServiceCatalogService serviceCatalogService) {
        this.serviceCatalogService = serviceCatalogService;
    }

    @PostMapping
    public ResponseEntity<ServiceResponse> create(
            @Valid @RequestBody ServiceCreateRequest request,
            UriComponentsBuilder uriBuilder) {

        ServiceResponse response = serviceCatalogService.createServicesCatalog(request);
        URI location = uriBuilder.path("/api/v1/catalog/services/{id}")
                .buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ServiceUpdateRequest request) {

        return ResponseEntity.ok(serviceCatalogService.updateServiceCatalog(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        serviceCatalogService.deactivateServiceCatalog(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceCatalogService.getServiceCatalogById(id));
    }

    @GetMapping
    public ResponseEntity<Page<ServiceSummaryResponse>> list(
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable) {

        return ResponseEntity.ok(serviceCatalogService.getServiceCatalogs(category, active, pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<List<ServiceSummaryResponse>> search(@RequestParam String q) {
        return ResponseEntity.ok(serviceCatalogService.searchServicesByName(q));
    }
}
