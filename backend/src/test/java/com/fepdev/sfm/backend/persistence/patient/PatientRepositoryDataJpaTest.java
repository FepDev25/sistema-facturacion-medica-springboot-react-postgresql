package com.fepdev.sfm.backend.persistence.patient;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.jdbc.Sql;

import com.fepdev.sfm.backend.domain.patient.Gender;
import com.fepdev.sfm.backend.domain.patient.Patient;
import com.fepdev.sfm.backend.domain.patient.PatientRepository;
import com.fepdev.sfm.backend.persistence.AbstractPostgresDataJpaTest;
import com.fepdev.sfm.backend.persistence.TestJpaAuditingConfig;

import jakarta.persistence.EntityManager;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestJpaAuditingConfig.class)
@Sql(scripts = "/sql/cleanup_test_data.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class PatientRepositoryDataJpaTest extends AbstractPostgresDataJpaTest {

    @Autowired
    PatientRepository patientRepository;

    @Autowired
    EntityManager entityManager;

    @Test
    void quickSearch_matchesByFirstNameLastNameAndDni() {
        persistPatient("12345670", "Ana", "Lopez");
        persistPatient("12345671", "Bruno", "Perez");

        var byName = patientRepository.quickSearch("ana", PageRequest.of(0, 10));
        var byLastName = patientRepository.quickSearch("perez", PageRequest.of(0, 10));
        var byDni = patientRepository.quickSearch("5670", PageRequest.of(0, 10));

        assertThat(byName).hasSize(1);
        assertThat(byLastName).hasSize(1);
        assertThat(byDni).hasSize(1);
    }

    @Test
    void findWithFilters_filtersByLastNameCaseInsensitive() {
        persistPatient("12345672", "Ana", "Lopez");
        persistPatient("12345673", "Ana", "Torres");

        var page = patientRepository.findWithFilters("LOP", PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().getLastName()).isEqualTo("Lopez");
    }

    private void persistPatient(String dni, String firstName, String lastName) {
        Patient patient = new Patient();
        patient.setDni((dni + UUID.randomUUID().toString().substring(0, 4)).substring(0, 12));
        patient.setFirstName(firstName);
        patient.setLastName(lastName);
        patient.setBirthDate(LocalDate.of(1990, 1, 1));
        patient.setGender(Gender.FEMALE);
        patient.setPhone("5551111");
        entityManager.persist(patient);
        entityManager.flush();
    }
}
