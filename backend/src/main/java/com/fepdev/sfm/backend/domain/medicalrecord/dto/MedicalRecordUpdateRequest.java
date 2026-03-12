package com.fepdev.sfm.backend.domain.medicalrecord.dto;

import java.util.Map;

public record MedicalRecordUpdateRequest(

    // JSONB: estructura libre con signos vitales
    Map<String, Object> vitalSigns,

    String physicalExam,

    String clinicalNotes
) {}
