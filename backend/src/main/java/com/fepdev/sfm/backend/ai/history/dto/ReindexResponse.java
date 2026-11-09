package com.fepdev.sfm.backend.ai.history.dto;

import java.util.UUID;

public record ReindexResponse(UUID patientId, int recordsIndexed) {}
