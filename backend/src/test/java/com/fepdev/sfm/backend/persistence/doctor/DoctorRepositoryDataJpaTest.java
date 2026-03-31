package com.fepdev.sfm.backend.persistence.doctor;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.doctor.Doctor;
import com.fepdev.sfm.backend.domain.doctor.DoctorRepository;
import com.fepdev.sfm.backend.persistence.AbstractPostgresDataJpaTest;
import com.fepdev.sfm.backend.persistence.TestJpaAuditingConfig;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestJpaAuditingConfig.class)
@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class DoctorRepositoryDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    DoctorRepository doctorRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    void findWithFilters_filtersByActiveAndSpecialty() {
        persistDoctor("LIC-A", "Cardiology", true);
        persistDoctor("LIC-B", "Dermatology", false);

        var page = doctorRepository.findWithFilters(true, "cardio", PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().isActive()).isTrue();
    }

    private void persistDoctor(String license, String specialty, boolean active) {
        Doctor doctor = new Doctor();
        doctor.setLicenseNumber(license);
        doctor.setFirstName("Doc");
        doctor.setLastName("Torres");
        doctor.setSpecialty(specialty);
        doctor.setPhone("5552222");
        doctor.setEmail(license + "@mail.com");
        doctor.setActive(active);
        entityManager.persist(doctor);
        entityManager.flush();
    }
}
