package com.fepdev.sfm.backend.ai.history.dto;

import jakarta.validation.constraints.NotBlank;

public record PatientHistoryQuery(@NotBlank String question) {}
