package com.fepdev.sfm.backend.ai.history.dto;

import java.util.List;

public record PatientHistoryAnswer(String answer, List<HistorySource> sources) {}
