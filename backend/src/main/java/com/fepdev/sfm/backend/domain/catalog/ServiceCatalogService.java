package com.fepdev.sfm.backend.domain.catalog;

import java.util.List;
import java.util.UUID;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fepdev.sfm.backend.domain.catalog.dto.ServiceCreateRequest;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceSummaryResponse;
import com.fepdev.sfm.backend.domain.catalog.dto.ServiceUpdateRequest;
import com.fepdev.sfm.backend.shared.exception.BusinessRuleException;

import jakarta.persistence.EntityNotFoundException;

@Service
public class ServiceCatalogService {
    
    private final ServicesCatalogRepository servicesCatalogRepository;
    private final ServicesCatalogMapper servicesCatalogMapper;
    private final CatalogPriceHistoryRepository catalogPriceHistoryRepository;

    public ServiceCatalogService(ServicesCatalogRepository servicesCatalogRepository, ServicesCatalogMapper servicesCatalogMapper, CatalogPriceHistoryRepository catalogPriceHistoryRepository) {
        this.servicesCatalogRepository = servicesCatalogRepository;
        this.servicesCatalogMapper = servicesCatalogMapper;
        this.catalogPriceHistoryRepository = catalogPriceHistoryRepository;
    }

    @Caching(evict = {
        @CacheEvict(value = "services", allEntries = true),
        @CacheEvict(value = "services-list", allEntries = true)
    })
    @Transactional
    public ServiceResponse createServicesCatalog(ServiceCreateRequest request){
        // create request a entidad, setear isActive=true
        ServicesCatalog entity = servicesCatalogMapper.toEntity(request);
        entity.setIsActive(true);
        // guardar entidad
        ServicesCatalog savedEntity = servicesCatalogRepository.save(entity);
        // convertir a response y retornar
        return servicesCatalogMapper.toResponse(savedEntity);
    }

    @Caching(evict = {
        @CacheEvict(value = "services", allEntries = true),
        @CacheEvict(value = "services-list", allEntries = true)
    })
    @Transactional
    public ServiceResponse updateServiceCatalog(UUID id, ServiceUpdateRequest request){

        // buscar la entidad por el id
        ServicesCatalog entity = servicesCatalogRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Servicio con ID " + id + " no encontrado"));
        
        // si cambia el precio, guardar el cambio en CatalogPriceHistory
        if (request.price() != null && !request.price().equals(entity.getPrice())) {
            CatalogPriceHistory history = new CatalogPriceHistory();
            history.setCatalogType(CatalogType.SERVICE);
            history.setCatalogId(entity.getId());
            history.setItemCode(entity.getCode());
            history.setItemName(entity.getName());
            history.setOldPrice(entity.getPrice());
            history.setNewPrice(request.price());
            catalogPriceHistoryRepository.save(history);
        }

        // actualizar la entidad
        servicesCatalogMapper.updateEntity(request, entity);

        // guardar y retornar
        ServicesCatalog updatedEntity = servicesCatalogRepository.save(entity);
        return servicesCatalogMapper.toResponse(updatedEntity);

    }

    // metodo para desactivar un servicio
    @Caching(evict = {
        @CacheEvict(value = "services", allEntries = true),
        @CacheEvict(value = "services-list", allEntries = true)
    })
    @Transactional
    public void deactivateServiceCatalog(UUID id) {
        ServicesCatalog entity = servicesCatalogRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Servicio con ID " + id + " no encontrado"));
        entity.setIsActive(false);
        servicesCatalogRepository.save(entity);
    }

    // metodo para obtener un servicio por id, si no existe lanzar excepcion
    @Cacheable(value = "services", key = "#id")
    @Transactional(readOnly = true)
    public ServiceResponse getServiceCatalogById(UUID id) {
        ServicesCatalog entity = servicesCatalogRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Servicio con ID " + id + " no encontrado"));
        return servicesCatalogMapper.toResponse(entity);
    }

    // metodo para buscar servicios por nombre, si el nombre es menor a 2 caracteres lanzar excepcion
    @Transactional(readOnly = true)
    public List<ServiceSummaryResponse> searchServicesByName(String name) {
        if (name == null || name.trim().length() < 2) {
            throw new BusinessRuleException("El término de búsqueda debe tener al menos 2 caracteres.");
        }
        List<ServicesCatalog> entities = servicesCatalogRepository.findByNameContainingIgnoreCase(name.trim());
        return servicesCatalogMapper.toSummaryResponseList(entities);
    }

    // metodo para obtener la lista de servicios con filtros de categoria y estado, paginada
    @Transactional(readOnly = true)
    public Page<ServiceSummaryResponse> getServiceCatalogs(Category category, Boolean isActive, Pageable pageable) {
        // obtener la pagina de entidades de la base de datos
        Page<ServicesCatalog> page = servicesCatalogRepository.findWithFilters(category, isActive, pageable);
        // tranformar la pagina de entidades a dtos
        return page.map(servicesCatalogMapper::toSummaryResponse);
    }

}
