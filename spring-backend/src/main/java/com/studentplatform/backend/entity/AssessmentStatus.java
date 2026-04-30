package com.studentplatform.backend.entity;

public enum AssessmentStatus {
    UPCOMING,
    COMPLETED,
    GRADING;

    public static AssessmentStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return UPCOMING;
        }

        return switch (value.trim().toUpperCase()) {
            case "UPCOMING" -> UPCOMING;
            case "COMPLETED" -> COMPLETED;
            case "GRADING" -> GRADING;
            default -> UPCOMING;
        };
    }
}
