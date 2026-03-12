package com.fepdev.sfm.backend.domain.catalog;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ServicesCatalogRepository extends JpaRepository<ServicesCatalog, UUID> {
    List<ServicesCatalog> findByNameContainingIgnoreCase(String name);

    // metodo de filtrado y paginacion
    @Query("SELECT s FROM ServicesCatalog s WHERE " +
           "(:category IS NULL OR s.category = :category) AND " +
           "(:isActive IS NULL OR s.isActive = :isActive)")
    Page<ServicesCatalog> findWithFilters(@Param("category") Category category, 
                                          @Param("isActive") Boolean isActive, 
                                          Pageable pageable);
}
