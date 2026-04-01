package com.fepdev.sfm.backend.domain.appointment;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;

import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentStatusUpdateRequest;
import com.fepdev.sfm.backend.domain.appointment.dto.AppointmentUpdateRequest;

class AppointmentStatusAndDtoTest {

    private final StatusConverter converter = new StatusConverter();

    @Test
    void status_jsonAndConverter_coverBranches() {
        assertThat(Status.NO_SHOW.toValue()).isEqualTo("no_show");
        assertThat(Status.fromJson("confirmed")).isEqualTo(Status.CONFIRMED);
        assertThat(Status.fromJson(null)).isNull();

        assertThat(converter.convertToDatabaseColumn(Status.IN_PROGRESS)).isEqualTo("in_progress");
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute("cancelled")).isEqualTo(Status.CANCELLED);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void appointmentUpdateRequest_recordAccessors_work() {
        OffsetDateTime at = OffsetDateTime.now().plusDays(1);
        AppointmentUpdateRequest request = new AppointmentUpdateRequest(at, 40, "Control", "Notas");

        assertThat(request.scheduledAt()).isEqualTo(at);
        assertThat(request.durationMinutes()).isEqualTo(40);
        assertThat(request.chiefComplaint()).isEqualTo("Control");
        assertThat(request.notes()).isEqualTo("Notas");
    }

    @Test
    void appointmentStatusUpdateRequest_recordAccessors_work() {
        AppointmentStatusUpdateRequest request = new AppointmentStatusUpdateRequest(Status.COMPLETED);
        assertThat(request.status()).isEqualTo(Status.COMPLETED);
    }
}
