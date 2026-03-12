package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record MedicalRecordResponse(
    UUID id,
    UUID patientId,
    String patientFirstName,
    String patientLastName,
    UUID appointmentId,
    Map<String, Object> vitalSigns,
    String physicalExam,
    String clinicalNotes,
    OffsetDateTime recordDate,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
