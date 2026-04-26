package com.studentplatform.backend.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AssignmentStatus {
    DRAFT,
    PUBLISHED;

    @JsonCreator
    public static AssignmentStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return DRAFT;
        }

        return AssignmentStatus.valueOf(value.trim().toUpperCase());
    }

    @JsonValue
    public String toValue() {
        return name().toLowerCase();
    }
}
