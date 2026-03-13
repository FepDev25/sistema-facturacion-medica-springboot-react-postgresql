package com.fepdev.sfm.backend.domain.catalog;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface MedicationsCatalogRepository extends JpaRepository<MedicationsCatalog, UUID> {
    Optional<MedicationsCatalog> findByCode(String code);
    List<MedicationsCatalog> findByNameContainingIgnoreCase(String name);

     @Query("""
        SELECT m
        FROM MedicationsCatalog m
        WHERE (:isActive IS NULL OR m.isActive = :isActive)
          AND (:unit IS NULL OR m.unit = :unit)
          AND (:requiresPrescription IS NULL OR m.requiresPrescription = :requiresPrescription)
          AND (:name IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%')))""")
    Page<MedicationsCatalog> search(Boolean isActive,
                                    Unit unit,
                                    Boolean requiresPrescription,
                                    String name,
                                    Pageable pageable);

}
