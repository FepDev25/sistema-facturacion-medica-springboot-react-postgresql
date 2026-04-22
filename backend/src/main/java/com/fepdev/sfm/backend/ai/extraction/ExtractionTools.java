package com.fepdev.sfm.backend.ai.extraction;

import java.util.ArrayList;
import java.util.List;

import org.springframework.ai.tool.annotation.Tool;

import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedDiagnosis;
import com.fepdev.sfm.backend.ai.extraction.dto.ExtractedProcedure;

public class ExtractionTools {

    record RawPrescription(
        String medicationName,
        String dosage,
        String frequency,
        Integer durationDays,
        String instructions
    ) {}

    private final List<ExtractedDiagnosis> diagnoses = new ArrayList<>();
    private final List<RawPrescription> rawPrescriptions = new ArrayList<>();
    private final List<ExtractedProcedure> procedures = new ArrayList<>();

    @Tool(description = "Registra un diagnóstico extraído de las notas clínicas. Llama esta función una vez por cada diagnóstico encontrado.")
    public void addDiagnosis(String icd10Code, String description, String severity) {
        diagnoses.add(new ExtractedDiagnosis(icd10Code, description, severity));
    }

    @Tool(description = "Registra una prescripción de medicamento. El nombre del medicamento debe coincidir exactamente con el catálogo provisto. Llama esta función una vez por cada medicamento prescrito.")
    public void addPrescription(String medicationName, String dosage, String frequency, Integer durationDays, String instructions) {
        rawPrescriptions.add(new RawPrescription(medicationName, dosage, frequency, durationDays, instructions));
    }

    @Tool(description = "Registra un procedimiento médico realizado. Llama esta función una vez por cada procedimiento encontrado.")
    public void addProcedure(String procedureCode, String description, String notes) {
        procedures.add(new ExtractedProcedure(procedureCode, description, notes));
    }

    public List<ExtractedDiagnosis> getDiagnoses() {
        return List.copyOf(diagnoses);
    }

    public List<RawPrescription> getRawPrescriptions() {
        return List.copyOf(rawPrescriptions);
    }

    public List<ExtractedProcedure> getProcedures() {
        return List.copyOf(procedures);
    }
}
