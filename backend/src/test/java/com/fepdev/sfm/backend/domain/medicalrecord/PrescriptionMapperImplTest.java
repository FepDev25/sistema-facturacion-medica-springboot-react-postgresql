package com.fepdev.sfm.backend.domain.medicalrecord;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.fepdev.sfm.backend.domain.appointment.Appointment;
import com.fepdev.sfm.backend.domain.catalog.MedicationsCatalog;
import com.fepdev.sfm.backend.domain.medicalrecord.dto.PrescriptionCreateRequest;

class PrescriptionMapperImplTest {

    private final PrescriptionMapper mapper = new PrescriptionMapperImpl();

    @Test
    void toEntity_mapsCreateRequest() {
        PrescriptionCreateRequest request = new PrescriptionCreateRequest(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "500mg",
                "cada 8 horas",
                7,
                "tomar con alimentos");

        Prescription entity = mapper.toEntity(request);

        assertThat(entity.getDosage()).isEqualTo("500mg");
        assertThat(entity.getFrequency()).isEqualTo("cada 8 horas");
        assertThat(entity.getDurationDays()).isEqualTo(7);
        assertThat(entity.getInstructions()).isEqualTo("tomar con alimentos");
        assertThat(entity.getAppointment()).isNull();
        assertThat(entity.getMedicalRecord()).isNull();
        assertThat(entity.getMedication()).isNull();
    }

    @Test
    void toResponse_and_toResponseList_mapNestedData() {
        UUID prescriptionId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        UUID medicalRecordId = UUID.randomUUID();
        UUID medicationId = UUID.randomUUID();

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", appointmentId);
        MedicalRecord medicalRecord = new MedicalRecord();
        ReflectionTestUtils.setField(medicalRecord, "id", medicalRecordId);
        MedicationsCatalog medication = new MedicationsCatalog();
        ReflectionTestUtils.setField(medication, "id", medicationId);
        medication.setName("Amoxicilina");

        Prescription entity = new Prescription();
        ReflectionTestUtils.setField(entity, "id", prescriptionId);
        entity.setAppointment(appointment);
        entity.setMedicalRecord(medicalRecord);
        entity.setMedication(medication);
        entity.setDosage("250mg");
        entity.setFrequency("cada 12 horas");
        entity.setDurationDays(5);
        entity.setInstructions("despues de comer");
        entity.setCreatedAt(OffsetDateTime.now());

        var response = mapper.toResponse(entity);
        var list = mapper.toResponseList(List.of(entity));

        assertThat(response.id()).isEqualTo(prescriptionId);
        assertThat(response.appointmentId()).isEqualTo(appointmentId);
        assertThat(response.medicalRecordId()).isEqualTo(medicalRecordId);
        assertThat(response.medicationId()).isEqualTo(medicationId);
        assertThat(response.medicationName()).isEqualTo("Amoxicilina");
        assertThat(list).hasSize(1);
        assertThat(list.getFirst().id()).isEqualTo(prescriptionId);
    }
}
