package com.fepdev.sfm.backend.ai.history.dto;

import java.util.UUID;

public record HistorySource(UUID medicalRecordId, String recordDate) {}
