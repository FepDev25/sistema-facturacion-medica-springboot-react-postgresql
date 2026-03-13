package com.fepdev.sfm.backend.domain.catalog;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.catalog.dto.MedicationCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.MedicationUpdateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class MedicationsCatalogService {

    private final MedicationsCatalogRepository repository;
    private final MedicationsCatalogMapper mapper;
    private final CatalogPriceHistoryRepository catalogPriceHistoryRepository;

    public MedicationsCatalogService(MedicationsCatalogRepository repository, MedicationsCatalogMapper mapper, CatalogPriceHistoryRepository catalogPriceHistoryRepository) {
        this.repository = repository;
        this.mapper = mapper;
        this.catalogPriceHistoryRepository = catalogPriceHistoryRepository;
    }

    // crear medicamento
    @Transactional
    public MedicationResponse createMedication(MedicationCreateRequest request){
        MedicationsCatalog entity = mapper.toEntity(request);
        entity.setActive(true);
        MedicationsCatalog savedEntity = repository.save(entity);
        return mapper.toResponse(savedEntity);
    }

    // actualizar medicamento, si cambia el precio, guardar el cambio en CatalogPriceHistory
    @Transactional
    public MedicationResponse updateMedication(UUID id, MedicationUpdateRequest request){
        MedicationsCatalog entity = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Medicamento con ID " + id + " no encontrado"));

        if (request.price() != null && !request.price().equals(entity.getPrice())) {
            CatalogPriceHistory history = new CatalogPriceHistory();
            history.setCatalogType(CatalogType.MEDICATION);
            history.setCatalogId(entity.getId());
            history.setItemCode(entity.getCode());
            history.setItemName(entity.getName());
            history.setOldPrice(entity.getPrice());
            history.setNewPrice(request.price());
            catalogPriceHistoryRepository.save(history);
        }
        
        mapper.updateEntity(request, entity);
        MedicationsCatalog updatedEntity = repository.save(entity);
        return mapper.toResponse(updatedEntity);
    }

    // desactivar medicamento
    @Transactional
    public void deactivateMedication(UUID id) {
        MedicationsCatalog entity = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Medicamento con ID " + id + " no encontrado"));
        entity.setActive(false);
        repository.save(entity);
    }

    // obtener medicamento por id
    @Transactional(readOnly = true)
    public MedicationResponse getMedicationById(UUID id) {
        MedicationsCatalog entity = repository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Medicamento con ID " + id + " no encontrado"));
        return mapper.toResponse(entity);
    }

    // obtener medicamento por código
    @Transactional(readOnly = true)
    public MedicationResponse getMedicationByCode(String code) {
        MedicationsCatalog entity = repository.findByCode(code)
            .orElseThrow(() -> new EntityNotFoundException("Medicamento con código " + code + " no encontrado"));
        return mapper.toResponse(entity);
    }

    // método de búsqueda con filtros y paginación, si el nombre tiene menos de 2 caracteres y no está vacío, lanzar excepción
    @Transactional(readOnly = true)
    public Page<MedicationSummaryResponse> searchMedications(Boolean isActive, Unit unit, Boolean requiresPrescription, String name, Pageable pageable) {
        if (name != null && name.trim().length() < 2 && !name.trim().isEmpty()) {
            throw new BusinessRuleException("El término de búsqueda debe tener al menos 2 caracteres.");
        }
        
        Page<MedicationsCatalog> page = repository.search(isActive, unit, requiresPrescription, name, pageable);
        return page.map(mapper::toSummaryResponse);
    }


}