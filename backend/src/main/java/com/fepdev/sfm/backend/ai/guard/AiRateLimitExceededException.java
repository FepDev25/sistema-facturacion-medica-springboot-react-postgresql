package com.fepdev.sfm.backend.ai.guard;

public class AiRateLimitExceededException extends RuntimeException {

    public AiRateLimitExceededException(String message) {
        super(message);
    }
}
